# Phase 01 — Backend WebAuthn

## Deps
- `cd apps/backend && npm i @simplewebauthn/server`
- Confirm installed major version; adapt field names below to it.

## Create
### entities/passkey-credential.entity.ts
`@Entity('passkey_credentials')`:
- id uuid pk
- user ManyToOne(User, onDelete CASCADE) + userId column (indexed)
- credentialId: string, unique, indexed (base64url)
- publicKey: string (base64url of Uint8Array)
- counter: 'bigint' stored as string (typeorm bigint → string)
- transports: 'simple-json' nullable (string[])
- backedUp: boolean default false
- deviceType: string nullable
- name: string
- createdAt @CreateDateColumn
- lastUsedAt: timestamp nullable

### webauthn-challenge.store.ts (@Injectable)
In-memory Map<string,{challenge:string;expiresAt:number}>, TTL 60s.
Methods: `set(key, challenge)`, `consume(key): string|null` (delete on read, null if expired/missing).
Lazy sweep expired on access. Keys: `reg:<userId>`, `auth:<email.toLowerCase()>`.

### dto/
- webauthn-login-options.dto.ts: `{ email: string }` (IsEmail)
- webauthn-login-verify.dto.ts: `{ email: string; response: <AuthenticationResponseJSON> }` (IsEmail + IsObject)
- webauthn-register-verify.dto.ts: `{ response: <RegistrationResponseJSON>; name: string }` (IsObject + IsString len 1..50)

### webauthn.service.ts (@Injectable)
Inject: `@InjectRepository(PasskeyCredential)`, UsersService, AuthService, ConfigService, WebAuthnChallengeStore.
Config helpers:
- rpID = new URL(FRONTEND_URL).hostname
- origin = FRONTEND_URL without trailing slash
- rpName = WEBAUTHN_RP_NAME || APP_NAME || 'Server Monitor'
Methods:
- `getRegistrationOptions(user)`: generateRegistrationOptions({rpName,rpID,userName:email,userID:Buffer/isoUint8Array of user.id, excludeCredentials from user creds (id+transports), authenticatorSelection:{residentKey:'preferred',userVerification:'preferred'}}); store challenge `reg:<userId>`; return options.
- `verifyRegistration(user,dto)`: challenge=consume(`reg:<userId>`); verifyRegistrationResponse({response,expectedChallenge,expectedOrigin:origin,expectedRPID:rpID}); on verified save PasskeyCredential (credentialId, publicKey base64url, counter, transports from response, backedUp, deviceType, name). Reject duplicate credentialId. Return {verified:true,id,name}.
- `getLoginOptions(email)`: user=findByEmail; if !user||!isActive||no creds → throw NotFound 'No passkey found for this account'; generateAuthenticationOptions({rpID,allowCredentials from creds,userVerification:'preferred'}); store `auth:<email>`; return options.
- `verifyLogin(dto)`: user=findByEmail (guard active); cred=find by credentialId===response.id & userId; challenge=consume(`auth:<email>`); verifyAuthenticationResponse({response,expectedChallenge,expectedOrigin,expectedRPID,credential:{id,publicKey,counter,transports}}); on verified update counter+lastUsedAt; return authService.buildAuthResult(user).
- `listCredentials(userId)`: return [{id,name,createdAt,lastUsedAt}].
- `deleteCredential(userId,id)`: delete where id & userId; throw NotFound if none affected.

## Modify
### auth.service.ts
Add `buildAuthResult(user): {accessToken,user}` — extract existing payload+sign logic from `login()`; refactor `login()` to call it. (DRY; no behavior change.)

### auth.controller.ts
Add endpoints (reuse COOKIE_OPTIONS, @Public where noted):
- `@Get('webauthn/register/options')` (auth) → service.getRegistrationOptions(user)
- `@Post('webauthn/register/verify')` (auth) → service.verifyRegistration(user,dto)
- `@Public() @Post('webauthn/login/options')` @Throttle 5/15m → service.getLoginOptions(dto.email)
- `@Public() @Post('webauthn/login/verify')` @Throttle 5/15m → {accessToken,user}=service.verifyLogin(dto); res.cookie('access_token',accessToken,COOKIE_OPTIONS); return {user}
- `@Get('webauthn/credentials')` (auth) → service.listCredentials(user.id)
- `@Delete('webauthn/credentials/:id')` (auth) → service.deleteCredential(user.id, id)
Use `@CurrentUser()` for auth endpoints.

### auth.module.ts
- TypeOrmModule.forFeature add PasskeyCredential.
- providers add WebAuthnService, WebAuthnChallengeStore.

## Validate
`cd apps/backend && npm run build` clean. App boots, `passkey_credentials` table auto-created.
