import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ShipmentsService } from '../shipments/shipments.service';

@Module({
  providers: [OrdersService, ShipmentsService],
  controllers: [OrdersController],
})
export class OrdersModule {}
