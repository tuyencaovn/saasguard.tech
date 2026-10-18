import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { WebAuthnService } from './webauthn.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { PasskeyCredential } from './entities/passkey-credential.entity';
import { WebAuthnChallengeStore } from './webauthn-challenge.store';

jest.mock('@simplewebauthn/server');
jest.mock('@simplewebauthn/server/helpers', () => ({
  isoBase64URL: {
    fromBuffer: () => 'cHVibGljLWtleQ',
    toBuffer: () => new Uint8Array([1, 2, 3]),
  },
  isoUint8Array: {
    fromUTF8String: () => new Uint8Array([4, 5, 6]),
  },
}));

const mockGenReg = generateRegistrationOptions as jest.Mock;
const mockVerifyReg = verifyRegistrationResponse as jest.Mock;
const mockGenAuth = generateAuthenticationOptions as jest.Mock;
const mockVerifyAuth = verifyAuthenticationResponse as jest.Mock;

describe('WebAuthnService', () => {
  let service: WebAuthnService;
  let repo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let usersService: { findByEmail: jest.Mock };
  let authService: { buildAuthResult: jest.Mock };
  let challengeStore: { set: jest.Mock; consume: jest.Mock };

  const activeUser = {
    id: 'user-1',
    email: 'admin@example.com',
    role: 'admin',
    isActive: true,
  };

  beforeEach(async () => {
    repo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((v) => v),
      save: jest.fn((v) => Promise.resolve({ id: 'cred-1', ...v })),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    usersService = { findByEmail: jest.fn() };
    authService = { buildAuthResult: jest.fn() };
    challengeStore = { set: jest.fn(), consume: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebAuthnService,
        { provide: getRepositoryToken(PasskeyCredential), useValue: repo },
        { provide: UsersService, useValue: usersService },
        { provide: AuthService, useValue: authService },
        { provide: WebAuthnChallengeStore, useValue: challengeStore },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'FRONTEND_URL' ? 'https://monitor.example.com' : undefined,
          },
        },
      ],
    }).compile();

    service = module.get(WebAuthnService);
    jest.clearAllMocks();
  });

  describe('verifyRegistration', () => {
    it('saves a credential when verification succeeds', async () => {
      challengeStore.consume.mockReturnValue('challenge');
      mockVerifyReg.mockResolvedValue({
        verified: true,
        registrationInfo: {
          credential: {
            id: 'new-cred',
            publicKey: new Uint8Array([9]),
            counter: 0,
            transports: ['internal'],
          },
          credentialDeviceType: 'multiDevice',
          credentialBackedUp: true,
        },
      });

      const result = await service.verifyRegistration(
        { id: 'user-1' },
        { response: {} as never, name: 'My Laptop' },
      );

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          credentialId: 'new-cred',
          name: 'My Laptop',
          backedUp: true,
          deviceType: 'multiDevice',
        }),
      );
      expect(result).toEqual({ verified: true, id: 'cred-1', name: 'My Laptop' });
    });

    it('throws when the challenge is missing/expired', async () => {
      challengeStore.consume.mockReturnValue(null);
      await expect(
        service.verifyRegistration(
          { id: 'user-1' },
          { response: {} as never, name: 'x' },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockVerifyReg).not.toHaveBeenCalled();
    });
  });

  describe('getLoginOptions', () => {
    it('throws NotFound when the user has no passkeys', async () => {
      usersService.findByEmail.mockResolvedValue(activeUser);
      repo.find.mockResolvedValue([]);
      await expect(
        service.getLoginOptions('admin@example.com'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFound for unknown/inactive account (no enumeration)', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      await expect(
        service.getLoginOptions('ghost@example.com'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns options and stores the challenge', async () => {
      usersService.findByEmail.mockResolvedValue(activeUser);
      repo.find.mockResolvedValue([
        { credentialId: 'c1', transports: ['internal'] },
      ]);
      mockGenAuth.mockResolvedValue({ challenge: 'auth-challenge' });

      const options = await service.getLoginOptions('Admin@Example.com');

      expect(options).toEqual({ challenge: 'auth-challenge' });
      expect(challengeStore.set).toHaveBeenCalledWith(
        'auth:admin@example.com',
        'auth-challenge',
      );
    });
  });

  describe('verifyLogin', () => {
    const dto = {
      email: 'admin@example.com',
      response: { id: 'c1' } as never,
    };

    it('updates counter + lastUsedAt and returns an auth result', async () => {
      usersService.findByEmail.mockResolvedValue(activeUser);
      repo.findOne.mockResolvedValue({
        credentialId: 'c1',
        userId: 'user-1',
        publicKey: 'pk',
        counter: 1,
        transports: ['internal'],
      });
      challengeStore.consume.mockReturnValue('auth-challenge');
      mockVerifyAuth.mockResolvedValue({
        verified: true,
        authenticationInfo: { newCounter: 2 },
      });
      authService.buildAuthResult.mockReturnValue({
        accessToken: 'jwt',
        user: activeUser,
      });

      const result = await service.verifyLogin(dto);

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ counter: 2, lastUsedAt: expect.any(Date) }),
      );
      expect(authService.buildAuthResult).toHaveBeenCalledWith(activeUser);
      expect(result).toEqual({ accessToken: 'jwt', user: activeUser });
    });

    it('rejects when the challenge is missing', async () => {
      usersService.findByEmail.mockResolvedValue(activeUser);
      repo.findOne.mockResolvedValue({ credentialId: 'c1', userId: 'user-1' });
      challengeStore.consume.mockReturnValue(null);
      await expect(service.verifyLogin(dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects when no matching credential belongs to the user', async () => {
      usersService.findByEmail.mockResolvedValue(activeUser);
      repo.findOne.mockResolvedValue(null);
      await expect(service.verifyLogin(dto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('deleteCredential', () => {
    it("throws NotFound when deleting a credential that isn't the user's", async () => {
      repo.delete.mockResolvedValue({ affected: 0 });
      await expect(
        service.deleteCredential('user-1', 'other-cred'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('scopes deletion to the owning user', async () => {
      repo.delete.mockResolvedValue({ affected: 1 });
      await service.deleteCredential('user-1', 'cred-1');
      expect(repo.delete).toHaveBeenCalledWith({ id: 'cred-1', userId: 'user-1' });
    });
  });
});
