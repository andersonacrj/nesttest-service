import { db } from '../db/client';
import { notifications } from '../db/schema';
import { and, eq } from 'drizzle-orm';

export async function alreadyNotified(
  eventId: number,
  channel: 'email' | 'slack' | 'whatsapp',
) {
  const rows = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.eventId, eventId),
        eq(notifications.channel, channel),
      ),
    )
    .limit(1);
  return rows.length > 0;
}
