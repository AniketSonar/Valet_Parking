# Valet Parking System

Valet Parking is an enterprise full-stack valet and parking management application built with a React 19 / Vite frontend and an Express 5 backend with Supabase PostgreSQL and Supabase Authentication.

---

## Roles & Access Control

| Role | Email | Password | Target Dashboard | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@valet.com` | `Password123!` | `/admin-dashboard` | Full system overview, staff management, revenue reports, global metrics. |
| **Manager**| `parkingadmin@valet.com`| `Password123!` | `/parking-admin-dashboard` | Manage every floor/building, assign valets to parking systems, monitor operations and reports. |
| **Valet** | `security@valet.com` or `valet@valet.com` | `Password123!` | `/valet-dashboard` | Security desk and valet work: check-in, keys, tickets, inspections, parking and vehicle returns. |
| **Customer** | `customer@valet.com` | `Password123!` | `/customer-dashboard` | Live vehicle status, request retrieval, invoice download, service feedback rating. |

---

## Project Structure

```text
Valet_Parking-main/
  backend/
    server.js
    seed.js
    .env
    src/
      app.js
      config/
      controllers/
      middleware/
      routes/
      services/
      templates/
    supabase/
      schema.sql
      seed.sql
  frontend/
    index.html
    .env
    src/
      api/
      components/
      App.jsx
```

---

## WhatsApp Notifications

All customer messages (which used to be emails) go through
`backend/src/services/whatsappNotifier.js`. Each message is also stored in the
`notifications` table (`channel = whatsapp`, status `sent` / `failed`).

| Event | Trigger | Content |
| :--- | :--- | :--- |
| `ticket` | Vehicle check-in | Ticket details + **QR code image** |
| `parked` | Slot / parking position assigned | Parking location + ticket |
| `retrieval_requested` | Customer requests the car | Acknowledgement |
| `ready_for_pickup` | Valet marks car ready | Pickup point |
| `returned` | Return completed / self-parking checkout | Thank-you |
| `invoice` | Payment recorded | Invoice details + **PDF invoice** |

**Testing:** with `WHATSAPP_USE_TEMPLATES=false`, plain text is sent. WhatsApp
only delivers this if the customer messaged your business number in the last
24 hours (message the number from the test phone first).

**Production:** set `WHATSAPP_USE_TEMPLATES=true` and create these templates
(category *Utility*, language `en`) in WhatsApp Manager. Variables are `{{1}}`,
`{{2}}`... in the order shown:

| Template name | Header | Body variables |
| :--- | :--- | :--- |
| `aura_valet_ticket` | Image | plate, parking type, ticket, location, payment |
| `aura_valet_parked` | none | plate, location, ticket |
| `aura_valet_retrieval_requested` | none | plate, ticket |
| `aura_valet_ready_pickup` | none | plate, ticket, pickup point |
| `aura_valet_returned` | none | plate, ticket |
| `aura_valet_invoice` | Document | invoice no., ticket, plate, total |

Example body for `aura_valet_parked`:
`Your vehicle {{1}} is parked. Parking location: {{2}}. Ticket: {{3}}`

---

## Setup & Running Locally

### 1. Configure Environment Variables

**Backend (`backend/.env`):**
```env
PORT=5000
SUPABASE_URL=https://<your-project-id>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
WHATSAPP_ACCESS_TOKEN=<your-meta-whatsapp-cloud-api-token>
WHATSAPP_PHONE_NUMBER_ID=<your-whatsapp-business-phone-number-id>
WHATSAPP_API_VERSION=v23.0
WHATSAPP_DEFAULT_COUNTRY_CODE=91
WHATSAPP_USE_TEMPLATES=false
WHATSAPP_TEMPLATE_LANGUAGE=en
```

Ticket, invoice, and vehicle-return information is sent through the WhatsApp
Cloud API. Configure a Meta WhatsApp Business app with the
`whatsapp_business_messaging` permission, then restart the backend after
changing `backend/.env`.

The frontend stores the Supabase refresh token securely in browser storage and
automatically refreshes expired access tokens when a protected API request
returns `401`. If the refresh token is also invalid, the user is redirected to
the login page instead of remaining on a broken dashboard.

**Frontend (`frontend/.env`):**
```env
VITE_API_URL=http://localhost:5000
```

---

### 2. Database Schema & Seeding

1. Open your **Supabase Dashboard** -> **SQL Editor**.
2. Run `backend/supabase/schema.sql` to create all tables, relationships, triggers, and storage buckets.
3. Run `backend/supabase/seed.sql` (or run `node seed.js` in the `backend/` folder) to seed all default role accounts and sample slots with password `Password123!`.
4. Run `backend/supabase/migrate_area_management.sql` (buildings, floors, manager assignment, valet posts), then `backend/supabase/migrate_parking_areas.sql` (parking areas). Both are safe to re-run.

---

### Parking areas and valet dispatch

**Parking areas (super admin).** In *Areas & Managers*, assign a floor to a manager, then use *Create a parking area*: pick the manager, the floor, a block and a slot range. Block `A`, slots `1` to `50` creates `A-01` ... `A-50` on that floor. The manager sees only those slots and manages the valets there (*Valet Management*, *Valet Positions*, including the floor's entry / exit points). Managers can no longer map or create slots, and the Area Map page has been removed. Slot numbers are unique system-wide, so a block that would reuse an existing number (for example a second `A-01`) is refused.

**Valet assignment (automatic).** Checking in a valet-parking vehicle now assigns a valet and hands over the key in the same step; there is no separate key-management or assign-valet step. The valet is the one who is free at that moment: valets posted by a manager come first, then the fewest open jobs (a car waiting to be parked, or a retrieval in progress), then whoever has gone longest without a new car. The assigned valet's name appears on the check-in confirmation and in the session lists. If everyone is busy, the least busy valet gets the car; if no valet is active, check-in still succeeds and the confirmation says to assign one manually. A manager can still reassign a car from *Valet Management*.

---

### 3. Start Backend & Frontend

In terminal 1 (Backend):
```powershell
cd backend
npm install
npm start
```

In terminal 2 (Frontend):
```powershell
cd frontend
npm install
npm run dev
```

Open the frontend URL (typically `http://localhost:5173`) in your web browser.

---

## Deployment Guide

### Option 1: Vercel (Frontend) + Render / Railway (Backend)

1. **Backend on Render / Railway:**
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment Variables:
     - `PORT=5000` (or platform default)
     - `SUPABASE_URL=<supabase_url>`
     - `SUPABASE_SERVICE_ROLE_KEY=<supabase_service_role_key>`
     - `WHATSAPP_ACCESS_TOKEN=<meta_whatsapp_cloud_api_token>`
     - `WHATSAPP_PHONE_NUMBER_ID=<whatsapp_business_phone_number_id>`
     - `WHATSAPP_API_VERSION=v23.0`

2. **Frontend on Vercel / Netlify:**
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Environment Variables:
     - `VITE_API_URL=<your_deployed_backend_url>`
