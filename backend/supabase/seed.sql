-- =========================================================================
-- Aura Valet Parking - Seed SQL Script
-- Run this in Supabase Dashboard -> SQL Editor after running schema.sql
-- =========================================================================

-- Note: In Supabase, auth.users passwords must be hashed using pgcrypto extension.
-- Default password for all seeded users below is: Password123!

create extension if not exists "pgcrypto";

do $$
declare
  super_admin_id uuid := gen_random_uuid();
  parking_admin_id uuid := gen_random_uuid();
  security_id uuid := gen_random_uuid();
  valet_id uuid := gen_random_uuid();
  customer_id uuid := gen_random_uuid();
  hashed_pwd text := crypt('Password123!', gen_salt('bf'));
begin

  -- 1. Create or update auth.users
  -- Super Admin
  if not exists (select 1 from auth.users where email = 'superadmin@valet.com') then
    insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at)
    values (super_admin_id, '00000000-0000-0000-0000-000000000000', 'superadmin@valet.com', hashed_pwd, now(), 'authenticated', 'authenticated', now(), now());
  else
    select id into super_admin_id from auth.users where email = 'superadmin@valet.com';
  end if;

  -- Parking Admin
  if not exists (select 1 from auth.users where email = 'parkingadmin@valet.com') then
    insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at)
    values (parking_admin_id, '00000000-0000-0000-0000-000000000000', 'parkingadmin@valet.com', hashed_pwd, now(), 'authenticated', 'authenticated', now(), now());
  else
    select id into parking_admin_id from auth.users where email = 'parkingadmin@valet.com';
  end if;

  -- Valet (security and valet operations use one login)
  if not exists (select 1 from auth.users where email = 'security@valet.com') then
    insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at)
    values (security_id, '00000000-0000-0000-0000-000000000000', 'security@valet.com', hashed_pwd, now(), 'authenticated', 'authenticated', now(), now());
  else
    select id into security_id from auth.users where email = 'security@valet.com';
  end if;

  -- Valet
  if not exists (select 1 from auth.users where email = 'valet@valet.com') then
    insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at)
    values (valet_id, '00000000-0000-0000-0000-000000000000', 'valet@valet.com', hashed_pwd, now(), 'authenticated', 'authenticated', now(), now());
  else
    select id into valet_id from auth.users where email = 'valet@valet.com';
  end if;

  -- Customer
  if not exists (select 1 from auth.users where email = 'customer@valet.com') then
    insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at)
    values (customer_id, '00000000-0000-0000-0000-000000000000', 'customer@valet.com', hashed_pwd, now(), 'authenticated', 'authenticated', now(), now());
  else
    select id into customer_id from auth.users where email = 'customer@valet.com';
  end if;

  -- 2. Populate public.users
  insert into public.users (auth_user_id, name, email, role, phone, is_active)
  values
    (super_admin_id, 'System Super Admin', 'superadmin@valet.com', 'super_admin', '+919000000001', true),
    (parking_admin_id, 'Parking Manager', 'parkingadmin@valet.com', 'manager', '+919000000002', true),
    (security_id, 'Valet Security Officer', 'security@valet.com', 'valet', '+919000000003', true),
    (valet_id, 'Lead Valet Driver', 'valet@valet.com', 'valet', '+919000000005', true),
    (customer_id, 'Registered Customer', 'customer@valet.com', 'customer', '+919876543210', true)
  on conflict (email) do update set
    auth_user_id = excluded.auth_user_id,
    name = excluded.name,
    role = excluded.role,
    phone = excluded.phone,
    is_active = true;

  -- 3. Populate public.employees (for valet operations)
  insert into public.employees (name, role, phone, email, is_active)
  values
    ('Lead Valet Driver', 'valet', '+919000000005', 'valet@valet.com', true)
  on conflict (email) do update set
    name = excluded.name,
    role = 'valet',
    phone = excluded.phone,
    is_active = true;

  -- 4. Populate public.customers
  insert into public.customers (name, phone, email)
  values
    ('Registered Customer', '+919876543210', 'customer@valet.com')
  on conflict (phone) do update set
    name = excluded.name,
    email = excluded.email;

  -- 5. Seed sample parking slots
  insert into public.parking_slots (slot_number, parking_type, status)
  values
    ('A-01', 'car', 'available'),
    ('A-02', 'car', 'available'),
    ('A-03', 'car', 'available'),
    ('A-04', 'car', 'available'),
    ('A-05', 'car', 'available'),
    ('B-01', 'car', 'available'),
    ('B-02', 'car', 'available'),
    ('B-03', 'car', 'available'),
    ('B-04', 'car', 'available'),
    ('B-05', 'car', 'available')
  on conflict (slot_number) do nothing;

end $$;
