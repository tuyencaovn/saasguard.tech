import { IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateSlackSettingsDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsUrl({ require_protocol: true }, { message: 'slackWebhookUrl must be a valid URL' })
  @IsString()
  slackWebhookUrl?: string;
}
