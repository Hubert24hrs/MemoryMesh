-- supabase/migrations/002_rls_policies.sql
-- Enable Row Level Security (RLS) on all core database tables

ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

-- 1. Memories Policies: Users can only interact with their own memories
CREATE POLICY "Users can insert their own memories" 
ON memories FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select their own memories" 
ON memories FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own memories" 
ON memories FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memories" 
ON memories FOR DELETE 
USING (auth.uid() = user_id);

-- 2. Insights Policies: Users can only read their own AI-generated insights
CREATE POLICY "Users can select their own insights" 
ON insights FOR SELECT 
USING (auth.uid() = user_id);
