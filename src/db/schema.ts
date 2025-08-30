import {
  pgTable,
  serial,
  varchar,
  timestamp,
  boolean,
  integer,
  pgEnum,
  text,
  jsonb,
} from 'drizzle-orm/pg-core';

export const eventTypeEnum = pgEnum('event_type', [
  'ORDER_SUBMITTED_TO_NESTTEST',
  'ORDER_SHIPPED_TO_PATIENT',
  'ORDER_RECEIVED_BY_PATIENT',
  'PROCTORED_TEST_ADMINISTERED',
  'PROCTORED_TEST_NOT_ADMINISTERED_36H',
  'PATIENT_SHIPS_TEST_TO_LAB',
  'LAB_RECEIVES_SAMPLE',
  'LAB_TESTS_SAMPLE',
  'LAB_REPORTS_OUT',
  'PROVIDER_NOTIFIED',
  'PATIENT_NOTIFIED',
  'NESTTEST_NOTIFIED',
  'LAB_NOTIFIED',
]);

export const shipmentRoleEnum = pgEnum('shipment_role', [
  'TO_PATIENT',
  'TO_LAB',
]);
export const carrierTypeEnum = pgEnum('carrier_type', ['USPS']);
export const shipmentStatusEnum = pgEnum('shipment_status', [
  'CREATED',
  'IN_TRANSIT',
  'DELIVERED',
  'EXCEPTION',
  'UNKNOWN',
]);

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  providerName: varchar('provider_name', { length: 256 }).notNull(),
  providerCode: varchar('provider_code', { length: 128 }),
  patientName: varchar('patient_name', { length: 256 }).notNull(),
  patientEmail: varchar('patient_email', { length: 320 }).notNull(),
  patientAddress: text('patient_address'),
  barcode: varchar('barcode', { length: 128 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .references(() => orders.id)
    .notNull(),
  type: eventTypeEnum('type').notNull(),
  payload: text('payload'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  processed: boolean('processed').default(false),
});

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id')
    .references(() => events.id)
    .notNull(),
  channel: varchar('channel', { length: 32 }).notNull(),
  status: varchar('status', { length: 32 }).notNull(),
  providerMessageId: varchar('provider_message_id', { length: 256 }),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const shipments = pgTable('shipments', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .references(() => orders.id)
    .notNull(),
  role: shipmentRoleEnum('role').notNull(),
  carrier: carrierTypeEnum('carrier').notNull().default('USPS'),
  trackingNumber: varchar('tracking_number', { length: 64 }).notNull(),
  status: shipmentStatusEnum('status').notNull().default('CREATED'),
  lastEvent: text('last_event'),
  lastCheckpointAt: timestamp('last_checkpoint_at', { withTimezone: true }),
  labelUrl: text('label_url'),
  returnLabelUrl: text('return_label_url'),
  labelBrokerQrUrl: text('label_broker_qr_url'),
  providerShipmentId: varchar('provider_shipment_id', { length: 128 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const shipmentEvents = pgTable('shipment_events', {
  id: serial('id').primaryKey(),
  shipmentId: integer('shipment_id')
    .references(() => shipments.id)
    .notNull(),
  status: shipmentStatusEnum('status').notNull(),
  description: text('description'),
  location: text('location'),
  raw: jsonb('raw'),
  eventTime: timestamp('event_time', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const pickupStatusEnum = pgEnum('pickup_status', [
  'SCHEDULED',
  'PURCHASED',
  'CANCELLED',
  'COMPLETED',
  'FAILED',
]);
export const pickups = pgTable('pickups', {
  id: serial('id').primaryKey(),
  easypostPickupId: varchar('easypost_pickup_id', { length: 128 }),
  status: pickupStatusEnum('status').notNull().default('SCHEDULED'),
  confirmationCode: varchar('confirmation_code', { length: 128 }),
  instructions: text('instructions'),
  minDatetime: timestamp('min_datetime', { withTimezone: true }).notNull(),
  maxDatetime: timestamp('max_datetime', { withTimezone: true }).notNull(),
  addressJson: jsonb('address_json').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const pickupShipments = pgTable('pickup_shipments', {
  id: serial('id').primaryKey(),
  pickupId: integer('pickup_id')
    .references(() => pickups.id)
    .notNull(),
  shipmentId: integer('shipment_id')
    .references(() => shipments.id)
    .notNull(),
});
