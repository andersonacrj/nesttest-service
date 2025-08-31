import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { db } from '../db/client';
import {
  shipmentEvents as ShipmentEventsTbl,
  shipments as ShipmentsTbl,
  events as EventsTbl,
} from '../db/schema';
import { eq } from 'drizzle-orm';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('EasyPost Webhooks')
@Controller('webhooks/easypost')
export class EasyPostWebhookController {
  @Post()
  @HttpCode(200)
  async receive(@Body() body: any, @Headers('x-hook-signature') sig: string) {
    const event = body;
    if (!event || event.object !== 'Event') return { ok: true };

    if (
      event.description &&
      String(event.description).includes('tracker') &&
      event.result?.object === 'Tracker'
    ) {
      const tracker = event.result;
      const tracking = tracker.tracking_code as string;
      const status = tracker.status as string;
      const desc = tracker.status_detail ?? tracker.carrier_status_description;
      const last =
        tracker.tracking_details?.[tracker.tracking_details.length - 1];
      const loc = last?.tracking_location?.city;
      const when = last?.datetime;

      const map: Record<
        string,
        'CREATED' | 'IN_TRANSIT' | 'DELIVERED' | 'EXCEPTION' | 'UNKNOWN'
      > = {
        unknown: 'UNKNOWN',
        pre_transit: 'CREATED',
        in_transit: 'IN_TRANSIT',
        out_for_delivery: 'IN_TRANSIT',
        available_for_pickup: 'IN_TRANSIT',
        delivered: 'DELIVERED',
        return_to_sender: 'EXCEPTION',
        failure: 'EXCEPTION',
      };
      const mapped = map[status] ?? 'UNKNOWN';

      const rows = await db
        .select()
        .from(ShipmentsTbl)
        .where(eq(ShipmentsTbl.trackingNumber, tracking));
      if (rows.length === 0) return { ok: true };
      const s = rows[0];

      await db.insert(ShipmentEventsTbl).values({
        shipmentId: s.id,
        status: mapped as any,
        description: desc,
        location: loc,
        raw: tracker,
        eventTime: when ? new Date(when) : null,
      });

      await db
        .update(ShipmentsTbl)
        .set({
          status: mapped as any,
          lastEvent: desc,
          lastCheckpointAt: when ? new Date(when) : null,
        })
        .where(eq(ShipmentsTbl.id, s.id));

      if (s.role === 'TO_PATIENT') {
        if (mapped === 'IN_TRANSIT')
          await db
            .insert(EventsTbl)
            .values({
              orderId: s.orderId,
              type: 'ORDER_SHIPPED_TO_PATIENT' as any,
            });
        if (mapped === 'DELIVERED')
          await db
            .insert(EventsTbl)
            .values({
              orderId: s.orderId,
              type: 'ORDER_RECEIVED_BY_PATIENT' as any,
            });
      } else if (s.role === 'TO_LAB') {
        if (mapped === 'IN_TRANSIT')
          await db
            .insert(EventsTbl)
            .values({
              orderId: s.orderId,
              type: 'PATIENT_SHIPS_TEST_TO_LAB' as any,
            });
        if (mapped === 'DELIVERED')
          await db
            .insert(EventsTbl)
            .values({ orderId: s.orderId, type: 'LAB_RECEIVES_SAMPLE' as any });
      }
      if (mapped === 'EXCEPTION') {
        await db
          .insert(EventsTbl)
          .values({
            orderId: s.orderId,
            type: 'NESTTEST_NOTIFIED' as any,
            payload: JSON.stringify({ reason: 'EXCEPTION', tracking }),
          });
      }
    }
    return { ok: true };
  }
}
