-- ==========================================================
--  NestTest - Supabase DB Bootstrap (PostgreSQL)
--  Tabelas, tipos, índices, RLS e seeds opcionais
-- ==========================================================

-- -----------------------------
-- 1) EXTENSÕES (opcionais)
-- -----------------------------
-- Habilite se precisar gerar UUIDs etc. (opcional)
-- create extension if not exists "uuid-ossp";

-- -----------------------------
-- 2) TYPES (ENUMS)
-- -----------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'event_type') then
    create type event_type as enum (
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
      'LAB_NOTIFIED'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'shipment_role') then
    create type shipment_role as enum ('TO_PATIENT', 'TO_LAB');
  end if;

  if not exists (select 1 from pg_type where typname = 'carrier_type') then
    create type carrier_type as enum ('USPS');
  end if;

  if not exists (select 1 from pg_type where typname = 'shipment_status') then
    create type shipment_status as enum ('CREATED', 'IN_TRANSIT', 'DELIVERED', 'EXCEPTION', 'UNKNOWN');
  end if;

  if not exists (select 1 from pg_type where typname = 'pickup_status') then
    create type pickup_status as enum ('SCHEDULED', 'PURCHASED', 'CANCELLED', 'COMPLETED', 'FAILED');
  end if;
end$$;

-- -----------------------------
-- 3) TABELAS
-- -----------------------------

-- ORDERS
create table if not exists public.orders (
  id               bigserial primary key,
  provider_name    varchar(256) not null,
  provider_code    varchar(128),
  patient_name     varchar(256) not null,
  patient_email    varchar(320) not null,
  patient_address  text,
  barcode          varchar(128),
  created_at       timestamptz default now()
);
create index if not exists idx_orders_created_at on public.orders(created_at desc);
create index if not exists idx_orders_patient_email on public.orders(patient_email);
comment on table public.orders is 'Orders placed by providers for patients (kit outbound + return).';

-- EVENTS (business-domain events that trigger notifications)
create table if not exists public.events (
  id          bigserial primary key,
  order_id    bigint not null references public.orders(id) on delete cascade,
  type        event_type not null,
  payload     text,
  created_at  timestamptz default now(),
  processed   boolean default false
);
create index if not exists idx_events_order_id on public.events(order_id);
create index if not exists idx_events_type on public.events(type);
create index if not exists idx_events_created_at on public.events(created_at desc);
comment on table public.events is 'Domain events; notifications use this as input.';

-- NOTIFICATIONS (audit of sent messages via email/slack)
create table if not exists public.notifications (
  id                   bigserial primary key,
  event_id             bigint not null references public.events(id) on delete cascade,
  channel              varchar(32) not null, -- 'email' | 'slack' (livre)
  status               varchar(32) not null, -- 'sent' | 'failed'
  provider_message_id  varchar(256),
  error                text,
  created_at           timestamptz default now()
);
create index if not exists idx_notifications_event_id on public.notifications(event_id);
create index if not exists idx_notifications_channel on public.notifications(channel);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);

-- SHIPMENTS (2 por pedido: TO_PATIENT e TO_LAB)
create table if not exists public.shipments (
  id                    bigserial primary key,
  order_id              bigint not null references public.orders(id) on delete cascade,
  role                  shipment_role not null,
  carrier               carrier_type not null default 'USPS',
  tracking_number       varchar(64) not null,
  status                shipment_status not null default 'CREATED',
  last_event            text,
  last_checkpoint_at    timestamptz,
  label_url             text,
  return_label_url      text,
  label_broker_qr_url   text,
  provider_shipment_id  varchar(128), -- shipment id do EasyPost (ex.: "shp_...")
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);
-- Regra: um shipment por (order_id, role)
create unique index if not exists uq_shipments_order_role on public.shipments(order_id, role);
create index if not exists idx_shipments_order_id on public.shipments(order_id);
create index if not exists idx_shipments_tracking on public.shipments(tracking_number);
create index if not exists idx_shipments_status on public.shipments(status);
create index if not exists idx_shipments_updated_at on public.shipments(updated_at desc);

-- SHIPMENT EVENTS (histórico de tracking)
create table if not exists public.shipment_events (
  id           bigserial primary key,
  shipment_id  bigint not null references public.shipments(id) on delete cascade,
  status       shipment_status not null,
  description  text,
  location     text,
  raw          jsonb,
  event_time   timestamptz,
  created_at   timestamptz default now()
);
create index if not exists idx_shipment_events_shipment_id on public.shipment_events(shipment_id);
create index if not exists idx_shipment_events_time on public.shipment_events(event_time desc);

