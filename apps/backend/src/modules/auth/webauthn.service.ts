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
        residentKey: 'required',
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

  async getLoginOptions() {
    // Usernameless / discoverable: no allowCredentials, so the authenticator
    // offers any resident passkey it holds for this relying party.
    const options = await generateAuthenticationOptions({
      rpID: this.rpID,
      userVerification: 'preferred',
    });

    this.challengeStore.set(`auth:${options.challenge}`, options.challenge);
    return options;
  }

  async verifyLogin(dto: WebAuthnLoginVerifyDto) {
    // The authenticator tells us which credential signed; resolve its owner.
    const credential = await this.credentialRepo.findOne({
      where: { credentialId: dto.response.id },
    });
    if (!credential) {
      throw new UnauthorizedException('Passkey authentication failed');
    }

    const user = await this.usersService
      .findOne(credential.userId)
      .catch(() => null);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Passkey authentication failed');
    }

    const verification = await verifyAuthenticationResponse({
      response: dto.response,
      // One-time challenge: the store only holds challenges we issued, and
      // consume() removes it, so a captured response cannot be replayed.
      expectedChallenge: (challenge) =>
        this.challengeStore.consume(`auth:${challenge}`) !== null,
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
