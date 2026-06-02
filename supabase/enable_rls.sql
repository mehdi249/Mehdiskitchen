-- Run this in the Supabase SQL Editor (mehdis-kitchen project)
-- https://supabase.com/dashboard/project/uarjjjvrzzwsewrcprcc/sql

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Anyone can read recipes (app loads without login)
CREATE POLICY "Public reads"
  ON recipes FOR SELECT
  USING (true);

-- Only authenticated users can insert, update, or delete
CREATE POLICY "Auth inserts"
  ON recipes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Auth updates"
  ON recipes FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Auth deletes"
  ON recipes FOR DELETE
  USING (auth.role() = 'authenticated');
