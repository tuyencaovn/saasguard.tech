import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { isoBase64URL, isoUint8Array } from '@simplewebauthn/server/helpers';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { PasskeyCredential } from './entities/passkey-credential.entity';
import { WebAuthnChallengeStore } from './webauthn-challenge.store';
import {
  WebAuthnLoginVerifyDto,
  WebAuthnRegisterVerifyDto,
} from './dto/webauthn.dto';

@Injectable()
export class WebAuthnService {
  constructor(
    @InjectRepository(PasskeyCredential)
    private readonly credentialRepo: Repository<PasskeyCredential>,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly challengeStore: WebAuthnChallengeStore,
  ) {}

  private get frontendUrl(): string {
    return (
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3006'
    ).replace(/\/$/, '');
  }

  private get rpID(): string {
    return new URL(this.frontendUrl).hostname;
  }

  private get rpName(): string {
    return (
      this.configService.get<string>('WEBAUTHN_RP_NAME') ||
      this.configService.get<string>('APP_NAME') ||
      'Server Monitor'
    );
  }

  async getRegistrationOptions(user: { id: string; email: string }) {
    const existing = await this.credentialRepo.find({
      where: { userId: user.id },
    });

    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpID,
      userName: user.email,
      userID: isoUint8Array.fromUTF8String(user.id),
      excludeCredentials: existing.map((c) => ({
        id: c.credentialId,
        transports: c.transports ?? undefined,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    this.challengeStore.set(`reg:${user.id}`, options.challenge);
    return options;
  }

  async verifyRegistration(
    user: { id: string },
    dto: WebAuthnRegisterVerifyDto,
  ) {
    const expectedChallenge = this.challengeStore.consume(`reg:${user.id}`);
    if (!expectedChallenge) {
      throw new BadRequestException(
        'Registration challenge expired, please try again',
      );
    }

    const verification = await verifyRegistrationResponse({
      response: dto.response,
      expectedChallenge,
      expectedOrigin: this.frontendUrl,
      expectedRPID: this.rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestException('Passkey registration failed');
    }

    const { credential, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo;

    const duplicate = await this.credentialRepo.findOne({
      where: { credentialId: credential.id },
    });
    if (duplicate) {
      throw new ConflictException('This passkey is already registered');
    }

    try {
      const saved = await this.credentialRepo.save(
        this.credentialRepo.create({
          userId: user.id,
          credentialId: credential.id,
          publicKey: isoBase64URL.fromBuffer(credential.publicKey),
          counter: credential.counter,
          transports: credential.transports ?? null,
          backedUp: credentialBackedUp,
          deviceType: credentialDeviceType,
          name: dto.name,
        }),
      );
      return { verified: true, id: saved.id, name: saved.name };
    } catch (err) {
      // Unique-violation on credential_id if two requests race the pre-check
      if ((err as { code?: string }).code === '23505') {
        throw new ConflictException('This passkey is already registered');
      }
      throw err;
    }
  }

  async getLoginOptions(email: string) {
    const user = await this.usersService.findByEmail(email);
    const credentials = user
      ? await this.credentialRepo.find({ where: { userId: user.id } })
      : [];

    if (!user || !user.isActive || credentials.length === 0) {
      throw new NotFoundException('No passkey found for this account');
    }

    const options = await generateAuthenticationOptions({
      rpID: this.rpID,
      allowCredentials: credentials.map((c) => ({
        id: c.credentialId,
        transports: c.transports ?? undefined,
      })),
      userVerification: 'preferred',
    });

    this.challengeStore.set(`auth:${email.toLowerCase()}`, options.challenge);
    return options;
  }

  async verifyLogin(dto: WebAuthnLoginVerifyDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Passkey authentication failed');
    }

    const credential = await this.credentialRepo.findOne({
      where: { credentialId: dto.response.id, userId: user.id },
    });
    if (!credential) {
      throw new UnauthorizedException('Passkey authentication failed');
    }

    const expectedChallenge = this.challengeStore.consume(
      `auth:${dto.email.toLowerCase()}`,
    );
    if (!expectedChallenge) {
      throw new BadRequestException(
        'Authentication challenge expired, please try again',
      );
    }

    const verification = await verifyAuthenticationResponse({
      response: dto.response,
      expectedChallenge,
      expectedOrigin: this.frontendUrl,
      expectedRPID: this.rpID,
      credential: {
        id: credential.credentialId,
        publicKey: isoBase64URL.toBuffer(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports ?? undefined,
      },
    });

    if (!verification.verified) {
      throw new UnauthorizedException('Passkey authentication failed');
    }

    credential.counter = verification.authenticationInfo.newCounter;
    credential.lastUsedAt = new Date();
    await this.credentialRepo.save(credential);

    return this.authService.buildAuthResult(user);
  }

  async listCredentials(userId: string) {
    const credentials = await this.credentialRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return credentials.map((c) => ({
      id: c.id,
      name: c.name,
      createdAt: c.createdAt,
      lastUsedAt: c.lastUsedAt,
    }));
  }

  async deleteCredential(userId: string, id: string) {
    const result = await this.credentialRepo.delete({ id, userId });
    if (!result.affected) {
      throw new NotFoundException('Passkey not found');
    }
    return { message: 'Passkey removed' };
  }
}
