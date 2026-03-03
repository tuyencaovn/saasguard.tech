export type Tier = 'free' | 'pro';

export const TIER_LIMITS = {
  free: {
    servers: 1,
    sslDomains: 3,
    alertChannels: ['email'] as string[],
    crashDetection: false,
    retentionDays: 7,
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
