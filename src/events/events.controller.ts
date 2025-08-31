import { Body, Controller, Post } from '@nestjs/common';
import { EventsService } from './events.service';
import { NotificationService } from '../notifications/notification.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(
    private events: EventsService,
    private notifier: NotificationService,
  ) {}

  @Post()
  async post(
    @Body() body: { orderId: number; type: string; payload?: string },
  ) {
    const { id } = await this.events.create(
      body.orderId,
      body.type,
      body.payload,
    );
    await this.notifier.processEvent(id);
    return { id };
  }
}
