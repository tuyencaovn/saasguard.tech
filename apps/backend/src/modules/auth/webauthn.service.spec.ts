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
  let usersService: { findByEmail: jest.Mock; findOne: jest.Mock };
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
    usersService = { findByEmail: jest.fn(), findOne: jest.fn() };
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
    it('returns usernameless options (no allowCredentials) and stores the challenge', async () => {
      mockGenAuth.mockResolvedValue({ challenge: 'auth-challenge' });

      const options = await service.getLoginOptions();

      expect(options).toEqual({ challenge: 'auth-challenge' });
      expect(mockGenAuth).toHaveBeenCalledWith(
        expect.not.objectContaining({ allowCredentials: expect.anything() }),
      );
      expect(challengeStore.set).toHaveBeenCalledWith(
        'auth:auth-challenge',
        'auth-challenge',
      );
    });
  });

  describe('verifyLogin', () => {
    const dto = { response: { id: 'c1' } as never };

    it('resolves the owner from the credential, updates counter + lastUsedAt', async () => {
      repo.findOne.mockResolvedValue({
        credentialId: 'c1',
        userId: 'user-1',
        publicKey: 'pk',
        counter: 1,
        transports: ['internal'],
      });
      usersService.findOne.mockResolvedValue(activeUser);
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

    it('consumes the challenge one-time via expectedChallenge callback', async () => {
      repo.findOne.mockResolvedValue({
        credentialId: 'c1',
        userId: 'user-1',
        publicKey: 'pk',
        counter: 0,
        transports: null,
      });
      usersService.findOne.mockResolvedValue(activeUser);
      challengeStore.consume.mockReturnValue('the-challenge');
      mockVerifyAuth.mockResolvedValue({
        verified: true,
        authenticationInfo: { newCounter: 1 },
      });
      authService.buildAuthResult.mockReturnValue({ accessToken: 'x', user: activeUser });

      await service.verifyLogin(dto);

      const opts = mockVerifyAuth.mock.calls[0][0];
      expect(opts.expectedChallenge('the-challenge')).toBe(true);
      expect(challengeStore.consume).toHaveBeenCalledWith('auth:the-challenge');
    });

    it('rejects when no credential matches the authenticator', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.verifyLogin(dto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects when the credential owner is missing/inactive', async () => {
      repo.findOne.mockResolvedValue({ credentialId: 'c1', userId: 'user-1' });
      usersService.findOne.mockRejectedValue(new NotFoundException());
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
