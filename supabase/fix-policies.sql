-- Drop existing policies first
DROP POLICY IF EXISTS "journals_select_members" ON public.journals;
DROP POLICY IF EXISTS "journals_insert_owner" ON public.journals;
DROP POLICY IF EXISTS "journals_update_owner" ON public.journals;
DROP POLICY IF EXISTS "journals_delete_owner" ON public.journals;
DROP POLICY IF EXISTS "j_read" ON public.journals;
DROP POLICY IF EXISTS "j_insert" ON public.journals;
DROP POLICY IF EXISTS "j_update" ON public.journals;
DROP POLICY IF EXISTS "j_delete" ON public.journals;

DROP POLICY IF EXISTS "members_select" ON public.journal_members;
DROP POLICY IF EXISTS "members_insert_owner" ON public.journal_members;
DROP POLICY IF EXISTS "members_delete_owner" ON public.journal_members;
DROP POLICY IF EXISTS "m_read" ON public.journal_members;
DROP POLICY IF EXISTS "m_insert" ON public.journal_members;

-- Create simple working policies
ALTER TABLE public.journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "j_read" ON public.journals FOR SELECT USING (true);
CREATE POLICY "j_insert" ON public.journals FOR INSERT WITH CHECK (owner_id IS NOT NULL);
CREATE POLICY "j_update" ON public.journals FOR UPDATE USING (owner_id IS NOT NULL);
CREATE POLICY "j_delete" ON public.journals FOR DELETE USING (owner_id IS NOT NULL);

CREATE POLICY "m_read" ON public.journal_members FOR SELECT USING (true);
CREATE POLICY "m_insert" ON public.journal_members FOR INSERT WITH CHECK (user_id IS NOT NULL);

GRANT ALL ON public.journals TO authenticated;
GRANT ALL ON public.journal_members TO authenticated;
