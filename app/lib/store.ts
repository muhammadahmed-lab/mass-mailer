import type { JobProgress } from "@/app/types";

const TTL_SECONDS = 3600; // 1 hour

// ---------------------------------------------------------------------------
// In-memory fallback for local dev (no Vercel KV configured).
// In production on Vercel, set KV_REST_API_URL + KV_REST_API_TOKEN and
// this will automatically use Vercel KV instead.
// ---------------------------------------------------------------------------

// Use globalThis so the Map survives Next.js hot reloads and is shared
// across all API routes in the same process (same pattern as Prisma).
const globalForStore = globalThis as unknown as {
  __massMailerStore?: Map<string, { data: JobProgress; expiresAt: number }>;
};
if (!globalForStore.__massMailerStore) {
  globalForStore.__massMailerStore = new Map();
}
const memoryStore = globalForStore.__massMailerStore;

function memGet(key: string): JobProgress | null {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return entry.data;
}

function memSet(key: string, data: JobProgress, ttl: number): void {
  memoryStore.set(key, { data, expiresAt: Date.now() + ttl * 1000 });
}

// Check if Vercel KV is configured
const useKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

async function kvGet(key: string): Promise<JobProgress | null> {
  const { kv } = await import("@vercel/kv");
  return kv.get<JobProgress>(key);
}

async function kvSet(
  key: string,
  data: JobProgress,
  ttl: number
): Promise<void> {
  const { kv } = await import("@vercel/kv");
  await kv.set(key, data, { ex: ttl });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getJob(jobId: string): Promise<JobProgress | null> {
  const key = `job:${jobId}`;
  if (useKV) return kvGet(key);
  return memGet(key);
}

export async function setJob(
  jobId: string,
  progress: JobProgress
): Promise<void> {
  const key = `job:${jobId}`;
  if (useKV) return kvSet(key, progress, TTL_SECONDS);
  memSet(key, progress, TTL_SECONDS);
}

export async function updateJob(
  jobId: string,
  partial: Partial<JobProgress>
): Promise<void> {
  const current = await getJob(jobId);
  if (!current) return;

  const updated: JobProgress = {
    ...current,
    ...partial,
    errors: partial.errors
      ? [...current.errors, ...partial.errors]
      : current.errors,
  };

  await setJob(jobId, updated);
}
