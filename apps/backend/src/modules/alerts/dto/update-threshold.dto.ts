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

export class UpdateThresholdDto {
  @IsOptional()
  @IsEnum(MetricName)
  metricName?: MetricName;

  @IsOptional()
  @IsEnum(Operator)
  operator?: Operator;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  value?: number;

  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(60000)
  cooldownMs?: number;
}
