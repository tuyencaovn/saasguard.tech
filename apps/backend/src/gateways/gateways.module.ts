import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MetricsGateway } from './metrics.gateway';
import { GatewayListener } from './gateway.listener';
import { MetricsModule } from '../modules/metrics/metrics.module';
import { AlertsModule } from '../modules/alerts/alerts.module';
import { SslModule } from '../modules/ssl/ssl.module';

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
    MetricsModule,
    AlertsModule,
    SslModule,
  ],
  providers: [MetricsGateway, GatewayListener],
  exports: [MetricsGateway],
})
export class GatewaysModule {}
