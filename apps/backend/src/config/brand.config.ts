import { ConfigService } from '@nestjs/config';

// Default brand values
export const DEFAULT_APP_NAME = 'SaaSGuard';
export const DEFAULT_APP_SHORT_NAME = 'SaaSGuard';

/**
 * Get brand config from environment or use defaults
 */
export function getBrandConfig(configService: ConfigService) {
  return {
    appName: configService.get<string>('APP_NAME', DEFAULT_APP_NAME),
    appShortName: configService.get<string>('APP_SHORT_NAME', DEFAULT_APP_SHORT_NAME),
  };
}
