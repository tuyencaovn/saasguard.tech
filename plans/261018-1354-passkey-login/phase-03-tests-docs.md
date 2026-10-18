# Phase 03 — Tests & Docs

## Tests (backend, jest)
### webauthn.service.spec.ts
Mock `@simplewebauthn/server` fns, PasskeyCredential repo, UsersService, AuthService, ChallengeStore.
Cases:
- verifyRegistration: verified → repo.save called with mapped fields; returns {verified:true}.
- getLoginOptions: no user / inactive / no creds → throws NotFound.
- verifyLogin: verified → counter+lastUsedAt updated, authService.buildAuthResult returned.
- verifyLogin: expired/missing challenge → throws.
- deleteCredential: affected=0 → NotFound (cannot delete other's / nonexistent).

Run: `cd apps/backend && npm test -- webauthn`.

## Manual verification (running stack)
`npm run dev`, then:
1. Login with password → Settings → add passkey (platform authenticator) → appears in list.
2. Logout → enter email → "Sign in with passkey" → authenticated, redirected to /.
3. Delete passkey → retry passkey login → fails gracefully.
4. Unknown email passkey → "No passkey found"; password login still works.

## Docs
- `.env.example`: add optional `WEBAUTHN_RP_NAME=` under Security with note (defaults to APP_NAME; rpID/origin derived from FRONTEND_URL).
- `docs/system-architecture.md`: auth section — note passkey (WebAuthn) additive login + passkey_credentials table + endpoints.
- `README.md`: Features — add "Passkey (WebAuthn) login" bullet under User Authentication.

## Finalize
- /ck:project-management sync-back across phases + plan status.
- docs-manager if broader docs warrant.
- Ask user to commit via git-manager (no auto-push).
- /ck:journal entry.
