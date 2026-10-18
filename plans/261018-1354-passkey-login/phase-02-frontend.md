# Phase 02 — Frontend Passkey

## Deps
- `cd apps/frontend && npm i @simplewebauthn/browser`

## Create
### src/lib/webauthn.ts
`browserSupportsWebAuthn` re-export. Functions (API_URL = NEXT_PUBLIC_API_URL||'/api'):
- `registerPasskey(name)`: GET /auth/webauthn/register/options (credentials include) → startRegistration({optionsJSON}) → POST /auth/webauthn/register/verify {response,name}. Throw on !ok.
- `loginWithPasskeyRequest(email)`: POST /auth/webauthn/login/options {email} → startAuthentication({optionsJSON}) → POST /auth/webauthn/login/verify {email,response} → return user. Throw mapped errors (404 → 'No passkey found for this account').
- `listPasskeys()`, `deletePasskey(id)`.

## Modify
### src/contexts/auth-context.tsx
- Add `loginWithPasskey(email): Promise<void>` to context value + interface: calls loginWithPasskeyRequest(email), setUser(result).

### src/app/login/page.tsx
- Below "Sign in" button add divider "or" + secondary button "Sign in with passkey" (Fingerprint/KeyRound lucide icon).
- Handler: require email filled (reuse email state); setIsSubmitting; call loginWithPasskey(email); router.push('/'); map errors to `error` state. Handle user-cancel (NotAllowedError) → silent/soft message.

### src/app/settings/page.tsx
- Add "Passkeys" glass-card (icon: KeyRound/Fingerprint) in the grid.
  - On mount (or card open) fetch listPasskeys().
  - Show list: name + created/lastUsed, trash button per item (deletePasskey → refresh).
  - "Add passkey" button → modal/prompt for name → registerPasskey(name) → refresh. Loading + error states consistent with change-password modal style.
  - Empty state: "No passkeys yet".

## Validate
`cd apps/frontend && npm run build` clean (lint/type). Manual check against running stack in phase-03.