-- PICKUPS (coletas agendadas USPS via EasyPost)
create table if not exists public.pickups (
  id                  bigserial primary key,
  easypost_pickup_id  varchar(128),
  status              pickup_status not null default 'SCHEDULED',
  confirmation_code   varchar(128),
  instructions        text,
  min_datetime        timestamptz not null,
  max_datetime        timestamptz not null,
  address_json        jsonb not null,
  created_at          timestamptz default now(),
  constraint ck_pickups_window check (min_datetime < max_datetime)
);
create index if not exists idx_pickups_status on public.pickups(status);
create index if not exists idx_pickups_window on public.pickups(min_datetime, max_datetime);

-- PICKUP_SHIPMENTS (join N:N entre pickup e shipments)
create table if not exists public.pickup_shipments (
  id           bigserial primary key,
  pickup_id    bigint not null references public.pickups(id) on delete cascade,
  shipment_id  bigint not null references public.shipments(id) on delete restrict
);
create unique index if not exists uq_pickup_shipments on public.pickup_shipments(pickup_id, shipment_id);
create index if not exists idx_pickup_shipments_pickup on public.pickup_shipments(pickup_id);
create index if not exists idx_pickup_shipments_shipment on public.pickup_shipments(shipment_id);

-- -----------------------------
-- 4) TRIGGERS (updated_at)
-- -----------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $fn$
begin
  new.updated_at := now();
  return new;
end
$fn$;

drop trigger if exists trg_shipments_set_updated_at on public.shipments;
create trigger trg_shipments_set_updated_at
before update on public.shipments
for each row
execute procedure public.set_updated_at();

-- -----------------------------
-- 5) RLS (Row Level Security)
-- -----------------------------
-- Supabase recomenda habilitar RLS e criar políticas.
-- O backend usa o SERVICE_ROLE_KEY (bypass total),
-- e para tokens de usuário (JWT) usamos a claim "app_role" ('admin' | 'viewer').

-- Habilitar RLS em todas as tabelas
alter table public.orders            enable row level security;
alter table public.events            enable row level security;
alter table public.notifications     enable row level security;
alter table public.shipments         enable row level security;
alter table public.shipment_events   enable row level security;
alter table public.pickups           enable row level security;
alter table public.pickup_shipments  enable row level security;

-- Helper: expressão para extrair claim 'app_role'
-- Em Supabase, pode-se usar: (auth.jwt() ->> 'app_role')
-- Fallback seguro: coalesce
-- Exemplo simples inline nas policies.

-- POLICIES
-- Observação:
-- - service_role SEMPRE ignora RLS.
-- - Para usuários normais (auth), exigimos:
--    * VIEWER: SELECT
--    * ADMIN:  SELECT + INSERT/UPDATE/DELETE

-- ORDERS
drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders
  for select using (
    coalesce((auth.jwt() ->> 'app_role'),'viewer') in ('viewer','admin')
  );

drop policy if exists orders_mutation on public.orders;
create policy orders_mutation on public.orders
  for all using (
    coalesce((auth.jwt() ->> 'app_role'),'viewer') = 'admin'
  )
  with check (
    coalesce((auth.jwt() ->> 'app_role'),'viewer') = 'admin'
  );

-- EVENTS
drop policy if exists events_select on public.events;
create policy events_select on public.events
  for select using (
    coalesce((auth.jwt() ->> 'app_role'),'viewer') in ('viewer','admin')
  );

drop policy if exists events_mutation on public.events;
create policy events_mutation on public.events
  for all using (
    coalesce((auth.jwt() ->> 'app_role'),'viewer') = 'admin'
  )
  with check (
    coalesce((auth.jwt() ->> 'app_role'),'viewer') = 'admin'
  );

-- NOTIFICATIONS (somente leitura p/ viewer; admin total)
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select using (
    coalesce((auth.jwt() ->> 'app_role'),'viewer') in ('viewer','admin')
  );

drop policy if exists notifications_mutation on public.notifications;
create policy notifications_mutation on public.notifications
  for all using (
    coalesce((auth.jwt() ->> 'app_role'),'viewer') = 'admin'
  )
  with check (
    coalesce((auth.jwt() ->> 'app_role'),'viewer') = 'admin'
  );

-- SHIPMENTS
drop policy if exists shipments_select on public.shipments;
create policy shipments_select on public.shipments
  for select using (
    coalesce((auth.jwt() ->> 'app_role'),'viewer') in ('viewer','admin')
  );

drop policy if exists shipments_mutation on public.shipments;
create policy shipments_mutation on public.shipments
  for all using (
    coalesce((auth.jwt() ->> 'app_role'),'viewer') = 'admin'
  )
  with check (
    coalesce((auth.jwt() ->> 'app_role'),'viewer') = 'admin'
  );

-- SHIPMENT_EVENTS (somente leitura p/ viewer; admin total)
drop policy if exists shipment_events_select on public.shipment_events;
create policy shipment_events_select on public.shipment_events
  for select using (
    coalesce((auth.jwt() ->> 'app_role'),'viewer') in ('viewer','admin')
  );

