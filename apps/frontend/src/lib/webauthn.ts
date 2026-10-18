import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser';
import type { User } from '@/contexts/auth-context';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export { browserSupportsWebAuthn };

export interface PasskeySummary {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

async function parseError(res: Response, fallback: string): Promise<never> {
  let message = fallback;
  try {
    const data = await res.json();
    message = data.message || fallback;
  } catch {
    // keep fallback
  }
  throw new Error(message);
}

/** Register a new passkey for the currently logged-in user. */
export async function registerPasskey(name: string): Promise<void> {
  const optionsRes = await fetch(`${API_URL}/auth/webauthn/register/options`, {
    credentials: 'include',
  });
  if (!optionsRes.ok) {
    await parseError(optionsRes, 'Failed to start passkey registration');
  }
  const optionsJSON = await optionsRes.json();

  const response = await startRegistration({ optionsJSON });

  const verifyRes = await fetch(`${API_URL}/auth/webauthn/register/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ response, name }),
  });
  if (!verifyRes.ok) {
    await parseError(verifyRes, 'Failed to register passkey');
  }
}

/** Authenticate with a passkey (email-first) and return the signed-in user. */
export async function loginWithPasskeyRequest(email: string): Promise<User> {
  const optionsRes = await fetch(`${API_URL}/auth/webauthn/login/options`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email }),
  });
  if (!optionsRes.ok) {
    if (optionsRes.status === 404) {
      throw new Error('No passkey found for this account');
    }
    if (optionsRes.status === 429) {
      throw new Error('Too many attempts. Please try again in 15 minutes.');
    }
    await parseError(optionsRes, 'Failed to start passkey login');
  }
  const optionsJSON = await optionsRes.json();

  const response = await startAuthentication({ optionsJSON });

  const verifyRes = await fetch(`${API_URL}/auth/webauthn/login/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, response }),
  });
  if (!verifyRes.ok) {
    await parseError(verifyRes, 'Passkey authentication failed');
  }
  const data = await verifyRes.json();
  return data.user as User;
}

export async function listPasskeys(): Promise<PasskeySummary[]> {
  const res = await fetch(`${API_URL}/auth/webauthn/credentials`, {
    credentials: 'include',
  });
  if (!res.ok) {
    await parseError(res, 'Failed to load passkeys');
  }
  return res.json();
}

export async function deletePasskey(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/auth/webauthn/credentials/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    await parseError(res, 'Failed to delete passkey');
  }
}
