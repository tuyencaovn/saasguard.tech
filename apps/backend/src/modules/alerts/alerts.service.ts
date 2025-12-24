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

  async findAllThresholds(): Promise<(AlertThreshold & { lastTriggeredAt: Date | null })[]> {
    const thresholds = await this.thresholdRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    // Get last triggered time for each threshold
    const result = await Promise.all(
      thresholds.map(async (threshold) => {
        const lastLog = await this.logRepository.findOne({
          where: { alertThresholdId: threshold.id },
          order: { triggeredAt: 'DESC' },
        });
        return {
          ...threshold,
          lastTriggeredAt: lastLog?.triggeredAt || null,
        };
      }),
    );

    return result;
  }

  async findEnabledThresholds(): Promise<AlertThreshold[]> {
    return this.thresholdRepository.find({
      where: { enabled: true },
      relations: ['user'],
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

  async findRecentLogs(page = 1, limit = 10): Promise<{ data: AlertLog[]; total: number; page: number; limit: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.logRepository.findAndCount({
      relations: ['alertThreshold'],
      order: { triggeredAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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

    // Check for any recent log (regardless of delivery status)
    const lastLog = await this.logRepository.findOne({
      where: {
        alertThresholdId: thresholdId,
      },
      order: { triggeredAt: 'DESC' },
    });

    if (!lastLog) {
      return true; // No previous log
    }

    // Can send if last log is older than cooldown period
    return lastLog.triggeredAt < cooldownTime;
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
