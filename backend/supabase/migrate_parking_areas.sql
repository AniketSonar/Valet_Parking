-- ============================================================================
-- Parking areas: the super admin creates a block of slots for a manager's floor.
--   e.g. Block A, slots 1 to 50  ->  A-01 ... A-50
-- The manager no longer maps slots on a grid (Area Map removed).
-- Run once in Supabase Dashboard -> SQL Editor (after migrate_area_management.sql).
-- Safe to re-run. Existing zone/map columns are left in place so no data is lost;
-- the application simply stops using them.
-- ============================================================================

create table if not exists public.parking_areas (
  id uuid primary key default gen_random_uuid(),
  floor_id uuid not null references public.parking_floors(id) on delete cascade,
  block_code text not null,
  start_number integer not null check (start_number >= 1),
  end_number integer not null check (end_number >= start_number),
  parking_type text not null default 'car',
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_parking_areas_floor on public.parking_areas (floor_id);

alter table public.parking_slots
  add column if not exists area_id uuid references public.parking_areas(id) on delete set null;
create index if not exists idx_slots_area on public.parking_slots (area_id);

drop trigger if exists set_parking_areas_updated_at on public.parking_areas;
create trigger set_parking_areas_updated_at
  before update on public.parking_areas
  for each row execute function public.set_updated_at();

-- Valet auto-assignment looks at each valet's open work; these keep it quick.
create index if not exists idx_sessions_valet_status on public.parking_sessions (valet_id, status);
