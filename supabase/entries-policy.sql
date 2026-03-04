-- Create entries table if not exists
CREATE TABLE IF NOT EXISTS public.entries (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.journals(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_at timestamptz
);

-- Enable RLS and create simple policies
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "e_read" ON public.entries;
DROP POLICY IF EXISTS "e_insert" ON public.entries;
DROP POLICY IF EXISTS "e_update" ON public.entries;

CREATE POLICY "e_read" ON public.entries FOR SELECT USING (true);
CREATE POLICY "e_insert" ON public.entries FOR INSERT WITH CHECK (author_id IS NOT NULL);
CREATE POLICY "e_update" ON public.entries FOR UPDATE USING (author_id IS NOT NULL);

GRANT ALL ON public.entries TO authenticated;
