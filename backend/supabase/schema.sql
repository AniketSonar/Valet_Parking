-- Aura Valet Parking database schema
-- Run this file in Supabase Dashboard -> SQL Editor.
-- The backend uses the service-role key, so these tables can start with
-- RLS disabled while the application authorization remains in the API.

create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  -- Application roles: super_admin, manager, valet, customer.
  role text not null default 'customer',
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  email text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  phone text unique,
  email text unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  license_plate text not null unique,
  make text,
  model text,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parking_floors (
  id uuid primary key default gen_random_uuid(),
  floor_name text not null,
  floor_number integer not null unique,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parking_systems (
  id uuid primary key default gen_random_uuid(),
  floor_id uuid not null references public.parking_floors(id) on delete cascade,
  system_name text not null,
  system_type text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parking_positions (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references public.parking_systems(id) on delete cascade,
  position_code text not null,
  position_name text,
  position_type text not null default 'standard',
  status text not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (system_id, position_code)
);

create table if not exists public.parking_slots (
  id uuid primary key default gen_random_uuid(),
  slot_number text not null unique,
  parking_type text not null,
  status text not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parking_bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  parking_type text not null,
  booking_code text not null unique,
  expected_arrival_at timestamptz not null,
  status text not null default 'booked',
  contact_phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parking_sessions (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  ticket_code text not null unique,
  parking_type text not null,
  status text not null default 'checked_in',
  parking_slot text,
  parking_position_id uuid references public.parking_positions(id) on delete set null,
  valet_id uuid references public.employees(id) on delete set null,
  checked_in_at timestamptz not null default now(),
  parked_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.keys (
  id uuid primary key default gen_random_uuid(),
  key_number text not null unique,
  key_location text,
  status text not null default 'stored',
  assigned_to uuid references public.users(id) on delete set null,
  parking_session_id uuid unique references public.parking_sessions(id) on delete set null,
  notes text,
  assigned_at timestamptz,
  returned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  parking_session_id uuid not null unique references public.parking_sessions(id) on delete restrict,
  parking_charge numeric(12, 2) not null default 0,
  valet_service_charge numeric(12, 2) not null default 0,
  extra_charges numeric(12, 2) not null default 0,
  discount numeric(12, 2) not null default 0,
  gst numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  payment_method text,
  payment_status text not null default 'pending',
  paid_at timestamptz,
  invoice_number text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  parking_session_id uuid references public.parking_sessions(id) on delete cascade,
  recipient_type text not null,
  recipient_id uuid,
  message text not null,
  channel text not null default 'in_app',
  status text not null default 'pending',
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  parking_session_id uuid not null references public.parking_sessions(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (parking_session_id, customer_id)
);

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  parking_session_id uuid references public.parking_sessions(id) on delete cascade,
  reported_by uuid references public.employees(id) on delete set null,
  incident_type text not null,
  description text,
  status text not null default 'open',
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.staff_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  floor_id uuid not null references public.parking_floors(id) on delete cascade,
  system_id uuid references public.parking_systems(id) on delete set null,
  assigned_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists public.vehicle_inspections (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.parking_sessions(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  inspection_stage text not null,
  condition_status text not null,
  damage_description text,
  inspection_notes text,
  inspected_by uuid references public.users(id) on delete set null,
  inspected_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.vehicle_inspection_photos (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.vehicle_inspections(id) on delete cascade,
  photo_path text not null,
  uploaded_by uuid references public.users(id) on delete set null,
  uploaded_at timestamptz not null default now()
);

create index if not exists idx_users_role on public.users(role);
create index if not exists idx_users_active on public.users(is_active);
create index if not exists idx_vehicles_customer on public.vehicles(customer_id);
create index if not exists idx_sessions_vehicle on public.parking_sessions(vehicle_id);
create index if not exists idx_sessions_status on public.parking_sessions(status);
create index if not exists idx_sessions_position on public.parking_sessions(parking_position_id);
create index if not exists idx_bookings_customer on public.parking_bookings(customer_id);
create index if not exists idx_bookings_vehicle on public.parking_bookings(vehicle_id);
create index if not exists idx_bookings_arrival on public.parking_bookings(expected_arrival_at);
create index if not exists idx_notifications_recipient on public.notifications(recipient_id, recipient_type);
create index if not exists idx_incidents_status on public.incidents(status);
create index if not exists idx_inspections_session on public.vehicle_inspections(session_id);
create index if not exists idx_inspection_photos_inspection on public.vehicle_inspection_photos(inspection_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'users',
    'customers',
    'employees',
    'vehicles',
    'parking_floors',
    'parking_systems',
    'parking_positions',
    'parking_slots',
    'parking_bookings',
    'parking_sessions',
    'keys',
    'payments',
    'notifications',
    'incidents'
  ]
  loop
    execute format(
      'drop trigger if exists set_%1$s_updated_at on public.%1$s',
      table_name
    );
    execute format(
      'create trigger set_%1$s_updated_at
       before update on public.%1$s
       for each row execute function public.set_updated_at()',
      table_name
    );
  end loop;
end;
$$;

insert into storage.buckets (id, name, public)
values ('vehicle-inspection-photos', 'vehicle-inspection-photos', true)
on conflict (id) do nothing;
