-- Consolidate legacy staff roles into the four application roles.
update public.users
set role = case role
  when 'parking_admin' then 'manager'
  when 'reception_security' then 'valet'
  when 'cashier' then 'valet'
  when 'valet_attendant' then 'valet'
  else role
end
where role in (
  'parking_admin',
  'reception_security',
  'cashier',
  'valet_attendant'
);
