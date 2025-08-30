import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { cfg } from '../config/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend = new Resend(cfg().resendApiKey);
  private readonly from = cfg().resendFrom;
  private readonly bcc = cfg().resendBcc;

  async send(to: string, subject: string, html: string) {
    const payload: any = { from: this.from, to, subject, html };
    if (this.bcc) payload.bcc = this.bcc;
    const res = await this.resend.emails.send(payload);
    this.logger.log(`Resend accepted: ${JSON.stringify(res)}`);
    return (res as any).id ?? (res as any).data?.id ?? '';
  }
}
