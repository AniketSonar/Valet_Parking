# Valet Parking - Aura Valet System

Aura Valet Parking is an enterprise full-stack valet and parking management application built with a React 19 / Vite frontend and an Express 5 backend with Supabase PostgreSQL and Supabase Authentication.

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
