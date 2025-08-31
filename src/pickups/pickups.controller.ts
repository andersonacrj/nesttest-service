import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import {
  pickups as PickupsTbl,
  pickupShipments as PS,
  shipments as ShipmentsTbl,
} from '../db/schema';
import { PickupsService } from './pickups.service';

@ApiTags('Pickups')
@Controller('pickups')
export class PickupsController {
  constructor(private pickups: PickupsService) {}

  @Post()
  async schedule(
    @Body()
    body: {
      shipmentIds: number[];
      date: string;
      fromTime?: string;
      toTime?: string;
      instructions?: string;
    },
  ) {
    return await this.pickups.schedule(body);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const [p] = await db
      .select()
      .from(PickupsTbl)
      .where(eq(PickupsTbl.id, Number(id)));
    if (!p) return { error: 'not_found' };
    const joined = await db
      .select()
      .from(PS)
      .leftJoin(ShipmentsTbl, eq(PS.shipmentId, ShipmentsTbl.id))
      .where(eq(PS.pickupId, p.id));
    return { pickup: p, shipments: joined.map((j) => j.shipments) };
  }
}
