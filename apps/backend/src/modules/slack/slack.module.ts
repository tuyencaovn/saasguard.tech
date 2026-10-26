import { Module, forwardRef } from '@nestjs/common';
import { SlackService } from './slack.service';
import { NotificationSettingsModule } from '../notification-settings/notification-settings.module';

@Module({
  imports: [forwardRef(() => NotificationSettingsModule)],
  providers: [SlackService],
  exports: [SlackService],
})
export class SlackModule {}
