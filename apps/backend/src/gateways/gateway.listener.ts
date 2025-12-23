import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MetricsGateway } from './metrics.gateway';
import type { SystemMetrics, DockerEvent } from '../modules/metrics/types/metrics.types';

@Injectable()
export class GatewayListener {
  private readonly logger = new Logger(GatewayListener.name);

  constructor(private readonly metricsGateway: MetricsGateway) {}

  @OnEvent('metrics.updated')
  handleMetricsUpdated(metrics: SystemMetrics) {
    this.metricsGateway.broadcastMetrics(metrics);
  }

  @OnEvent('docker.event')
  handleDockerEvent(event: DockerEvent) {
    this.logger.log(`Broadcasting Docker event: ${event.action} - ${event.containerName}`);
    this.metricsGateway.broadcastDockerEvent(event);
  }
}
