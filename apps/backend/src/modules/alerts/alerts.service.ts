import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { AlertThreshold } from './entities/alert-threshold.entity';
import { AlertLog, DeliveryStatus } from './entities/alert-log.entity';
import { CreateThresholdDto } from './dto/create-threshold.dto';
import { UpdateThresholdDto } from './dto/update-threshold.dto';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(AlertThreshold)
    private readonly thresholdRepository: Repository<AlertThreshold>,
    @InjectRepository(AlertLog)
    private readonly logRepository: Repository<AlertLog>,
  ) {}

  // Threshold CRUD
  async createThreshold(dto: CreateThresholdDto, userId?: string): Promise<AlertThreshold> {
    const threshold = this.thresholdRepository.create({
      ...dto,
      userId,
    });
    return this.thresholdRepository.save(threshold);
  }

  async findAllThresholds(): Promise<AlertThreshold[]> {
    return this.thresholdRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findEnabledThresholds(): Promise<AlertThreshold[]> {
    return this.thresholdRepository.find({
      where: { enabled: true },
    });
  }

  async findThreshold(id: string): Promise<AlertThreshold> {
    const threshold = await this.thresholdRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!threshold) {
      throw new NotFoundException('Threshold not found');
    }
    return threshold;
  }

  async updateThreshold(id: string, dto: UpdateThresholdDto): Promise<AlertThreshold> {
    const threshold = await this.findThreshold(id);
    Object.assign(threshold, dto);
    return this.thresholdRepository.save(threshold);
  }

  async removeThreshold(id: string): Promise<void> {
    const threshold = await this.findThreshold(id);
    await this.thresholdRepository.remove(threshold);
  }

  // Alert Logs
  async createLog(
    thresholdId: string,
    metricValue: number,
    sentTo: string,
  ): Promise<AlertLog> {
    const log = this.logRepository.create({
      alertThresholdId: thresholdId,
      metricValue,
      triggeredAt: new Date(),
      sentTo,
      deliveryStatus: DeliveryStatus.PENDING,
    });
    return this.logRepository.save(log);
  }

  async updateLogStatus(
    id: string,
    status: DeliveryStatus,
    errorMessage?: string,
  ): Promise<AlertLog> {
    const log = await this.logRepository.findOne({ where: { id } });
    if (!log) {
      throw new NotFoundException('Alert log not found');
    }
    log.deliveryStatus = status;
    if (errorMessage) {
      log.errorMessage = errorMessage;
    }
    return this.logRepository.save(log);
  }

  async findRecentLogs(limit = 50): Promise<AlertLog[]> {
    return this.logRepository.find({
      relations: ['alertThreshold'],
      order: { triggeredAt: 'DESC' },
      take: limit,
    });
  }

  async findLogsByThreshold(thresholdId: string): Promise<AlertLog[]> {
    return this.logRepository.find({
      where: { alertThresholdId: thresholdId },
      order: { triggeredAt: 'DESC' },
    });
  }

  // Check if alert can be sent (cooldown check)
  async canSendAlert(thresholdId: string): Promise<boolean> {
    const threshold = await this.findThreshold(thresholdId);
    const cooldownTime = new Date(Date.now() - threshold.cooldownMs);

    const recentLog = await this.logRepository.findOne({
      where: {
        alertThresholdId: thresholdId,
        triggeredAt: LessThan(cooldownTime),
        deliveryStatus: DeliveryStatus.SENT,
      },
      order: { triggeredAt: 'DESC' },
    });

    // If no recent sent log within cooldown, can send
    const lastSentLog = await this.logRepository.findOne({
      where: {
        alertThresholdId: thresholdId,
        deliveryStatus: DeliveryStatus.SENT,
      },
      order: { triggeredAt: 'DESC' },
    });

    if (!lastSentLog) {
      return true; // No previous sent log
    }

    return lastSentLog.triggeredAt < cooldownTime;
  }

  // Cleanup old logs (retention: 90 days)
  async cleanupOldLogs(): Promise<number> {
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - 90);

    const result = await this.logRepository.delete({
      triggeredAt: LessThan(retentionDate),
    });
    return result.affected || 0;
  }
}
