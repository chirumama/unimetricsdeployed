import { ensureSupabaseSeededFromLocalFile, isSupabaseEnabled, pushSupabaseSnapshot, readLocalDBFile } from './supabase.js';

async function main() {
  if (!isSupabaseEnabled()) {
    throw new Error('Supabase is not enabled. Set USE_SUPABASE=true and configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  const seeded = await ensureSupabaseSeededFromLocalFile();
  if (seeded) {
    console.log('Supabase already had a snapshot or was seeded from server/db.json.');
    return;
  }

  const local = await readLocalDBFile();
  const stored = await pushSupabaseSnapshot(local);

  if (!stored) {
    throw new Error('Supabase table public.app_state is missing. Run server/supabase-schema.sql in the SQL editor first.');
  }

  console.log('Supabase snapshot sync completed successfully.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
