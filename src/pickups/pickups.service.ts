import EasyPost from '@easypost/api';
import { Injectable } from '@nestjs/common';
import { cfg } from '../config/config';
import { db } from '../db/client';
import {
  pickups as PickupsTbl,
  pickupShipments as PickupShipmentsTbl,
  shipments as ShipmentsTbl,
} from '../db/schema';
import { inArray } from 'drizzle-orm';

@Injectable()
export class PickupsService {
  private client = new EasyPost(cfg().easypostApiKey);

  async schedule(params: {
    shipmentIds: number[];
    date: string;
    fromTime?: string;
    toTime?: string;
    instructions?: string;
  }) {
    const c = cfg();
    const from = c.fromAddress;
    const min = `${params.date}T${params.fromTime ?? c.pickup.minTime}:00`;
    const max = `${params.date}T${params.toTime ?? c.pickup.maxTime}:00`;

    const rows = await db
      .select()
      .from(ShipmentsTbl)
      .where(inArray(ShipmentsTbl.id, params.shipmentIds));
    if (rows.length === 0) throw new Error('No shipments found for given IDs');
    const providerIds = rows.map((r) => r.providerShipmentId).filter(Boolean);
    if (providerIds.length === 0)
      throw new Error('Shipments missing providerShipmentId (EasyPost id)');

    const epPickup = await this.client.Pickup.create({
      address: from,
      min_datetime: min,
      max_datetime: max,
      instructions: params.instructions ?? c.pickup.instructions,
      shipments: providerIds.map((id) => ({ id })),
    });

    let purchased = epPickup;
    if (epPickup.pickup_rates && epPickup.pickup_rates.length > 0) {
      const lowest = epPickup.pickup_rates.reduce((a: any, b: any) =>
        parseFloat(a.rate) <= parseFloat(b.rate) ? a : b,
      );
      purchased = await this.client.Pickup.buy(
        epPickup.id,
        lowest.carrier,
        lowest.service,
      );
    }

    const [inserted] = await db
      .insert(PickupsTbl)
      .values({
        easypostPickupId: purchased.id,
        status: (purchased.status?.toUpperCase?.() as any) ?? 'PURCHASED',
        confirmationCode: (purchased as any).confirmation ?? null,
        instructions: params.instructions ?? c.pickup.instructions,
        minDatetime: new Date(min),
        maxDatetime: new Date(max),
        addressJson: from as any,
      })
      .returning({ id: PickupsTbl.id });

    for (const s of rows) {
      await db
        .insert(PickupShipmentsTbl)
        .values({ pickupId: inserted.id, shipmentId: s.id });
    }

    return {
      id: inserted.id,
      easypostId: purchased.id,
      confirmation: (purchased as any).confirmation ?? null,
    };
  }
}
