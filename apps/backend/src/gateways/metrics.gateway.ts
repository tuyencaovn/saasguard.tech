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
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { SystemMetrics, DockerEvent } from '../modules/metrics/types/metrics.types';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

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
  private lastMetrics: SystemMetrics | null = null;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Authenticate WebSocket connection using JWT from cookie or auth header
   */
  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Try to get token from cookie first (preferred)
      let token = client.handshake.headers.cookie
        ?.split(';')
        .find((c) => c.trim().startsWith('access_token='))
        ?.split('=')[1];

      // Fallback to auth header
      if (!token) {
        const authHeader = client.handshake.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
      }

      if (!token) {
        this.logger.warn(`Client ${client.id} connection rejected: No token provided`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      // Verify JWT token
      const secret = this.configService.get<string>('JWT_SECRET') || 'default-dev-secret-change-in-production';
      const payload = this.jwtService.verify(token, { secret });

      // Attach user to socket for future reference
      client.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      this.logger.log(`Client ${client.id} connected (user: ${payload.email})`);
    } catch (error) {
      this.logger.warn(`Client ${client.id} connection rejected: Invalid token`);
      client.emit('error', { message: 'Invalid authentication token' });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client ${client.id} disconnected (user: ${client.user?.email || 'unknown'})`);
  }

  @SubscribeMessage('subscribe:metrics')
  handleSubscribeMetrics(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.user) {
      return { event: 'error', data: { message: 'Not authenticated' } };
    }

    client.join('metrics-room');
    this.logger.debug(`Client ${client.id} (${client.user.email}) subscribed to metrics`);
    // Send last known metrics immediately to new subscriber
    if (this.lastMetrics) {
      client.emit('metrics:update', this.lastMetrics);
    }
    return { event: 'subscribed', data: { room: 'metrics' } };
  }

  @SubscribeMessage('subscribe:docker')
  handleSubscribeDocker(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.user) {
      return { event: 'error', data: { message: 'Not authenticated' } };
    }

    client.join('docker-room');
    this.logger.debug(`Client ${client.id} (${client.user.email}) subscribed to docker`);
    return { event: 'subscribed', data: { room: 'docker' } };
  }

  @SubscribeMessage('unsubscribe:metrics')
  handleUnsubscribeMetrics(@ConnectedSocket() client: AuthenticatedSocket) {
    client.leave('metrics-room');
    return { event: 'unsubscribed', data: { room: 'metrics' } };
  }

  @SubscribeMessage('unsubscribe:docker')
  handleUnsubscribeDocker(@ConnectedSocket() client: AuthenticatedSocket) {
    client.leave('docker-room');
    return { event: 'unsubscribed', data: { room: 'docker' } };
  }

  /**
   * Broadcast metrics to all subscribed clients
   */
  broadcastMetrics(metrics: SystemMetrics) {
    this.lastMetrics = metrics;
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
