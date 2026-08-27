/*
# Hospital Management System Schema

1. Overview
This migration creates the core tables for a hospital management system:
- `patients` — stores patient demographic and medical contact records.
- `doctors` — stores doctor profiles with specialty and contact info.
- `appointments` — links a patient to a doctor with a scheduled date/time, reason, and status.

The app is a single-tenant system (no sign-in screen), so all policies
allow both the `anon` and `authenticated` roles to perform CRUD operations.

2. New Tables

  a. `patients`
    - `id` (uuid, primary key, auto-generated)
    - `first_name` (text, not null)
    - `last_name` (text, not null)
    - `date_of_birth` (date, not null)
    - `gender` (text: 'male' | 'female' | 'other', not null)
    - `phone` (text, not null)
    - `email` (text, nullable)
    - `address` (text, nullable)
    - `blood_type` (text: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | null)
    - `allergies` (text, nullable)
    - `notes` (text, nullable)
    - `created_at` (timestamptz, defaults to now)

  b. `doctors`
    - `id` (uuid, primary key, auto-generated)
    - `first_name` (text, not null)
    - `last_name` (text, not null)
    - `specialty` (text, not null)
    - `phone` (text, not null)
    - `email` (text, nullable)
    - `office` (text, nullable)
    - `status` (text: 'active' | 'on_leave' | 'inactive', default 'active')
    - `created_at` (timestamptz, defaults to now)

  c. `appointments`
    - `id` (uuid, primary key, auto-generated)
    - `patient_id` (uuid, foreign key to patients, not null, cascade delete)
    - `doctor_id` (uuid, foreign key to doctors, not null, cascade delete)
    - `appointment_date` (timestamptz, not null)
    - `duration_minutes` (integer, default 30)
    - `reason` (text, not null)
    - `status` (text: 'scheduled' | 'completed' | 'cancelled' | 'no_show', default 'scheduled')
    - `notes` (text, nullable)
    - `created_at` (timestamptz, defaults to now)

3. Indexes
    - `appointments_patient_id_idx` on appointments(patient_id)
    - `appointments_doctor_id_idx` on appointments(doctor_id)
    - `appointments_appointment_date_idx` on appointments(appointment_date)
    - `patients_name_idx` on patients(last_name, first_name)
    - `doctors_specialty_idx` on doctors(specialty)

4. Security
    - RLS enabled on all three tables.
    - All tables allow anon + authenticated CRUD (single-tenant, no sign-in).
    - Four separate policies per table (SELECT, INSERT, UPDATE, DELETE).
*/

-- ---------- patients ----------
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date NOT NULL,
  gender text NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  phone text NOT NULL,
  email text,
  address text,
  blood_type text CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  allergies text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_patients" ON patients;
CREATE POLICY "anon_select_patients" ON patients FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_patients" ON patients;
CREATE POLICY "anon_insert_patients" ON patients FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_patients" ON patients;
CREATE POLICY "anon_update_patients" ON patients FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_patients" ON patients;
CREATE POLICY "anon_delete_patients" ON patients FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS patients_name_idx ON patients (last_name, first_name);

-- ---------- doctors ----------
CREATE TABLE IF NOT EXISTS doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  specialty text NOT NULL,
  phone text NOT NULL,
  email text,
  office text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'inactive')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_doctors" ON doctors;
CREATE POLICY "anon_select_doctors" ON doctors FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_doctors" ON doctors;
CREATE POLICY "anon_insert_doctors" ON doctors FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_doctors" ON doctors;
CREATE POLICY "anon_update_doctors" ON doctors FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_doctors" ON doctors;
CREATE POLICY "anon_delete_doctors" ON doctors FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS doctors_specialty_idx ON doctors (specialty);

-- ---------- appointments ----------
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  appointment_date timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30 CHECK (duration_minutes > 0),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_appointments" ON appointments;
CREATE POLICY "anon_select_appointments" ON appointments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_appointments" ON appointments;
CREATE POLICY "anon_insert_appointments" ON appointments FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_appointments" ON appointments;
CREATE POLICY "anon_update_appointments" ON appointments FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_appointments" ON appointments;
CREATE POLICY "anon_delete_appointments" ON appointments FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS appointments_patient_id_idx ON appointments (patient_id);
CREATE INDEX IF NOT EXISTS appointments_doctor_id_idx ON appointments (doctor_id);
CREATE INDEX IF NOT EXISTS appointments_appointment_date_idx ON appointments (appointment_date);