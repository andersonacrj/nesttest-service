import { Injectable, Logger } from '@nestjs/common';
import twilio from 'twilio';
import { cfg } from '../config/config';

import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private client: ReturnType<typeof twilio> | null = null;
  private enabled: boolean;
  

  constructor() {
    const c = cfg().whatsapp;
    this.enabled = c.enabled && !!c.accountSid && !!c.authToken && !!c.from;
    if (this.enabled) {
      this.client = twilio(c.accountSid, c.authToken);
    } else {
      this.logger.warn('WhatsApp disabled or misconfigured; skipping init');
    }
  }

  async send(to: string | undefined, body: string) {
    if (!this.enabled || !this.client) {
      this.logger.warn('WhatsApp not enabled; skipping send');
      return '';
    }
    const c = cfg().whatsapp;
    const dest = to?.startsWith('whatsapp:') ? to : (to ? `whatsapp:${to}` : c.fallbackTo);
    if (!dest) {
      this.logger.warn('No destination phone and no fallback; skipping WhatsApp');
      return '';
    }

    const res = await this.client.messages.create({
      from: c.from, // ex: "whatsapp:+14155238886"
      to: dest,     // ex: "whatsapp:+55XXXXXXXXXX"
      body
    });
    this.logger.log(`Twilio WhatsApp SID=${res.sid}`);
    return res.sid;
  }
}
