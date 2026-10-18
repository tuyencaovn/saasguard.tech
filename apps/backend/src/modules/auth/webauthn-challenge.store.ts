import { Injectable } from '@nestjs/common';

const CHALLENGE_TTL_MS = 60_000;

/**
 * In-memory WebAuthn challenge store. Valid because the backend runs
 * single-instance (PM2 fork / single container). Move to DB or Redis if the
 * deployment is ever scaled horizontally.
 */
@Injectable()
export class WebAuthnChallengeStore {
  private readonly challenges = new Map<
    string,
    { challenge: string; expiresAt: number }
  >();

  set(key: string, challenge: string): void {
    this.challenges.set(key, {
      challenge,
      expiresAt: Date.now() + CHALLENGE_TTL_MS,
    });
  }

  /** Returns the challenge and removes it; null if missing or expired. */
  consume(key: string): string | null {
    const entry = this.challenges.get(key);
    this.challenges.delete(key);
    if (!entry || entry.expiresAt < Date.now()) {
      return null;
    }
    return entry.challenge;
  }
}
