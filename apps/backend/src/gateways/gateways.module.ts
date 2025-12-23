import { Module } from '@nestjs/common';
import { MetricsGateway } from './metrics.gateway';
import { GatewayListener } from './gateway.listener';

@Module({
  providers: [MetricsGateway, GatewayListener],
  exports: [MetricsGateway],
})
export class GatewaysModule {}
