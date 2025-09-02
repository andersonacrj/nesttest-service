import { Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { events, notifications, orders } from '../db/schema';
import { alreadyNotified } from '../utils/idempotency';
import { EmailService } from './email.service';
import { SlackService } from './slack.service';
import * as Templates from './templates';
import { WhatsAppService } from './whatsapp.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private emails: EmailService, private slack: SlackService, private whatsapp: WhatsAppService) {}

  async processEvent(eventId: number) {
    const [ev] = await db.select().from(events).where(eq(events.id, eventId));
    if (!ev) return;

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, ev.orderId));
    if (!order) return;

    const { subject, html, slackText, whatsappText, channel } =
      this.buildMessages(ev.type, order);

      // EMAIL
    // if (channel.includes('email') && !(await alreadyNotified(ev.id, 'email'))) {
    //   try {
    //     const providerId = await this.emails.send(
    //       order.patientEmail,
    //       subject,
    //       html,
    //     );
    //     await db
    //       .insert(notifications)
    //       .values({
    //         eventId: ev.id,
    //         channel: 'email',
    //         status: 'sent',
    //         providerMessageId: providerId,
    //       });
    //     await this.slack.notify(
    //       `Email sent: event=${ev.type} order=${order.id} to=${order.patientEmail}`,
    //     );
    //   } catch (err: any) {
    //     await db
    //       .insert(notifications)
    //       .values({
    //         eventId: ev.id,
    //         channel: 'email',
    //         status: 'failed',
    //         error: String(err),
    //       });
    //     await this.slack.notify(
    //       `Email FAILED: event=${ev.type} order=${order.id} err=${String(err)}`,
    //     );
    //   }
    // }
    // // SLACK
    // if (channel.includes('slack') && !(await alreadyNotified(ev.id, 'slack'))) {
    //   try {
    //     const ts = await this.slack.notify(slackText);
    //     await db
    //       .insert(notifications)
    //       .values({
    //         eventId: ev.id,
    //         channel: 'slack',
    //         status: 'sent',
    //         providerMessageId: ts,
    //       });
    //   } catch (err: any) {
    //     await db
    //       .insert(notifications)
    //       .values({
    //         eventId: ev.id,
    //         channel: 'slack',
    //         status: 'failed',
    //         error: String(err),
    //       });
    //   }
    // }

     // WHATSAPP
    if (channel.includes('whatsapp') && !(await alreadyNotified(ev.id, 'whatsapp'))) {
      try {
        const sid = await this.whatsapp.send(order.patientPhone, whatsappText);
        await db.insert(notifications).values({ eventId: ev.id, channel: 'whatsapp', status: 'sent', providerMessageId: sid });
      } catch (err: any) {
        await db.insert(notifications).values({ eventId: ev.id, channel: 'whatsapp', status: 'failed', error: String(err) });
      }
    }

    await db
      .update(events)
      .set({ processed: true })
      .where(eq(events.id, ev.id));
  }

  private buildMessages(type: string, order: any) {
    const base = `Order #${order.id} – Patient: ${order.patientName}`;
    switch (type) {
      case 'ORDER_SUBMITTED_TO_NESTTEST':
        return {
          subject: `Your NestTest order has been submitted`,
          html: Templates.patientNotice(
            'Order Submitted',
            `Hi ${order.patientName}, your provider ${order.providerName} submitted your NestTest order. We'll ship your kit soon.`,
          ),
          slackText: `📦 ORDER_SUBMITTED_TO_NESTTEST for order ${order.id} (${order.patientName})`,
          whatsappText: `NestTest: your order was submitted. We'll ship your kit soon. ${base}`,
          channel: ['email', 'slack', 'whatsapp'] as const,
        };
      case 'ORDER_SHIPPED_TO_PATIENT':
        return {
          subject: `Your NestTest kit is on the way`,
          html: Templates.patientNotice(
            'Kit Shipped',
            `Hi ${order.patientName}, your kit has shipped to: ${
              order.patientAddress ?? 'your address on file'
            }. Watch your email for tracking.`,
          ),
          slackText: `🚚 ORDER_SHIPPED_TO_PATIENT for order ${order.id}`,
          whatsappText: `NestTest: your kit has shipped to your address. ${base}`,
          channel: ['email', 'slack', 'whatsapp'] as const,
        };
      case 'ORDER_RECEIVED_BY_PATIENT':
        return {
          subject: `Your NestTest kit has arrived`,
          html: Templates.patientNotice(
            'Kit Delivered',
            `Hi ${order.patientName}, your kit has been delivered. Please follow the included instructions to complete your proctored test.`,
          ),
          slackText: `📬 ORDER_RECEIVED_BY_PATIENT for order ${order.id}`,
          whatsappText: `NestTest: your kit was delivered. Please follow the instructions to complete your test. ${base}`,
          channel: ['email', 'slack', 'whatsapp'] as const,
        };
      case 'PATIENT_SHIPS_TEST_TO_LAB':
        return {
          subject: `Sample shipped to lab`,
          html: Templates.patientNotice(
            'Sample in Transit',
            `Thanks ${order.patientName}! Your sample is on the way to the lab. We'll notify you when it arrives.`,
          ),
          slackText: `📦 PATIENT_SHIPS_TEST_TO_LAB for order ${order.id}`,
          whatsappText: `NestTest: your sample is on the way to the lab. ${base}`,
          channel: ['email', 'slack', 'whatsapp'] as const,
        };
      case 'LAB_RECEIVES_SAMPLE':
        return {
          subject: `Lab received your sample`,
          html: Templates.patientNotice(
            'Lab Received',
            `The lab has received your sample and testing will begin shortly.`,
          ),
          slackText: `🏥 LAB_RECEIVES_SAMPLE for order ${order.id}`,
          whatsappText: `NestTest: the lab received your sample. Testing will begin shortly. ${base}`,
          channel: ['email', 'slack', 'whatsapp'] as const,
        };
      default:
        return {
          subject: `Update on your NestTest order`,
          html: Templates.patientNotice(
            'Order Update',
            `There is an update for your order.`,
          ),
          slackText: `ℹ️ ${type} for order ${order.id}`,
          whatsappText: `NestTest: there is an update on your order. ${base}`,
          channel: ['email', 'slack', 'whatsapp'] as const,
        };
    }
  }
}
