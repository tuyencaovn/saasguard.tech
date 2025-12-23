import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type { SystemMetrics, DockerEvent } from '../modules/metrics/types/metrics.types';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3006',
    credentials: true,
  },
})
export class MetricsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MetricsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe:metrics')
  handleSubscribeMetrics(@ConnectedSocket() client: Socket) {
    client.join('metrics-room');
    this.logger.debug(`Client ${client.id} subscribed to metrics`);
    return { event: 'subscribed', data: { room: 'metrics' } };
  }

  @SubscribeMessage('subscribe:docker')
  handleSubscribeDocker(@ConnectedSocket() client: Socket) {
    client.join('docker-room');
    this.logger.debug(`Client ${client.id} subscribed to docker`);
    return { event: 'subscribed', data: { room: 'docker' } };
  }

  @SubscribeMessage('unsubscribe:metrics')
  handleUnsubscribeMetrics(@ConnectedSocket() client: Socket) {
    client.leave('metrics-room');
    return { event: 'unsubscribed', data: { room: 'metrics' } };
  }

  @SubscribeMessage('unsubscribe:docker')
  handleUnsubscribeDocker(@ConnectedSocket() client: Socket) {
    client.leave('docker-room');
    return { event: 'unsubscribed', data: { room: 'docker' } };
  }

  /**
   * Broadcast metrics to all subscribed clients
   */
  broadcastMetrics(metrics: SystemMetrics) {
    this.server.to('metrics-room').emit('metrics:update', metrics);
  }

  /**
   * Broadcast Docker events to all subscribed clients
   */
  broadcastDockerEvent(event: DockerEvent) {
    this.server.to('docker-room').emit('docker:event', event);
  }

  /**
   * Get count of connected clients
   */
  getConnectedClientsCount(): number {
    return this.server?.sockets?.sockets?.size || 0;
  }
}
