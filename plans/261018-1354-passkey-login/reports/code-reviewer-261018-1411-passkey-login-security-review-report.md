# Passkey (WebAuthn) Login — Security Review

Branch `passkey-login` vs `master`. Core WebAuthn files are untracked (not yet committed); reviewed from working tree.

## Verification run
- `npx jest webauthn` — 10/10 pass
- backend `npm run build` (nest/tsc strict) — clean
- frontend `npm run build` (Next 14) — clean, `/login` prerendered static (SSR-safe)

## Assessment
Flow is correct and the trust boundaries hold. Challenge is consumed exactly once, cross-user credential use is prevented (credential lookup scoped by `userId`, delete scoped by `{id, userId}`), guard coverage matches intent, public-key base64url round-trip is right, and the `login()` refactor into `buildAuthResult` is behavior-preserving. No Critical or High issues. A few Low items below.

## Critical
None.

## High
None.

## Medium
None blocking. See Low.

## Low
1. `apps/frontend/src/app/login/page.tsx:435` — `browserSupportsWebAuthn()` called in render body without the `typeof window` guard used in settings (`settings/page.tsx:72`). Library is SSR-safe (`globalThis?.PublicKeyCredential`), so no crash, but server renders button-absent / client renders button-present = minor hydration mismatch. Fix: gate with a mounted/`typeof window` check like settings, or read once in `useEffect`.
2. `apps/backend/src/modules/auth/webauthn.service.ts:105-110` — duplicate credential check is a non-transactional read-then-write; two concurrent register/verify calls for the same brand-new credential could both pass the `findOne` before either `save`. The DB `unique` constraint on `credential_id` is the real guard and will throw on the loser, surfacing as a 500 rather than the friendly 409. Low likelihood (same authenticator, same user, concurrent). Fix: catch the unique-violation and map to `ConflictException`, or rely on the unique index and drop the pre-check.
3. `apps/backend/src/modules/auth/webauthn.service.ts:144,71` — `userVerification: 'preferred'` (and `residentKey: 'preferred'`) means UV is not enforced; a passkey can satisfy auth with presence only. This is consistent with the email-first design and acceptable for an admin-managed self-hosted product, but worth a conscious note — `'required'` would harden it.

## Confirmed correct (checked, not issues)
- Challenge lifecycle: `set` on options, `consume` (get+delete) before crypto verify; single-use, 60s TTL; expiry checked after delete so an expired entry still gets evicted.
- Cross-user isolation: `verifyLogin` credential lookup is `{ credentialId: dto.response.id, userId: user.id }`; `deleteCredential` is `delete({ id, userId })` with `affected` check → 404 on foreign id. Spec covers both.
- `verification.verified` checks are present and fail-closed on register and login; no bypass path.
- Guard coverage: `JwtAuthGuard` is a global `APP_GUARD` (app.module.ts:76). register/options, register/verify, credentials GET, credentials DELETE have no `@Public` → authenticated. login/options + login/verify are `@Public` + `@Throttle(5/15min)`. Matches requirement.
- `buildAuthResult` refactor: `login()` still does findByEmail → isActive → validatePassword → buildAuthResult; identical token/payload/user shape. No change to `/auth/login`, `/auth/me`, `/auth/logout`, change-password, reset. Cookie `COOKIE_OPTIONS` reused verbatim for passkey login.
- Public-key round-trip: v14 `WebAuthnCredential.id` is base64url string (stored directly), `publicKey` is `Uint8Array` → `isoBase64URL.fromBuffer` on register, `isoBase64URL.toBuffer` on verify. Correct.
- `rpID = new URL(frontendUrl).hostname` (port stripped — correct for RP ID); `expectedOrigin = frontendUrl` (full, with port — correct). Trailing slash stripped.
- Counter + `lastUsedAt` updated from `authenticationInfo.newCounter` after successful verify.
- Entity: bigint counter transformer (`parseInt` from string) correct; `onDelete: 'CASCADE'` on user FK; `credential_id` unique. `autoLoadEntities+synchronize` will create the table.
- Enumeration: login/options 404 "No passkey found" is the accepted, documented, rate-limited trade-off. `verifyLogin` returns generic `UnauthorizedException('Passkey authentication failed')` — no leak there.
- No secret/PII leak: `.env.example` adds only `WEBAUTHN_RP_NAME` placeholder; full user entity passed to `buildAuthResult` but only id/email/role are projected out (password never serialized).
- Frontend circular import (auth-context ↔ lib/webauthn) is type-only (`import type { User }`) → erased at compile, no runtime cycle.
- Cancel handling: SimpleWebAuthn rethrows `WebAuthnError` with `name = cause.name` = `'NotAllowedError'`; `err.name === 'NotAllowedError'` checks on login:69 and settings:104 work.
- React state in settings: optimistic delete with `fetchPasskeys()` rollback on error; add-modal resets name/error on open; no stale-state bug found.
- DTO validation: global `ValidationPipe` whitelist + forbidNonWhitelisted; email `@IsEmail`, name `@IsString/1-50`, response `@IsObject` (SimpleWebAuthn verifies its internal structure cryptographically, so shallow `@IsObject` is acceptable).

## Unresolved questions
- Intentional that core WebAuthn files remain untracked? Confirm they get committed before merge (diff-based CI/review won't see them otherwise).
- UV `'preferred'` vs `'required'` (Low #3): confirm the presence-only trade-off is the intended posture.
