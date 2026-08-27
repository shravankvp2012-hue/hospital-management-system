/*
# Add lab reports table

1. Overview
Adds lab/test reports linked to patients and optionally to visits and appointments.

2. New Table
  a. `lab_reports`
    - id, patient_id, visit_id (nullable), appointment_id (nullable),
      test_name, result_value, unit (nullable), normal_range (nullable),
      status (normal/abnormal), report_date, notes (nullable), created_at

3. Security
- RLS enabled with anon+authenticated CRUD (no-auth mode, matching existing tables).

4. Data Safety
- No destructive changes. New table only.
*/

CREATE TABLE IF NOT EXISTS lab_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  visit_id uuid REFERENCES patient_visits(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  test_name text NOT NULL,
  result_value text NOT NULL,
  unit text,
  normal_range text,
  status text NOT NULL DEFAULT 'normal' CHECK (status IN ('normal', 'abnormal')),
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lab_reports_patient_id_idx ON lab_reports(patient_id);
CREATE INDEX IF NOT EXISTS lab_reports_visit_id_idx ON lab_reports(visit_id);

ALTER TABLE lab_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_lab_reports" ON lab_reports;
CREATE POLICY "public_select_lab_reports" ON lab_reports FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_insert_lab_reports" ON lab_reports;
CREATE POLICY "public_insert_lab_reports" ON lab_reports FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_lab_reports" ON lab_reports;
CREATE POLICY "public_update_lab_reports" ON lab_reports FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "public_delete_lab_reports" ON lab_reports;
CREATE POLICY "public_delete_lab_reports" ON lab_reports FOR DELETE TO anon, authenticated USING (true);
