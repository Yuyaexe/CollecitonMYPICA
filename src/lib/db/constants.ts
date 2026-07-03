/** Fixed local user when running with Docker Postgres (no Supabase Auth). */
export const LOCAL_DEMO_USER_ID = "b0000000-0000-4000-8000-000000000001";

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getLocalUserId(): string {
  return process.env.LOCAL_DEMO_USER_ID ?? LOCAL_DEMO_USER_ID;
}