drop policy if exists shipment_events_mutation on public.shipment_events;
create policy shipment_events_mutation on public.shipment_events
  for all using (
    coalesce((auth.jwt() ->> 'app_role'),'viewer') = 'admin'
  )
  with check (
    coalesce((auth.jwt() ->> 'app_role'),'viewer') = 'admin'
  );

-- PICKUPS
drop policy if exists pickups_select on public.pickups;
create policy pickups_select on public.pickups
  for select using (
    coalesce((auth.jwt() ->> 'app_role'),'viewer') in ('viewer','admin')
  );

drop policy if exists pickups_mutation on public.pickups;
create policy pickups_mutation on public.pickups
  for all using (
    coalesce((auth.jwt() ->> 'app_role'),'viewer') = 'admin'
  )
  with check (
    coalesce((auth.jwt() ->> 'app_role'),'viewer') = 'admin'
  );

-- PICKUP_SHIPMENTS
drop policy if exists pickup_shipments_select on public.pickup_shipments;
create policy pickup_shipments_select on public.pickup_shipments
  for select using (
    coalesce((auth.jwt() ->> 'app_role'),'viewer') in ('viewer','admin')
  );

drop policy if exists pickup_shipments_mutation on public.pickup_shipments;
create policy pickup_shipments_mutation on public.pickup_shipments
  for all using (
    coalesce((auth.jwt() ->> 'app_role'),'viewer') = 'admin'
  )
  with check (
    coalesce((auth.jwt() ->> 'app_role'),'viewer') = 'admin'
  );

-- -----------------------------
-- 6) SEEDS (opcionais)
-- -----------------------------
-- Comente esta seção se não quiser dados de teste.

-- Pedido de exemplo
insert into public.orders (provider_name, provider_code, patient_name, patient_email, patient_address, barcode, lab_address, lab_name, lab_email)
values ('Dr. Smith', 'EMR-001', 'Jane Doe', 'jane.doe@example.com', '123 Apple St, Springfield, FL, 33101', 'ABC1234567', '456 Lab Rd, Miami, FL, 33101', 'LabCorp', 'labcorp@example.com')
returning id;

-- Evento inicial (order submitted)
insert into public.events (order_id, type, payload)
select id, 'ORDER_SUBMITTED_TO_NESTTEST', null from public.orders order by id desc limit 1;

-- Shipments “placeholder” (preenchidos posteriormente pelo serviço ao comprar labels)
-- Exemplo fictício de tracking
insert into public.shipments (order_id, role, carrier, tracking_number, status)
select id, 'TO_PATIENT', 'USPS', '9400111899223857461234', 'CREATED' from public.orders order by id desc limit 1;
insert into public.shipments (order_id, role, carrier, tracking_number, status)
select id, 'TO_LAB', 'USPS', '9400111899223857465678', 'CREATED' from public.orders order by id desc limit 1;

-- Pickup de exemplo (janela hoje 15–18h)
insert into public.pickups (easypost_pickup_id, status, confirmation_code, instructions, min_datetime, max_datetime, address_json)
values (
  null,
  'SCHEDULED',
  null,
  'Back door - ring bell',
  now()::date + time '15:00',
  now()::date + time '18:00',
  jsonb_build_object(
    'name','NestTest Fulfillment',
    'street1','123 Warehouse Ave',
    'city','Miami','state','FL','zip','33101','phone','3051234567'
  )
)
returning id;

-- Vincular shipments criados ao pickup de exemplo
insert into public.pickup_shipments (pickup_id, shipment_id)
select p.id, s.id
from public.pickups p
join public.shipments s on true
where p.id = (select max(id) from public.pickups)
  and s.order_id = (select max(id) from public.orders);

-- -----------------------------
-- 7) VIEWS (opcionais)
-- -----------------------------
-- Visão simples de status por pedido
create or replace view public.order_overview as
select
  o.id as order_id,
  o.created_at as order_created_at,
  o.provider_name,
  o.patient_name,
  o.patient_email,
  max(case when s.role = 'TO_PATIENT' then s.tracking_number end) as tracking_to_patient,
  max(case when s.role = 'TO_LAB' then s.tracking_number end) as tracking_to_lab,
  max(case when s.role = 'TO_PATIENT' then s.status end) as status_to_patient,
  max(case when s.role = 'TO_LAB' then s.status end) as status_to_lab,
  (select e.type from public.events e where e.order_id = o.id order by e.created_at desc limit 1) as last_event
from public.orders o
left join public.shipments s on s.order_id = o.id
group by o.id, o.created_at, o.provider_name, o.patient_name, o.patient_email;

-- RLS para a view (somente select)
alter view public.order_overview owner to postgres;
grant select on public.order_overview to anon, authenticated, service_role;

-- ==========================================================
-- FIM
-- ==========================================================
