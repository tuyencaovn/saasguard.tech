import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
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
}
