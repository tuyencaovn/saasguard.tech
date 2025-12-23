import {
  IsEnum,
  IsNumber,
  IsArray,
  IsOptional,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { MetricName, Operator, NotificationChannel } from '../entities/alert-threshold.entity';

export class CreateThresholdDto {
  @IsEnum(MetricName)
  metricName: MetricName;

  @IsEnum(Operator)
  operator: Operator;

  @IsNumber()
  @Min(0)
  @Max(100)
  value: number;

  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels: NotificationChannel[];

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(60000) // Minimum 1 minute cooldown
  cooldownMs?: number;
}
