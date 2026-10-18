# Passkey (WebAuthn) Login

Status: IMPLEMENTED (reviewed, builds + tests green; pending manual device verification + commit)

## Goal
Add passkey login (additive to existing email+password). Email-first authentication flow.
Users register/list/delete passkeys from Settings.

## Decisions (user-confirmed)
- Login flow: **email-first** (type email → authenticate with passkey).
- Management: **register + list + delete** in Settings.
- Coexistence: **additive** — password login untouched.
- Library: `@simplewebauthn/server` + `@simplewebauthn/browser`.
- Challenge store: in-memory TTL 60s (backend runs single-instance: fork, instances:1).

## Expected output
- Working "Sign in with passkey" on `/login` (email-first).
- "Passkeys" management card on `/settings` (add named passkey, list, delete).
- New backend endpoints under `/auth/webauthn/*`.
- New table `passkey_credentials` (auto-synced).

## Acceptance criteria
1. Logged-in user adds a passkey in Settings → appears in list with its name.
2. User logs out, enters email on `/login`, clicks "Sign in with passkey", authenticates → logged in (JWT cookie set), redirected to `/`.
3. Deleting a passkey removes it; it can no longer be used to log in.
4. Email with no passkey → clear "No passkey found" message; password login still works unchanged.
5. Counter + lastUsedAt updated on each successful passkey login.
6. A user cannot delete another user's passkey.
7. No regression: existing login/logout/me/change-password/reset flows unchanged.

## Scope boundary (OUT)
- Usernameless/discoverable (resident key) login — not this round.
- Replacing password login / migration.
- Admin management of other users' passkeys.
- Multi-instance challenge persistence.

## Non-negotiable constraints
- NestJS 11 + TypeORM (autoLoadEntities + synchronize; no migration files).
- Reuse cookie `access_token` + `COOKIE_OPTIONS` + JWT issuance.
- Next.js 14 App Router, fetch + `credentials:'include'`, existing glass-card UI style.
- rpID/origin derived from `FRONTEND_URL`.

## Touchpoints
Backend (`apps/backend/src/modules/auth/`): `auth.controller.ts`, `auth.service.ts`,
`auth.module.ts`, new `webauthn.service.ts`, new `webauthn-challenge.store.ts`,
new `entities/passkey-credential.entity.ts`, new DTOs.
Users module: reuse `UsersService.findByEmail/findOne`.
Frontend: `src/contexts/auth-context.tsx`, `src/app/login/page.tsx`,
`src/app/settings/page.tsx`, new `src/lib/webauthn.ts`.
Config/docs: `.env.example`, `docs/system-architecture.md`, `README.md`.

## Phases
- phase-01-backend.md — entity, challenge store, service, controller endpoints, module wiring, deps.
- phase-02-frontend.md — webauthn client, auth-context, login button, settings management.
- phase-03-tests-docs.md — service spec, manual verification, docs/env updates.

## Dependencies
phase-02 depends on phase-01 (endpoints). phase-03 after both.

## Risks
- SimpleWebAuthn v13 API shape (`verifyRegistrationResponse`/`verifyAuthenticationResponse` field names, `WebAuthnCredential`). Verify against installed version.
- rpID mismatch between dev (`localhost`) and prod domain → documented; derived from FRONTEND_URL.
- Enumeration: login/options reveals whether an account has a passkey; mitigated by rate-limit, accepted for admin-managed self-hosted product.
