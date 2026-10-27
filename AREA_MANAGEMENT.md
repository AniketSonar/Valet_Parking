# Area management: how it works and how to install it

## 1. Run the migration (once)
Supabase Dashboard -> SQL Editor -> run `backend/supabase/migrate_area_management.sql`.
It adds: buildings, manager_assignments, parking_zones, parking_gates, valet_posts, valet_assignments,
and floor/zone/map columns on parking_slots. It is safe to re-run.

## 2. Who does what
| Role | Screen | What they can do |
|---|---|---|
| Super admin | Areas & Managers | Add buildings and floors, give each floor to one manager |
| Manager | Area Map | Create zones inside their floor(s), lay out slots on a grid, add entry/exit gates |
| Manager | Valet Positions | Create posts (Front, Back, ...) with a headcount, link a post to a gate, place valets on posts |
| Manager | Parking Slots / Sessions / Dashboard | Now show only their own area |
| Valet | Parking Slots | Shows only the floor they are posted on, plus a banner with their post |

## 3. Rules enforced by the API (not just hidden in the UI)
- A manager with no floor assigned sees no slots and cannot create any.
- Managers get 403 on any slot, zone, gate or post outside their floors.
- Assigning a parking slot to a session is blocked if the slot is outside the manager's floors.
- A manager can only give a customer car to a valet who is posted in their area.
- A floor has one manager at a time; reassigning moves it and releases the valets posted there.
- When a floor is assigned to a new manager, its previous available slots are deleted so slot names
  can be created again by the new manager. Occupied or maintenance slots block the reassignment.
- A manager can use Area Map -> "Remove all slots" to remove every slot from their assigned floor.
- A post cannot exceed its headcount; a valet stands at one post at a time.
- A valet posted in another manager's area cannot be taken until that manager releases them.

## 4. Things to know
- Every slot belongs to a floor. Managers only see slots on their assigned floors.
- Valets with no post see an empty slot list until a manager posts them.
- Slot numbers stay globally unique (sessions match slots by number). Generated slots look like `A-01`.
- Not tested against a live Supabase project. I checked that the SQL parses, the backend loads and the
  frontend builds. Run the migration on a copy first.

## New / changed files
Backend: supabase/migrate_area_management.sql, src/utils/areaScope.js, src/controllers/areaController.js,
src/routes/areaRoutes.js, src/app.js; scoped: parkingSlotController, parkingSessionController,
parkingAdminController.
Frontend: api/areaApi.js, components/areas/areas.css, admin_dashboard/AreaManagement.jsx,
parkingAdmin/AreaMap.jsx, parkingAdmin/ValetPosts.jsx; wired in layout/dashboardConfigs.js,
admin_dashboard/Dashboard.jsx, parkingAdmin/ParkingAdminDashboard.jsx, valet/ParkingSlots.jsx.
