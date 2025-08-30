import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { SlackService } from './slack.service';
import { NotificationService } from './notification.service';

@Module({
  providers: [EmailService, SlackService, NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
