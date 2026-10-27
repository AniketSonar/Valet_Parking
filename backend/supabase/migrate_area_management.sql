-- ============================================================================
-- Area management: buildings -> floors -> manager assignment -> zones/map ->
-- gates (entry/exit) -> valet posts (front/back...) -> valet assignments.
-- Run once in Supabase Dashboard -> SQL Editor (after schema.sql).
-- Safe to re-run.
-- ============================================================================

-- 1. Buildings -------------------------------------------------------------
create table if not exists public.parking_buildings (
  id uuid primary key default gen_random_uuid(),
  building_name text not null unique,
  address text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Floors belong to a building ---------------------------------------------
alter table public.parking_floors
  add column if not exists building_id uuid references public.parking_buildings(id) on delete set null;

-- floor_number was globally unique; it must only be unique inside a building.
alter table public.parking_floors drop constraint if exists parking_floors_floor_number_key;
create unique index if not exists uq_floor_number_per_building
  on public.parking_floors (coalesce(building_id, '00000000-0000-0000-0000-000000000000'::uuid), floor_number);

-- 3. Super admin -> manager area assignment ---------------------------------
create table if not exists public.manager_assignments (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid not null references public.users(id) on delete cascade,
  floor_id uuid not null references public.parking_floors(id) on delete cascade,
  assigned_by uuid references public.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  is_active boolean not null default true
);
-- one active manager per floor; a manager can hold several floors
create unique index if not exists uq_active_manager_per_floor
  on public.manager_assignments (floor_id) where is_active;
create index if not exists idx_manager_assignments_manager
  on public.manager_assignments (manager_id) where is_active;

-- 4. Zones: the areas a manager creates and maps inside an assigned floor ----
create table if not exists public.parking_zones (
  id uuid primary key default gen_random_uuid(),
  floor_id uuid not null references public.parking_floors(id) on delete cascade,
  zone_name text not null,
  zone_code text not null,
  map_rows integer not null default 4 check (map_rows between 1 and 40),
  map_cols integer not null default 6 check (map_cols between 1 and 40),
  status text not null default 'active',
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (floor_id, zone_code)
);

-- 5. Slots are placed on a floor / zone / map cell ---------------------------
alter table public.parking_slots
  add column if not exists floor_id uuid references public.parking_floors(id) on delete set null,
  add column if not exists zone_id uuid references public.parking_zones(id) on delete set null,
  add column if not exists map_row integer,
  add column if not exists map_col integer,
  add column if not exists created_by uuid references public.users(id) on delete set null;
create index if not exists idx_slots_floor on public.parking_slots (floor_id);
create index if not exists idx_slots_zone on public.parking_slots (zone_id);
create unique index if not exists uq_slot_map_cell
  on public.parking_slots (zone_id, map_row, map_col) where zone_id is not null and map_row is not null;

-- 6. Gates: entry / exit points of a floor (optionally of a zone) -------------
create table if not exists public.parking_gates (
  id uuid primary key default gen_random_uuid(),
  floor_id uuid not null references public.parking_floors(id) on delete cascade,
  zone_id uuid references public.parking_zones(id) on delete set null,
  gate_name text not null,
  gate_type text not null default 'entry_exit' check (gate_type in ('entry','exit','entry_exit')),
  side text not null default 'front' check (side in ('front','back','left','right')),
  status text not null default 'active',
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (floor_id, gate_name)
);

-- 7. Valet posts: "Front gate - 2 valets", "Back gate - 2 valets" ------------
create table if not exists public.valet_posts (
  id uuid primary key default gen_random_uuid(),
  floor_id uuid not null references public.parking_floors(id) on delete cascade,
  gate_id uuid references public.parking_gates(id) on delete set null,
  post_name text not null,
  capacity integer not null default 1 check (capacity between 1 and 50),
  status text not null default 'active',
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (floor_id, post_name)
);

-- 8. Valet -> post assignment (valets are identified by employees.id) --------
create table if not exists public.valet_assignments (
  id uuid primary key default gen_random_uuid(),
  valet_id uuid not null references public.employees(id) on delete cascade,
  post_id uuid not null references public.valet_posts(id) on delete cascade,
  floor_id uuid not null references public.parking_floors(id) on delete cascade,
  assigned_by uuid references public.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  is_active boolean not null default true
);
-- a valet stands at one post at a time
create unique index if not exists uq_active_post_per_valet
  on public.valet_assignments (valet_id) where is_active;
create index if not exists idx_valet_assignments_post
  on public.valet_assignments (post_id) where is_active;

-- 9. updated_at triggers ------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['parking_buildings','parking_zones','parking_gates','valet_posts']
  loop
    execute format('drop trigger if exists set_%1$s_updated_at on public.%1$s', t);
    execute format('create trigger set_%1$s_updated_at before update on public.%1$s
                    for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- NOTE: slots created before this migration have floor_id = null. Managers do not
-- see them; the super admin can move them onto a floor from Areas & Managers.
