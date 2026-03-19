

# Unimetric

College management dashboard with admin, faculty, and student portals.

## Run Locally

**Prerequisites:** Node.js 20+

1. Install dependencies:
   `npm install`
2. Configure environment variables from [.env.example](/d:/Project%20Files/Unimetric/.env.example)
3. Start the backend:
   `npm run serve`
4. In another terminal, start the frontend:
   `npm run dev`

The frontend expects the backend at `http://localhost:4000` unless `VITE_API_BASE_URL` is set.

## Supabase

The backend currently persists the full app snapshot into Supabase table `public.app_state`.

1. Run the SQL in [server/supabase-schema.sql](/d:/Project%20Files/Unimetric/server/supabase-schema.sql)
2. Set `USE_SUPABASE=true`
3. Add `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`
4. Sync local seed data:
   `npm run migrate:supabase`

For the first normalization phase, you can also run [server/supabase-relational-schema.sql](/d:/Project%20Files/Unimetric/server/supabase-relational-schema.sql) to create real tables like `students`, `faculty`, `attendance_sessions`, `notices`, and `result_marks` from the `app_state` snapshot.

## Deploy

### Frontend on Vercel

1. Import the repo into Vercel
2. Framework preset: `Vite`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Environment variable:
   `VITE_API_BASE_URL=https://your-render-service.onrender.com`

SPA routing is already handled by [vercel.json](/d:/Project%20Files/Unimetric/vercel.json).

### Backend on Render

1. Create a new `Web Service`
2. Connect this repo
3. Render can use [render.yaml](/d:/Project%20Files/Unimetric/render.yaml) automatically, or use:
   `Build Command: npm install`
   `Start Command: npm run serve`
4. Add environment variables:
   `USE_SUPABASE=true`
   `SUPABASE_URL=...`
   `SUPABASE_ANON_KEY=...`
   `SUPABASE_SERVICE_ROLE_KEY=...`

Health check endpoint:
`/api/health`
