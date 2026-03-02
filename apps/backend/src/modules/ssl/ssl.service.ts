import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as tls from 'tls';
import { SslMonitor, SslStatus } from './entities/ssl-monitor.entity';
import { CreateSslMonitorDto } from './dto/create-ssl-monitor.dto';
import { UpdateSslMonitorDto } from './dto/update-ssl-monitor.dto';

interface CertResult {
  expiresAt: Date | null;
  daysUntilExpiry: number | null;
  issuer: string | null;
  error: string | null;
}

const FREE_TIER_LIMIT = 3;
const PRO_TIER_LIMIT = 50;

@Injectable()
export class SslService {
  private readonly logger = new Logger(SslService.name);

  constructor(
    @InjectRepository(SslMonitor)
    private readonly sslMonitorRepository: Repository<SslMonitor>,
  ) {}

  async create(userId: string, dto: CreateSslMonitorDto): Promise<SslMonitor> {
    // Check for duplicate domain
    const existing = await this.sslMonitorRepository.findOne({
      where: { userId, domain: dto.domain, port: dto.port ?? 443 },
    });
    if (existing) {
      throw new BadRequestException(`Domain ${dto.domain} is already being monitored`);
    }

    // Enforce tier limit (free = 3, pro = 50)
    const count = await this.sslMonitorRepository.count({ where: { userId } });
    const limit = FREE_TIER_LIMIT; // TODO: check user tier for pro limit
    if (count >= limit) {
      throw new BadRequestException(
        `Free tier allows up to ${FREE_TIER_LIMIT} SSL monitors. Upgrade to Pro for up to ${PRO_TIER_LIMIT}.`,
      );
    }

    const monitor = this.sslMonitorRepository.create({
      userId,
      domain: dto.domain,
      port: dto.port ?? 443,
      status: SslStatus.UNKNOWN,
    });
    const saved = await this.sslMonitorRepository.save(monitor);

    // Run immediate check (non-blocking)
    this.checkAndUpdate(saved.id).catch((err) =>
      this.logger.error(`Initial check failed for ${dto.domain}`, err),
    );

    return saved;
  }

  async findAllByUser(userId: string): Promise<SslMonitor[]> {
    return this.sslMonitorRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<SslMonitor> {
    const monitor = await this.sslMonitorRepository.findOne({ where: { id, userId } });
    if (!monitor) throw new NotFoundException('SSL monitor not found');
    return monitor;
  }

  async update(id: string, userId: string, dto: UpdateSslMonitorDto): Promise<SslMonitor> {
    const monitor = await this.findOne(id, userId);
    Object.assign(monitor, dto);
    return this.sslMonitorRepository.save(monitor);
  }

  async remove(id: string, userId: string): Promise<void> {
    const monitor = await this.findOne(id, userId);
    await this.sslMonitorRepository.remove(monitor);
  }

  async checkAndUpdate(id: string): Promise<SslMonitor> {
    const monitor = await this.sslMonitorRepository.findOne({ where: { id } });
    if (!monitor) throw new NotFoundException('SSL monitor not found');

    const result = await this.checkCertificate(monitor.domain, monitor.port);

    monitor.lastChecked = new Date();
    monitor.expiresAt = result.expiresAt;
    monitor.daysUntilExpiry = result.daysUntilExpiry;
    monitor.issuer = result.issuer;
    monitor.errorMessage = result.error;
    monitor.status = result.error
      ? SslStatus.ERROR
      : this.getStatusFromDays(result.daysUntilExpiry);

    return this.sslMonitorRepository.save(monitor);
  }

  async checkAllDomains(): Promise<SslMonitor[]> {
    const monitors = await this.sslMonitorRepository.find();
    const results: SslMonitor[] = [];

    for (const monitor of monitors) {
      try {
        const updated = await this.checkAndUpdate(monitor.id);
        results.push(updated);
      } catch (err) {
        this.logger.error(`Check failed for ${monitor.domain}`, err);
      }
    }

    return results;
  }

  getStatusFromDays(days: number | null): SslStatus {
    if (days === null) return SslStatus.ERROR;
    if (days <= 0) return SslStatus.EXPIRED;
    if (days <= 7) return SslStatus.CRITICAL;
    if (days <= 30) return SslStatus.WARNING;
    return SslStatus.VALID;
  }

  checkCertificate(domain: string, port = 443): Promise<CertResult> {
    return new Promise((resolve) => {
      const socket = tls.connect(port, domain, { servername: domain, timeout: 10000 }, () => {
        try {
          const cert = socket.getPeerCertificate();
          if (!cert || !cert.valid_to) {
            socket.destroy();
            resolve({ expiresAt: null, daysUntilExpiry: null, issuer: null, error: 'No certificate data' });
            return;
          }
          const expiresAt = new Date(cert.valid_to);
          const daysUntilExpiry = Math.floor(
            (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
          );
          const issuer = (cert.issuer as { O?: string })?.O || 'Unknown';
          socket.destroy();
          resolve({ expiresAt, daysUntilExpiry, issuer, error: null });
        } catch (err) {
          socket.destroy();
          resolve({ expiresAt: null, daysUntilExpiry: null, issuer: null, error: String(err) });
        }
      });

      socket.on('error', (err) => {
        socket.destroy();
        resolve({ expiresAt: null, daysUntilExpiry: null, issuer: null, error: err.message });
      });

      socket.setTimeout(10000, () => {
        socket.destroy();
        resolve({ expiresAt: null, daysUntilExpiry: null, issuer: null, error: 'Connection timeout' });
      });
    });
  }
}
