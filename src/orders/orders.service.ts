import { Injectable } from '@nestjs/common';
import { db } from '../db/client';
import { orders, events } from '../db/schema';
import { EasyPostProvider } from '../shipping/easypost.provider';
import { ShipmentsService } from '../shipments/shipments.service';

@Injectable()
export class OrdersService {
  private provider = new EasyPostProvider();
  constructor(private shipments: ShipmentsService) {}

  async create(order: {
    providerName: string;
    providerCode?: string;
    patientName: string;
    patientEmail: string;
    patientAddress: string;
    barcode?: string;
    labName: string;
    labAddress: string;
    labEmail: string;
  }) {
    const [o] = await db
      .insert(orders)
      .values(order)
      .returning({ id: orders.id });
    await db
      .insert(events)
      .values({ orderId: o.id, type: 'ORDER_SUBMITTED_TO_NESTTEST' as any });

    const outbound = await this.provider.createOutboundLabel(order);
    await this.shipments.upsert({
      orderId: o.id,
      role: 'TO_PATIENT',
      trackingNumber: outbound.tracking,
      labelUrl: outbound.labelUrl,
      providerShipmentId: outbound.providerShipmentId,
    });

    const ret = await this.provider.createReturnLabel(order);
    await this.shipments.upsert({
      orderId: o.id,
      role: 'TO_LAB',
      trackingNumber: ret.tracking,
      labelUrl: ret.labelUrl,
      providerShipmentId: ret.providerShipmentId,
    });

    return { id: o.id };
  }
}
