import { Injectable } from '@nestjs/common';
import { db } from '../db/client';
import {
  shipments as ShipmentsTbl,
  shipmentEvents as ShipmentEventsTbl,
} from '../db/schema';
import { eq } from 'drizzle-orm';

type UpsertShipmentDto = {
  orderId: number;
  role: 'TO_PATIENT' | 'TO_LAB';
  trackingNumber: string;
  labelUrl?: string;
  providerShipmentId?: string;
};

@Injectable()
export class ShipmentsService {
  async upsert(dto: UpsertShipmentDto) {
    const rows = await db
      .select()
      .from(ShipmentsTbl)
      .where(eq(ShipmentsTbl.orderId, dto.orderId));
    const existing = rows.find((r) => r.role === dto.role);
    if (existing) {
      await db
        .update(ShipmentsTbl)
        .set({
          trackingNumber: dto.trackingNumber,
          labelUrl: dto.labelUrl ?? existing.labelUrl,
          providerShipmentId:
            dto.providerShipmentId ?? existing.providerShipmentId,
        })
        .where(eq(ShipmentsTbl.id, existing.id));
      return { id: existing.id };
    }
    const inserted = await db
      .insert(ShipmentsTbl)
      .values({
        orderId: dto.orderId,
        role: dto.role as any,
        trackingNumber: dto.trackingNumber,
        labelUrl: dto.labelUrl,
        providerShipmentId: dto.providerShipmentId,
      })
      .returning({ id: ShipmentsTbl.id });
    return inserted[0];
  }

  async addHistory(
    shipmentId: number,
    event: {
      status: 'CREATED' | 'IN_TRANSIT' | 'DELIVERED' | 'EXCEPTION' | 'UNKNOWN';
      description?: string;
      location?: string;
      eventTime?: string;
      raw?: any;
    },
  ) {
    await db.insert(ShipmentEventsTbl).values({
      shipmentId,
      status: event.status as any,
      description: event.description,
      location: event.location,
      raw: event.raw ?? null,
      eventTime: event.eventTime ? new Date(event.eventTime) : null,
    });
  }
}
