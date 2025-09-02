import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { SlackService } from './slack.service';
import { NotificationService } from './notification.service';
import { WhatsAppService } from './whatsapp.service';

@Module({
  providers: [EmailService, SlackService, WhatsAppService, NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
