/*
# Add MediCore profiles, patient history, medications, and doctor availability

1. Overview
This migration extends the existing hospital system for authenticated, role-aware work.
New sign-in users receive a profile with a safe default role of `receptionist`.
Roles are stored in a server-owned profile row and are not accepted from signup input.

2. New Tables
- `profiles`
  - `id` (uuid, references auth.users, primary key)
  - `full_name` (text)
  - `role` (text: admin, doctor, receptionist; defaults to receptionist)
  - `doctor_id` (uuid, optional link to doctors for doctor accounts)
- `patient_visits`
  - `id`, `patient_id`, `appointment_id`, `visit_date`, `summary`, `diagnosis`, `treatment`, `created_by`, `created_at`
- `patient_medications`
  - `id`, `patient_id`, `name`, `dosage`, `frequency`, `start_date`, `end_date`, `is_current`, `notes`, `created_at`
- `doctor_availability`
  - `id`, `doctor_id`, `day_of_week` (0 Sunday through 6 Saturday), `start_time`, `end_time`, `is_available`

3. Modified Tables
- `patients` gains `medical_history` and `current_medications` text fields for lightweight legacy-compatible storage.
- `doctors` gains `bio` text for profile specialization details.

4. Security
- Existing anonymous CRUD policies on patients, doctors, and appointments are replaced with authenticated policies.
- Admins and receptionists can manage shared records.
- Doctors can read only their own doctor profile, their appointments, and patients attached to their appointments.
- Visit notes, medications, and availability are protected by the same role and doctor ownership checks.
- Profile roles are created by a SECURITY DEFINER auth trigger and are not client-writable.

5. Notes
- Existing records are preserved.
- New accounts default to receptionist and can be promoted by an administrator through a future administrative workflow.
- No destructive changes are made.
*/

ALTER TABLE patients ADD COLUMN IF NOT EXISTS medical_history text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS current_medications text;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS bio text;

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'receptionist' CHECK (role IN ('admin', 'doctor', 'receptionist')),
  doctor_id uuid REFERENCES doctors(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS patient_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  visit_date timestamptz NOT NULL DEFAULT now(),
  summary text NOT NULL,
  diagnosis text,
  treatment text,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS patient_medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name text NOT NULL,
  dosage text NOT NULL,
  frequency text NOT NULL,
  start_date date,
  end_date date,
  is_current boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS doctor_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL CHECK (end_time > start_time),
  is_available boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS patient_visits_patient_id_idx ON patient_visits(patient_id);
CREATE INDEX IF NOT EXISTS patient_medications_patient_id_idx ON patient_medications(patient_id);
CREATE INDEX IF NOT EXISTS doctor_availability_doctor_id_idx ON doctor_availability(doctor_id);

CREATE OR REPLACE FUNCTION public.handle_new_medicore_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_medicore_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_medicore_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_medicore_profile();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_patients" ON patients;
DROP POLICY IF EXISTS "anon_insert_patients" ON patients;
DROP POLICY IF EXISTS "anon_update_patients" ON patients;
DROP POLICY IF EXISTS "anon_delete_patients" ON patients;
DROP POLICY IF EXISTS "anon_select_doctors" ON doctors;
DROP POLICY IF EXISTS "anon_insert_doctors" ON doctors;
DROP POLICY IF EXISTS "anon_update_doctors" ON doctors;
DROP POLICY IF EXISTS "anon_delete_doctors" ON doctors;
DROP POLICY IF EXISTS "anon_select_appointments" ON appointments;
DROP POLICY IF EXISTS "anon_insert_appointments" ON appointments;
DROP POLICY IF EXISTS "anon_update_appointments" ON appointments;
DROP POLICY IF EXISTS "anon_delete_appointments" ON appointments;

CREATE OR REPLACE FUNCTION public.medicore_role(required_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = required_role);
$$;
REVOKE ALL ON FUNCTION public.medicore_role(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.medicore_role(text) TO authenticated;

CREATE POLICY "profiles_select_self" ON profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_update_name" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "patients_select_by_role" ON patients FOR SELECT TO authenticated USING (
  medicore_role('admin') OR medicore_role('receptionist') OR EXISTS (
    SELECT 1 FROM appointments a JOIN profiles p ON p.doctor_id = a.doctor_id
    WHERE a.patient_id = patients.id AND p.id = auth.uid()
  )
);
CREATE POLICY "patients_insert_staff" ON patients FOR INSERT TO authenticated WITH CHECK (medicore_role('admin') OR medicore_role('receptionist'));
CREATE POLICY "patients_update_staff" ON patients FOR UPDATE TO authenticated USING (medicore_role('admin') OR medicore_role('receptionist')) WITH CHECK (medicore_role('admin') OR medicore_role('receptionist'));
CREATE POLICY "patients_delete_admin" ON patients FOR DELETE TO authenticated USING (medicore_role('admin'));

CREATE POLICY "doctors_select_by_role" ON doctors FOR SELECT TO authenticated USING (
  medicore_role('admin') OR medicore_role('receptionist') OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.doctor_id = doctors.id)
);
CREATE POLICY "doctors_insert_staff" ON doctors FOR INSERT TO authenticated WITH CHECK (medicore_role('admin') OR medicore_role('receptionist'));
CREATE POLICY "doctors_update_staff_or_self" ON doctors FOR UPDATE TO authenticated USING (medicore_role('admin') OR medicore_role('receptionist') OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.doctor_id = doctors.id)) WITH CHECK (medicore_role('admin') OR medicore_role('receptionist') OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.doctor_id = doctors.id));
CREATE POLICY "doctors_delete_admin" ON doctors FOR DELETE TO authenticated USING (medicore_role('admin'));

