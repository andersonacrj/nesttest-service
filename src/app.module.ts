import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationModule } from './notifications/notification.module';
import { ConfigModule } from '@nestjs/config';
import { cfg } from './config/config';
import { OrdersModule } from './orders/orders.module';
import { EventsController } from './events/events.controller';
import { EasyPostWebhookController } from './webhooks/easypost.controller';
import { PickupsController } from './pickups/pickups.controller';
import { EventsService } from './events/events.service';
import { PickupsService } from './pickups/pickups.service';

@Module({
  // imports: [NotificationModule,
  //    //OrdersModule,
  //    ScheduleModule.forRoot()],
  imports: [
    ConfigModule.forRoot({
      load: [cfg],
      isGlobal: true,
    }),
    NotificationModule,
   // OrdersModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [EventsController, EasyPostWebhookController, PickupsController],
   providers: [EventsService, PickupsService],
})
export class AppModule {}
