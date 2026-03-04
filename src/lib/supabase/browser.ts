import { createBrowserClient } from "@supabase/ssr";
import { getEnv } from "@/lib/env";

export function createSupabaseBrowserClient() {
  const env = getEnv();
  if (!env) throw new Error("Supabase env vars missing. See .env.example.");
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