CREATE POLICY "appointments_select_by_role" ON appointments FOR SELECT TO authenticated USING (
  medicore_role('admin') OR medicore_role('receptionist') OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.doctor_id = appointments.doctor_id)
);
CREATE POLICY "appointments_insert_by_role" ON appointments FOR INSERT TO authenticated WITH CHECK (
  medicore_role('admin') OR medicore_role('receptionist') OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.doctor_id = appointments.doctor_id)
);
CREATE POLICY "appointments_update_by_role" ON appointments FOR UPDATE TO authenticated USING (
  medicore_role('admin') OR medicore_role('receptionist') OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.doctor_id = appointments.doctor_id)
) WITH CHECK (
  medicore_role('admin') OR medicore_role('receptionist') OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.doctor_id = appointments.doctor_id)
);
CREATE POLICY "appointments_delete_staff" ON appointments FOR DELETE TO authenticated USING (medicore_role('admin') OR medicore_role('receptionist'));

CREATE POLICY "visits_select_by_role" ON patient_visits FOR SELECT TO authenticated USING (
  medicore_role('admin') OR medicore_role('receptionist') OR EXISTS (SELECT 1 FROM appointments a JOIN profiles p ON p.doctor_id = a.doctor_id WHERE a.patient_id = patient_visits.patient_id AND p.id = auth.uid())
);
CREATE POLICY "visits_insert_by_role" ON patient_visits FOR INSERT TO authenticated WITH CHECK (medicore_role('admin') OR medicore_role('receptionist') OR created_by = auth.uid());
CREATE POLICY "visits_update_creator" ON patient_visits FOR UPDATE TO authenticated USING (medicore_role('admin') OR medicore_role('receptionist') OR created_by = auth.uid()) WITH CHECK (medicore_role('admin') OR medicore_role('receptionist') OR created_by = auth.uid());
CREATE POLICY "visits_delete_staff" ON patient_visits FOR DELETE TO authenticated USING (medicore_role('admin') OR medicore_role('receptionist'));

CREATE POLICY "medications_select_by_role" ON patient_medications FOR SELECT TO authenticated USING (
  medicore_role('admin') OR medicore_role('receptionist') OR EXISTS (SELECT 1 FROM appointments a JOIN profiles p ON p.doctor_id = a.doctor_id WHERE a.patient_id = patient_medications.patient_id AND p.id = auth.uid())
);
CREATE POLICY "medications_insert_staff" ON patient_medications FOR INSERT TO authenticated WITH CHECK (medicore_role('admin') OR medicore_role('receptionist'));
CREATE POLICY "medications_update_staff" ON patient_medications FOR UPDATE TO authenticated USING (medicore_role('admin') OR medicore_role('receptionist')) WITH CHECK (medicore_role('admin') OR medicore_role('receptionist'));
CREATE POLICY "medications_delete_staff" ON patient_medications FOR DELETE TO authenticated USING (medicore_role('admin') OR medicore_role('receptionist'));

CREATE POLICY "availability_select_by_role" ON doctor_availability FOR SELECT TO authenticated USING (
  medicore_role('admin') OR medicore_role('receptionist') OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.doctor_id = doctor_availability.doctor_id)
);
CREATE POLICY "availability_insert_staff" ON doctor_availability FOR INSERT TO authenticated WITH CHECK (medicore_role('admin') OR medicore_role('receptionist') OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.doctor_id = doctor_availability.doctor_id));
CREATE POLICY "availability_update_staff" ON doctor_availability FOR UPDATE TO authenticated USING (medicore_role('admin') OR medicore_role('receptionist') OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.doctor_id = doctor_availability.doctor_id)) WITH CHECK (medicore_role('admin') OR medicore_role('receptionist') OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.doctor_id = doctor_availability.doctor_id));
CREATE POLICY "availability_delete_staff" ON doctor_availability FOR DELETE TO authenticated USING (medicore_role('admin') OR medicore_role('receptionist') OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.doctor_id = doctor_availability.doctor_id));

GRANT SELECT ON profiles, patients, doctors, appointments, patient_visits, patient_medications, doctor_availability TO authenticated;
GRANT INSERT, UPDATE, DELETE ON patients, doctors, appointments, patient_visits, patient_medications, doctor_availability TO authenticated;
