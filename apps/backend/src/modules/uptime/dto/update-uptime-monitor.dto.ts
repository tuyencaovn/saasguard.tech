import { IsString, IsOptional, IsUrl, IsBoolean, IsEmail, IsInt, Min, Max, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateUptimeMonitorDto {
  @IsOptional()
  @IsUrl({ require_protocol: true }, { message: 'url must be a valid http(s) URL' })
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  })
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(86400)
  checkIntervalSeconds?: number;

  @IsOptional()
  @IsBoolean()
  notifyEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyTelegram?: boolean;

  @IsOptional()
  @IsBoolean()
  notifySlack?: boolean;

  @IsOptional()
  @IsEmail()
  notifyEmailTo?: string;
}
