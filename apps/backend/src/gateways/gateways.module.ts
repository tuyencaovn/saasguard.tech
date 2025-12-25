import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MetricsGateway } from './metrics.gateway';
import { GatewayListener } from './gateway.listener';

@Module({
  imports: [
    // Import JwtModule for WebSocket authentication
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default-dev-secret-change-in-production',
        signOptions: { expiresIn: '24h' },
      }),
    }),
  ],
  providers: [MetricsGateway, GatewayListener],
  exports: [MetricsGateway],
})
export class GatewaysModule {}
