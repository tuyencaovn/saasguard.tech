import { Module, Global, forwardRef } from '@nestjs/common';
import { EmailService } from './email.service';
import { NotificationSettingsModule } from '../notification-settings/notification-settings.module';

@Global()
@Module({
  imports: [forwardRef(() => NotificationSettingsModule)],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
