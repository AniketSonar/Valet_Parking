-- ============================================================
-- ENABLE SUPABASE REALTIME REPLICATION
-- Run this script in Supabase Dashboard -> SQL Editor
-- Project URL: https://supabase.com/dashboard/project/igafljqsbogxroyagzxv/sql
-- ============================================================

-- Add tables to the supabase_realtime publication
-- This enables live WebSocket change broadcasts to the frontend.

do $$
declare
  tbl text;
  tables text[] := array[
    'parking_sessions',
    'parking_slots',
    'parking_bookings',
    'keys',
    'payments',
    'notifications',
    'incidents',
    'feedback',
    'vehicles',
    'customers',
    'users'
  ];
begin
  foreach tbl in array tables
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    exception
      when duplicate_object then
        -- Table already in publication, ignore
        null;
    end;
  end loop;
end;
$$;
