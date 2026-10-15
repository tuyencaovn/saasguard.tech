export type Tier = 'free' | 'pro';

// Billing is off for now — the free tier is unlocked to full access.
// When paid plans return, restore the smaller free-tier limits here.
export const TIER_LIMITS = {
  free: {
    servers: Infinity,
    sslDomains: 50,
    alertChannels: ['email', 'telegram'] as string[],
    crashDetection: true,
    retentionDays: 90,
  },
  pro: {
    servers: Infinity,
    sslDomains: 50,
    alertChannels: ['email', 'telegram'] as string[],
    crashDetection: true,
    retentionDays: 90,
  },
} as const;

export const PRO_PRICE = 19; // USD/mo

export const PRO_STRIPE_LINK = 'mailto:tuyencaovn@gmail.com?subject=Pro%20Upgrade';
