import 'reflect-metadata';
import { db, pool } from './src/db/client';
import { orders, events } from './src/db/schema';

async function run() {
  const [order] = await db.insert(orders).values({
    providerName: 'Dr. Smith',
    providerCode: 'EMR-001',
    patientName: 'Jane Doe',
    patientEmail: 'jane.doe@example.com',
    patientAddress: '123 Apple St, Springfield, FL, 33101',
    barcode: 'ABC1234567'
  }).returning({ id: orders.id });

  await db.insert(events).values({ orderId: order.id, type: 'ORDER_SUBMITTED_TO_NESTTEST' as any });

  console.log('Seeded order id:', order.id);
}

run().then(() => pool.end());
