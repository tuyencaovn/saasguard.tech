import { IsString, IsOptional, IsInt, IsBoolean, IsEmail, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateSslMonitorDto {
  @IsString()
  @Transform(({ value }: { value: string }) => {
    // Strip protocol if provided
    return value.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
  })
  domain: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

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
