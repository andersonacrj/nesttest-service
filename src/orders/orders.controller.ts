import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private orders: OrdersService) {}
  @Post()
  async create(
    @Body()
    body: {
      providerName: string;
      providerCode?: string;
      patientName: string;
      patientEmail: string;
      patientAddress: string;
      barcode?: string;
      labName: string;
      labAddress: string;
      labEmail: string;
    },
  ) {
    return await this.orders.create(body);
  }
}
