# Valet Parking - Aura Valet System

Aura Valet Parking is an enterprise full-stack valet and parking management application built with a React 19 / Vite frontend and an Express 5 backend with Supabase PostgreSQL and Supabase Authentication.

---

## Roles & Access Control

| Role | Email | Password | Target Dashboard | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@valet.com` | `Password123!` | `/admin-dashboard` | Full system overview, staff management, revenue reports, global metrics. |
| **Parking Admin**| `parkingadmin@valet.com`| `Password123!` | `/parking-admin-dashboard` | Parking slot map, floor/system assignments, valet management, live vehicles, reports. |
| **Reception / Security** | `security@valet.com` | `Password123!` | `/reception-dashboard` | Vehicle check-in, key management, ticket QR generation, inspections. |
| **Cashier** | `cashier@valet.com` | `Password123!` | `/reception-dashboard` | Payments, billing checkout, invoice generation and download, exit pass verification. |
| **Valet Driver** | `valet@valet.com` | `Password123!` | `/valet-dashboard` | Assigned parking jobs, slot parking, vehicle retrieval requests, return handovers. |
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
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=your-app-password
```

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
     - `EMAIL_USER=<email>`
     - `EMAIL_APP_PASSWORD=<password>`

2. **Frontend on Vercel / Netlify:**
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Environment Variables:
     - `VITE_API_URL=<your_deployed_backend_url>`
   - For Vercel, keep `frontend/vercel.json` in the deployed project so
     browser refreshes on routes such as `/admin-dashboard` are rewritten to
     the React application entry point.
