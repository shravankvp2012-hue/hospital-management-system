/*
# Add billing and prescriptions tables

1. Overview
Adds invoicing and prescription tracking to MediCore, linked to existing patients and appointments.

2. New Tables
  a. `invoices`
    - id, patient_id, appointment_id (nullable), invoice_number, status (paid/unpaid/partially_paid),
      date_issued, due_date, notes, created_at
  b. `invoice_items`
    - id, invoice_id, category (consultation/tests/medication/other), description, amount
  c. `prescriptions`
    - id, patient_id, appointment_id (nullable), visit_id (nullable), notes, created_at
  d. `prescription_items`
    - id, prescription_id, medicine_name, dosage, frequency, duration, instructions

3. Security
- RLS enabled on all tables with anon+authenticated CRUD (no-auth mode).

4. Data Safety
- No destructive changes. All new tables.
*/

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid', 'partially_paid')),
  date_issued date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invoices_patient_id_idx ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS invoices_status_idx ON invoices(status);

CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('consultation', 'tests', 'medication', 'other')),
  description text NOT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS invoice_items_invoice_id_idx ON invoice_items(invoice_id);

CREATE TABLE IF NOT EXISTS prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  visit_id uuid REFERENCES patient_visits(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS prescriptions_patient_id_idx ON prescriptions(patient_id);

CREATE TABLE IF NOT EXISTS prescription_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  medicine_name text NOT NULL,
  dosage text NOT NULL,
  frequency text NOT NULL,
  duration text NOT NULL,
  instructions text
);
CREATE INDEX IF NOT EXISTS prescription_items_prescription_id_idx ON prescription_items(prescription_id);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_invoices" ON invoices;
CREATE POLICY "public_select_invoices" ON invoices FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_insert_invoices" ON invoices;
CREATE POLICY "public_insert_invoices" ON invoices FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_invoices" ON invoices;
CREATE POLICY "public_update_invoices" ON invoices FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "public_delete_invoices" ON invoices;
CREATE POLICY "public_delete_invoices" ON invoices FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_select_invoice_items" ON invoice_items;
CREATE POLICY "public_select_invoice_items" ON invoice_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_insert_invoice_items" ON invoice_items;
CREATE POLICY "public_insert_invoice_items" ON invoice_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_invoice_items" ON invoice_items;
CREATE POLICY "public_update_invoice_items" ON invoice_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "public_delete_invoice_items" ON invoice_items;
CREATE POLICY "public_delete_invoice_items" ON invoice_items FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_select_prescriptions" ON prescriptions;
CREATE POLICY "public_select_prescriptions" ON prescriptions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_insert_prescriptions" ON prescriptions;
CREATE POLICY "public_insert_prescriptions" ON prescriptions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_prescriptions" ON prescriptions;
CREATE POLICY "public_update_prescriptions" ON prescriptions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "public_delete_prescriptions" ON prescriptions;
CREATE POLICY "public_delete_prescriptions" ON prescriptions FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_select_prescription_items" ON prescription_items;
CREATE POLICY "public_select_prescription_items" ON prescription_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_insert_prescription_items" ON prescription_items;
CREATE POLICY "public_insert_prescription_items" ON prescription_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_prescription_items" ON prescription_items;
CREATE POLICY "public_update_prescription_items" ON prescription_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "public_delete_prescription_items" ON prescription_items;
CREATE POLICY "public_delete_prescription_items" ON prescription_items FOR DELETE TO anon, authenticated USING (true);
