import { Module, forwardRef } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { NotificationSettingsModule } from '../notification-settings/notification-settings.module';

@Module({
  imports: [forwardRef(() => NotificationSettingsModule)],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
