import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { EventsService } from './events.service';
import { NotificationService } from '../notifications/notification.service';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { CreateEventDto } from './dto/event.dto';

@ApiTags('Events')
@ApiBearerAuth('access-token')
@Controller('events')
export class EventsController {
  constructor(
    private events: EventsService,
    private notifier: NotificationService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new event and trigger notifications' })
  @ApiBody({ type: CreateEventDto })
  @ApiOkResponse({ schema: { example: { id: 123 } } })
  async post(@Body() body: CreateEventDto) {
    const { id } = await this.events.create(
      body.orderId,
      body.type,
      body.payload,
    );
     await this.notifier.processEvent(id);
    return { id };
  }

   @Get()
  @ApiOperation({ summary: 'Retrieve all events with optional filtering' })
  @ApiQuery({ name: 'orderId', required: false, type: Number, description: 'Filter by order ID' })
  @ApiQuery({ name: 'type', required: false, type: String, description: 'Filter by event type' })
  @ApiOkResponse({ 
    schema: { 
      example: {
        version: '1.0.0',
        status: 'SUCCESS',
        data: [
          {
            id: 1,
            orderId: 123,
            type: 'ORDER_CREATED',
            payload: '{"customerId": 456}',
            createdAt: '2023-12-01T10:00:00Z'
          }
        ],
        count: 1
      }
    }
  })
  async findAll(
    @Query('orderId') orderId?: string,
    @Query('type') type?: string,
  ) {
    const orderIdNum = orderId ? parseInt(orderId, 10) : undefined;
    const events = await this.events.findAll(orderIdNum, type);
    
    return {
      version: '1.0.0',
      status: 'SUCCESS',
      data: events,
      count: events.length
    };
  }
}
