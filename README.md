# Valet Parking
# QiroValet26
Valet Parking is a full-stack application with a React/Vite frontend and an
Express backend.

## Project structure

```text
backend/
  server.js
  src/
    config/
    controllers/
    middleware/
    routes/
    services/
    templates/
frontend/
  src/
  public/
  package.json
```

## Running locally

Install dependencies in each application:

```powershell
cd backend
npm install

cd ..\frontend
npm install
```

Start the API and frontend in separate terminals:

```powershell
# backend
cd backend
npm start

# frontend
cd frontend
npm run dev
```

Environment files are provided as `.env.example` files in `backend/` and
`frontend/`. Copy them to `.env` and provide local values before starting the
applications.

## Creating the Supabase database

The database schema is in
[`backend/supabase/schema.sql`](./backend/supabase/schema.sql). In a new
Supabase project, open **SQL Editor**, paste the contents of that file, and
run it once. This creates the application tables, relationships, indexes,
timestamp triggers, and the `vehicle-inspection-photos` storage bucket.

After running the schema, start the backend with:

```powershell
cd backend
npm start
```


