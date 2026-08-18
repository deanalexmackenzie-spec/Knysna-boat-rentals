-- ============================================================================
-- Knysna Boat Rentals — database schema
-- Idempotent: safe to run repeatedly against the same project.
-- Run in Supabase → SQL Editor, or `supabase db execute -f supabase/schema.sql`.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ─── Enums ──────────────────────────────────────────────────────────────────

do $$ begin
  create type booking_status as enum (
    'request',
    'deposit_pending',
    'deposit_paid',
    'docs_received',
    'balance_due',
    'confirmed',
    'completed',
    'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('card', 'eft');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_state as enum ('pending', 'paid', 'failed', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_kind as enum ('deposit', 'balance');
exception when duplicate_object then null; end $$;

do $$ begin
  create type document_type as enum ('id', 'skipper_licence', 'drivers_licence', 'indemnity');
exception when duplicate_object then null; end $$;

do $$ begin
  create type template_key as enum ('received', 'deposit', 'docs', 'confirmed');
exception when duplicate_object then null; end $$;

-- ─── Tables ─────────────────────────────────────────────────────────────────

create table if not exists boats (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  name         text not null,
  description  text not null default '',
  capacity     int  not null default 6,
  power        text not null default '',
  length_m     numeric(4,1) not null default 5.0,
  day_rate     numeric(10,2) not null default 0,
  skipper_rate numeric(10,2) not null default 0,
  photo_paths  text[] not null default '{}',
  sort_order   int not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists blocked_dates (
  id         uuid primary key default gen_random_uuid(),
  boat_id    uuid not null references boats(id) on delete cascade,
  date       date not null,
  reason     text,
  created_at timestamptz not null default now(),
  unique (boat_id, date)
);
create index if not exists blocked_dates_boat_date_idx on blocked_dates (boat_id, date);

create table if not exists customers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text,
  phone      text not null unique,   -- client log is keyed on phone
  notes      text,
  created_at timestamptz not null default now()
);

create table if not exists bookings (
  id               uuid primary key default gen_random_uuid(),
  reference        text unique not null,
  access_token     uuid not null default gen_random_uuid(),  -- customer's private link
  customer_id      uuid not null references customers(id) on delete restrict,
  boat_id          uuid not null references boats(id) on delete restrict,
  date             date not null,
  skipper          boolean not null default false,

  day_rate         numeric(10,2) not null,      -- snapshot at time of request
  skipper_rate     numeric(10,2) not null default 0,
  total_amount     numeric(10,2) not null,
  deposit_amount   numeric(10,2) not null,
  balance_amount   numeric(10,2) not null,

  deposit_method   payment_method not null default 'eft',
  deposit_status   payment_state  not null default 'pending',
  balance_status   payment_state  not null default 'pending',

  indemnity_signed boolean not null default false,
  indemnity_name   text,
  indemnity_signed_at timestamptz,
  indemnity_ip     text,

  status           booking_status not null default 'request',
  notes            text,
  docs_purged_at   timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists bookings_boat_date_idx on bookings (boat_id, date);
create index if not exists bookings_customer_idx on bookings (customer_id);
create index if not exists bookings_status_idx on bookings (status);

-- A boat can only be sold once per day. Cancelled bookings free the date again.
create unique index if not exists bookings_one_live_per_boat_day
  on bookings (boat_id, date)
  where status <> 'cancelled';

create table if not exists documents (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references bookings(id) on delete cascade,
  type        document_type not null,
  file_path   text not null,        -- path inside the private `documents` bucket
  file_name   text,
  uploaded_at timestamptz not null default now(),
  verified    boolean not null default false
);
create index if not exists documents_booking_idx on documents (booking_id);

create table if not exists payments (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references bookings(id) on delete cascade,
  amount      numeric(10,2) not null,
  method      payment_method not null,
  kind        payment_kind not null,
  gateway_ref text,
  status      payment_state not null default 'pending',
  raw         jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists payments_booking_idx on payments (booking_id);
-- Plain (not partial) unique index: Postgres treats NULLs as distinct, so
-- manually recorded payments with no gateway reference are unaffected, and
-- `on conflict (gateway_ref)` in the ITN handler can infer this index.
create unique index if not exists payments_gateway_ref_key
  on payments (gateway_ref);

create table if not exists message_templates (
  key        template_key primary key,
  subject    text not null,
  body       text not null,
  updated_at timestamptz not null default now()
);

create table if not exists message_log (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid references bookings(id) on delete cascade,
  template_key template_key,
  channel      text not null default 'email',
  recipient    text,
  status       text not null default 'sent',
  error        text,
  sent_at      timestamptz not null default now()
);
create index if not exists message_log_booking_idx on message_log (booking_id, template_key);

-- Owner-editable long-form copy (terms, indemnity, banking details, safety notes)
create table if not exists site_content (
  key        text primary key,
  title      text not null default '',
  body       text not null default '',
  updated_at timestamptz not null default now()
);

-- Single-row operational settings
create table if not exists settings (
  id                     boolean primary key default true check (id),
  deposit_percent        int not null default 50,
  doc_retention_days     int not null default 30,
  deposit_reminder_hours int not null default 48,
  docs_reminder_days     int not null default 3,
  updated_at             timestamptz not null default now()
);
insert into settings (id) values (true) on conflict (id) do nothing;

-- ─── updated_at triggers ────────────────────────────────────────────────────

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists bookings_updated_at on bookings;
create trigger bookings_updated_at before update on bookings
  for each row execute function set_updated_at();

drop trigger if exists templates_updated_at on message_templates;
create trigger templates_updated_at before update on message_templates
  for each row execute function set_updated_at();

drop trigger if exists site_content_updated_at on site_content;
create trigger site_content_updated_at before update on site_content
  for each row execute function set_updated_at();

-- ─── Client-log view (derived booking history + lifetime spend) ─────────────

create or replace view customer_summary as
select
  c.id,
  c.name,
  c.email,
  c.phone,
  c.notes,
  c.created_at,
  count(b.id)                                              as booking_count,
  coalesce(sum(
    case when b.deposit_status = 'paid' then b.deposit_amount else 0 end
    + case when b.balance_status = 'paid' then b.balance_amount else 0 end
  ), 0)                                                    as total_paid,
  max(b.date)                                              as last_trip_date
from customers c
left join bookings b on b.customer_id = c.id and b.status <> 'cancelled'
group by c.id;

-- Run the view with the caller's rights so RLS on customers/bookings applies,
-- and take anon off it entirely. Without this the view would hand anonymous
-- callers the whole client log.
alter view customer_summary set (security_invoker = on);
revoke all on customer_summary from anon;

-- ─── Row Level Security ─────────────────────────────────────────────────────
-- Public (anon) may read the fleet and the closed-dates list only. Everything
-- else is owner-only; all writes go through server routes using the service
-- role key, which bypasses RLS.

alter table boats             enable row level security;
alter table blocked_dates     enable row level security;
alter table customers         enable row level security;
alter table bookings          enable row level security;
alter table documents         enable row level security;
alter table payments          enable row level security;
alter table message_templates enable row level security;
alter table message_log       enable row level security;
alter table site_content      enable row level security;
alter table settings          enable row level security;

drop policy if exists "boats public read" on boats;
create policy "boats public read" on boats
  for select to anon, authenticated using (active = true);

drop policy if exists "boats owner all" on boats;
create policy "boats owner all" on boats
  for all to authenticated using (true) with check (true);

drop policy if exists "blocked_dates public read" on blocked_dates;
create policy "blocked_dates public read" on blocked_dates
  for select to anon, authenticated using (true);

drop policy if exists "blocked_dates owner all" on blocked_dates;
create policy "blocked_dates owner all" on blocked_dates
  for all to authenticated using (true) with check (true);

drop policy if exists "site_content public read" on site_content;
create policy "site_content public read" on site_content
  for select to anon, authenticated using (true);

drop policy if exists "site_content owner write" on site_content;
create policy "site_content owner write" on site_content
  for all to authenticated using (true) with check (true);

-- Booked dates must be visible to the public calendar without leaking customer
-- data. This security-definer function returns dates only.
create or replace function public_booked_dates(p_boat_id uuid)
returns table (date date)
language sql security definer set search_path = public as $$
  select b.date from bookings b
  where b.boat_id = p_boat_id and b.status <> 'cancelled'
$$;
grant execute on function public_booked_dates(uuid) to anon, authenticated;

-- Owner-only tables: authenticated (the owner logs in via Supabase Auth) gets
-- full access; anon gets nothing.
do $$
declare t text;
begin
  foreach t in array array['customers','bookings','documents','payments','message_templates','message_log','settings']
  loop
    execute format('drop policy if exists "owner all" on %I', t);
    execute format('create policy "owner all" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ─── Storage buckets ────────────────────────────────────────────────────────
-- `boat-photos` is public-read (marketing images).
-- `documents` is private; access only via signed URLs minted server-side.

insert into storage.buckets (id, name, public)
values ('boat-photos', 'boat-photos', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do update set public = false;

drop policy if exists "boat photos public read" on storage.objects;
create policy "boat photos public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'boat-photos');

drop policy if exists "boat photos owner write" on storage.objects;
create policy "boat photos owner write" on storage.objects
  for all to authenticated using (bucket_id = 'boat-photos') with check (bucket_id = 'boat-photos');

drop policy if exists "documents owner only" on storage.objects;
create policy "documents owner only" on storage.objects
  for all to authenticated using (bucket_id = 'documents') with check (bucket_id = 'documents');
