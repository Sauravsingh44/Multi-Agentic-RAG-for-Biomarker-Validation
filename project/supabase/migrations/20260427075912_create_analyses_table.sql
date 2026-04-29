/*
  # Create analyses table for Lung Cancer Gene Analysis Pipeline

  1. New Tables
    - `analyses`
      - `id` (uuid, primary key)
      - `patient_id` (text) - extracted from CSV
      - `file_name` (text) - uploaded file name
      - `file_size` (bigint) - file size in bytes
      - `subtype` (text) - LUAD or LUSC predicted subtype
      - `confidence` (numeric) - confidence score 0-1
      - `status` (text) - pending, running, complete, error
      - `current_step` (int) - pipeline step index 0-6
      - `results` (jsonb) - full results payload
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `analyses` table
    - Public read/write for demo purposes (no auth required)
*/

CREATE TABLE IF NOT EXISTS analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id text NOT NULL DEFAULT '',
  file_name text NOT NULL DEFAULT '',
  file_size bigint NOT NULL DEFAULT 0,
  subtype text DEFAULT NULL,
  confidence numeric DEFAULT NULL,
  status text NOT NULL DEFAULT 'pending',
  current_step int NOT NULL DEFAULT 0,
  results jsonb DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select analyses"
  ON analyses FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert analyses"
  ON analyses FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public update analyses"
  ON analyses FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
