import { Injectable } from '@nestjs/common';
import { db } from '../db/client';
import { events } from '../db/schema';

@Injectable()
export class EventsService {
  async create(orderId: number, type: string, payload?: string) {
    const inserted = await db
      .insert(events)
      .values({ orderId, type: type as any, payload })
      .returning({ id: events.id });
    return inserted[0];
  }
}
