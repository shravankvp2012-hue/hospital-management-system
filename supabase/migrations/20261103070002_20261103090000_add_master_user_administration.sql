/*
# Add Master user administration and account controls

1. Overview
This migration prepares MediCore for signed-in, Master-managed accounts. It keeps Supabase Auth as the source of login credentials and extends the existing profile record with safe account-management metadata.

2. Modified Tables
- `profiles`
  - `role` now supports master, admin, manager, doctor, receptionist, and billing roles.
  - `account_status` records whether an account is active or disabled.
  - `must_change_password` forces a temporary-password user to choose a private password after first login.
  - `created_by` records which signed-in Master created the account.
  - Existing profile rows and existing role/doctor assignments are preserved.

3. Security Changes
- Anonymous Data API privileges are removed from all hospital tables.
- Anonymous policies that allowed public reads and writes are removed.
- Profile role and account-control columns remain server-controlled.
- A Master role is treated as an administrator by the existing role helper.

4. Important Notes
- Login credentials remain in Supabase Auth and are never stored in `profiles`.
- Temporary passwords are returned only once by the secure account-management function and are not persisted in the database.
- Existing rows are not deleted.
*/

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('master', 'admin', 'manager', 'doctor', 'receptionist', 'billing'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'disabled'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);
CREATE INDEX IF NOT EXISTS profiles_account_status_idx ON profiles(account_status);

CREATE OR REPLACE FUNCTION public.medicore_role(required_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
      AND account_status = 'active'
      AND (role = required_role OR (role = 'master' AND required_role = 'admin'))
  );
$$;

REVOKE ALL ON FUNCTION public.medicore_role(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.medicore_role(text) TO authenticated;

DROP POLICY IF EXISTS "public_select_appointments" ON appointments;
DROP POLICY IF EXISTS "public_insert_appointments" ON appointments;
DROP POLICY IF EXISTS "public_update_appointments" ON appointments;
DROP POLICY IF EXISTS "public_delete_appointments" ON appointments;
DROP POLICY IF EXISTS "public_select_doctor_availability" ON doctor_availability;
DROP POLICY IF EXISTS "public_insert_doctor_availability" ON doctor_availability;
DROP POLICY IF EXISTS "public_update_doctor_availability" ON doctor_availability;
DROP POLICY IF EXISTS "public_delete_doctor_availability" ON doctor_availability;
DROP POLICY IF EXISTS "public_select_doctors" ON doctors;
DROP POLICY IF EXISTS "public_insert_doctors" ON doctors;
DROP POLICY IF EXISTS "public_update_doctors" ON doctors;
DROP POLICY IF EXISTS "public_delete_doctors" ON doctors;
DROP POLICY IF EXISTS "public_select_invoice_items" ON invoice_items;
DROP POLICY IF EXISTS "public_insert_invoice_items" ON invoice_items;
DROP POLICY IF EXISTS "public_update_invoice_items" ON invoice_items;
DROP POLICY IF EXISTS "public_delete_invoice_items" ON invoice_items;
DROP POLICY IF EXISTS "public_select_invoices" ON invoices;
DROP POLICY IF EXISTS "public_insert_invoices" ON invoices;
DROP POLICY IF EXISTS "public_update_invoices" ON invoices;
DROP POLICY IF EXISTS "public_delete_invoices" ON invoices;
DROP POLICY IF EXISTS "public_select_lab_reports" ON lab_reports;
DROP POLICY IF EXISTS "public_insert_lab_reports" ON lab_reports;
DROP POLICY IF EXISTS "public_update_lab_reports" ON lab_reports;
DROP POLICY IF EXISTS "public_delete_lab_reports" ON lab_reports;
DROP POLICY IF EXISTS "public_select_patient_medications" ON patient_medications;
DROP POLICY IF EXISTS "public_insert_patient_medications" ON patient_medications;
DROP POLICY IF EXISTS "public_update_patient_medications" ON patient_medications;
DROP POLICY IF EXISTS "public_delete_patient_medications" ON patient_medications;
DROP POLICY IF EXISTS "public_select_patient_visits" ON patient_visits;
DROP POLICY IF EXISTS "public_insert_patient_visits" ON patient_visits;
DROP POLICY IF EXISTS "public_update_patient_visits" ON patient_visits;
DROP POLICY IF EXISTS "public_delete_patient_visits" ON patient_visits;
DROP POLICY IF EXISTS "public_select_patients" ON patients;
DROP POLICY IF EXISTS "public_insert_patients" ON patients;
DROP POLICY IF EXISTS "public_update_patients" ON patients;
DROP POLICY IF EXISTS "public_delete_patients" ON patients;
DROP POLICY IF EXISTS "public_select_prescription_items" ON prescription_items;
DROP POLICY IF EXISTS "public_insert_prescription_items" ON prescription_items;
DROP POLICY IF EXISTS "public_update_prescription_items" ON prescription_items;
DROP POLICY IF EXISTS "public_delete_prescription_items" ON prescription_items;
DROP POLICY IF EXISTS "public_select_prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "public_insert_prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "public_update_prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "public_delete_prescriptions" ON prescriptions;

REVOKE ALL ON patients, doctors, appointments, profiles, patient_visits, patient_medications, doctor_availability, invoices, invoice_items, prescriptions, prescription_items, lab_reports FROM anon;

REVOKE UPDATE ON profiles FROM authenticated;
GRANT UPDATE (full_name) ON profiles TO authenticated;
