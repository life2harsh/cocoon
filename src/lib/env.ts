import { z } from "zod";

const baseSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
});

const schema = baseSchema.extend({
  OPENROUTER_API_KEY: z.string().min(1).optional(),
});

let cached: z.infer<typeof schema> | undefined;

export function getEnv() {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const openrouter = process.env.OPENROUTER_API_KEY;

  if (!url || !anon) return undefined;

  cached = baseSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anon,
  });

  if (openrouter) {
    cached.OPENROUTER_API_KEY = openrouter;
  }

  return cached;
}
