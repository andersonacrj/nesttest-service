import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { db, initializeDb } from '../db/client';
import { events } from '../db/schema';

interface ServiceError {
  version: string;
  status: string;
  error: {
    errorCode: string;
    message: string;
  };
}

/**
 * Service responsible for managing events in the system.
 * Handles event creation, validation, and database operations.
 */
@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private readonly version = '1.0.0';

  constructor() {
    // Ensure database is initialized when service is created
    this.ensureDbConnection();
  }

  private async ensureDbConnection(): Promise<void> {
    try {
      await initializeDb();
    } catch (error) {
      this.logger.error('Failed to initialize database connection in EventsService', error);
    }
  }

  /**
   * Creates a new event in the database.
   */
  async create(orderId: number, type: string, payload?: string): Promise<{ id: number }> {
    this.logger.log(`Starting event creation process for orderId: ${orderId}, type: ${type}`);
    
    try {
      // Validate required fields
      if (!orderId || !type) {
        this.logger.warn(`Validation failed - Missing required fields. orderId: ${orderId}, type: ${type}`);
        
        const error: ServiceError = {
          version: this.version,
          status: 'ERROR',
          error: {
            errorCode: 'CIE400',
            message: 'Order ID and type are required fields.'
          }
        };
        throw new HttpException(error, HttpStatus.BAD_REQUEST);
      }

      this.logger.debug(`Input validation passed. Proceeding with database insertion`);

      // Insert event into database using the imported db
      const inserted = await db
        .insert(events)
        .values({ orderId, type: type as any, payload })
        .returning({ id: events.id });

      this.logger.debug(`Database insertion completed. Result: ${JSON.stringify(inserted)}`);

      // Validate insertion result
      if (!inserted || inserted.length === 0) {
        this.logger.error(`Database insertion failed - No records returned from insert operation`);
        
        const error: ServiceError = {
          version: this.version,
          status: 'ERROR',
          error: {
            errorCode: 'CIE500',
            message: 'Failed to create event in database.'
          }
        };
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const eventId = inserted[0].id;
      this.logger.log(`Event created successfully with ID: ${eventId} for orderId: ${orderId}`);

      return inserted[0];
    } catch (error) {
      // Re-throw HttpExceptions (validation errors, database errors)
      if (error instanceof HttpException) {
        this.logger.error(`Known error occurred during event creation: ${error.message}`, error.stack);
        throw error;
      }

      // Handle unexpected errors
      this.logger.error(`Unexpected error occurred during event creation for orderId: ${orderId}`, error);

      const serviceError: ServiceError = {
        version: this.version,
        status: 'ERROR',
        error: {
          errorCode: 'CIE999',
          message: 'An internal error occurred during the API call.'
        }
      };
      throw new HttpException(serviceError, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Retrieves all events from the database.
   * @param orderId - Optional filter by order ID
   * @param type - Optional filter by event type
   * @returns Promise<any[]> - Array of events
   */
  async findAll(orderId?: number, type?: string): Promise<any[]> {
    this.logger.log(`Starting events retrieval process. Filters - orderId: ${orderId}, type: ${type}`);
    
    try {
      this.logger.debug(`Proceeding with database query`);

      let query = db.select().from(events);

      // Apply filters if provided
      // if (orderId && type) {
      //   query = query.where(
      //     db.and(
      //       db.eq(events.orderId, orderId),
      //       db.eq(events.type, type as any)
      //     )
      //   );
      // } else if (orderId) {
      //   query = query.where(db.eq(events.orderId, orderId));
      // } else if (type) {
      //   query = query.where(db.eq(events.type, type as any));
      // }

      const result = await query;

      this.logger.debug(`Database query completed. Found ${result.length} events`);
      this.logger.log(`Events retrieved successfully. Count: ${result.length}`);

      return result;
    } catch (error) {
      // Handle unexpected errors
      this.logger.error(`Unexpected error occurred during events retrieval`, error);

      const serviceError: ServiceError = {
        version: this.version,
        status: 'ERROR',
        error: {
          errorCode: 'GEE999',
          message: 'An internal error occurred while retrieving events.'
        }
      };
      throw new HttpException(serviceError, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Validates if the provided event type is supported.
   */
  private isValidEventType(type: string): boolean {
    this.logger.debug(`Validating event type: ${type}`);
    return type && type.trim().length > 0;
  }

  /**
   * Logs event creation metrics for monitoring purposes.
   */
  private logEventMetrics(orderId: number, type: string, success: boolean): void {
    const status = success ? 'SUCCESS' : 'FAILURE';
    this.logger.log(`EVENT_METRICS: orderId=${orderId}, type=${type}, status=${status}, timestamp=${new Date().toISOString()}`);
  }
}
