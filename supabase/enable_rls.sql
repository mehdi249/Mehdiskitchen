-- Run this in the Supabase SQL Editor (mehdis-kitchen project)
-- https://supabase.com/dashboard/project/uarjjjvrzzwsewrcprcc/sql

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Anyone can read recipes (app loads without login)
CREATE POLICY "Public reads"
  ON recipes FOR SELECT
  USING (true);

-- Only Mehdi's account can insert, update, or delete
CREATE POLICY "Auth inserts"
  ON recipes FOR INSERT
  WITH CHECK (auth.email() = 'mehdiiaabbasii@gmail.com');

CREATE POLICY "Auth updates"
  ON recipes FOR UPDATE
  USING (auth.email() = 'mehdiiaabbasii@gmail.com');

CREATE POLICY "Auth deletes"
  ON recipes FOR DELETE
  USING (auth.email() = 'mehdiiaabbasii@gmail.com');
