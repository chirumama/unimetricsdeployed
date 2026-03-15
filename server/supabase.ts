import 'dotenv/config';
import fs from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { DB } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'db.json');
const STATE_TABLE = 'app_state';
const STATE_ID = 'unimetric';

type SnapshotRow = {
  id: string;
  payload: DB;
  updated_at?: string;
};

function normalizeDB(parsed: DB): DB {
  return {
    ...parsed,
    faculty: (parsed.faculty ?? []).map((item) => ({
      ...item,
      password: item.password ?? '12345678',
    })),
    students: (parsed.students ?? []).map((item) => ({
      ...item,
      password: item.password ?? '12345678',
    })),
    academicYear: {
      ...parsed.academicYear,
      classes: (parsed.academicYear?.classes ?? []).map((item) => ({
        ...item,
        subjects: item.subjects ?? [],
        facultyId: item.facultyId ?? null,
      })),
    },
    locations: parsed.locations ?? [],
    timetable: parsed.timetable ?? [],
    attendance: parsed.attendance ?? [],
    finance: {
      revenues: parsed.finance?.revenues ?? [],
      expenses: parsed.finance?.expenses ?? [],
    },
    notices: parsed.notices ?? [],
    doubts: parsed.doubts ?? [],
    resultSubjects: parsed.resultSubjects ?? [],
    resultMarks: parsed.resultMarks ?? [],
  };
}

export async function readLocalDBFile(): Promise<DB> {
  const raw = await fs.readFile(dbPath, 'utf-8');
  return normalizeDB(JSON.parse(raw) as DB);
}

export async function writeLocalDBFile(db: DB): Promise<void> {
  await fs.writeFile(dbPath, JSON.stringify(db, null, 2), 'utf-8');
}

function createSupabaseAdminClient(): SupabaseClient | null {
  const enabled = process.env.USE_SUPABASE === 'true';
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!enabled || !url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

const supabase = createSupabaseAdminClient();

export function isSupabaseEnabled() {
  return Boolean(supabase);
}

function isMissingTableError(error: { code?: string; message?: string } | null) {
  return error?.code === 'PGRST205' || error?.message?.includes(STATE_TABLE);
}

export async function pullSupabaseSnapshot(): Promise<DB | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from(STATE_TABLE)
    .select('id, payload, updated_at')
    .eq('id', STATE_ID)
    .maybeSingle<SnapshotRow>();

  if (error) {
    if (isMissingTableError(error)) {
      console.warn(
        'Supabase table public.app_state is missing. Apply server/supabase-schema.sql, then rerun the server.'
      );
      return null;
    }

    throw error;
  }

  return data?.payload ? normalizeDB(data.payload) : null;
}

export async function pushSupabaseSnapshot(db: DB): Promise<boolean> {
  if (!supabase) {
    return false;
  }

  const { error } = await supabase.from(STATE_TABLE).upsert(
    {
      id: STATE_ID,
      payload: db,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'id',
    }
  );

  if (error) {
    if (isMissingTableError(error)) {
      console.warn(
        'Supabase table public.app_state is missing. Changes were kept in server/db.json until the table exists.'
      );
      return false;
    }

    throw error;
  }

  return true;
}

export async function ensureSupabaseSeededFromLocalFile(): Promise<DB | null> {
  if (!supabase) {
    return null;
  }

  const existing = await pullSupabaseSnapshot();
  if (existing) {
    return existing;
  }

  const local = await readLocalDBFile();
  const stored = await pushSupabaseSnapshot(local);
  return stored ? local : null;
}
