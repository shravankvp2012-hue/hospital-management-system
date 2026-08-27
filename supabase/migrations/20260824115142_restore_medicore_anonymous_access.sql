/*
# Restore MediCore anonymous access while sign-in is paused

1. Overview
The application is temporarily returning to its original single-tenant mode.
The login screen is removed, so the public browser client must be able to read and manage the hospital records again.

2. Security changes
- Add four explicit anonymous CRUD policies to patients, doctors, and appointments.
- Add four explicit anonymous CRUD policies to patient visits, medications, and doctor availability.
- Keep row level security enabled on every table.
- Profiles remain available for a future sign-in phase but are not exposed to anonymous users.

3. Important note
Without the login screen, anyone with access to the application can access the shared hospital records. Re-enable authenticated policies before using this with real patient data.

4. Data safety
No records or columns are removed or changed.
*/

DROP POLICY IF EXISTS "public_select_patients" ON patients;
CREATE POLICY "public_select_patients" ON patients FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_insert_patients" ON patients;
CREATE POLICY "public_insert_patients" ON patients FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_patients" ON patients;
CREATE POLICY "public_update_patients" ON patients FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "public_delete_patients" ON patients;
CREATE POLICY "public_delete_patients" ON patients FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_select_doctors" ON doctors;
CREATE POLICY "public_select_doctors" ON doctors FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_insert_doctors" ON doctors;
CREATE POLICY "public_insert_doctors" ON doctors FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_doctors" ON doctors;
CREATE POLICY "public_update_doctors" ON doctors FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "public_delete_doctors" ON doctors;
CREATE POLICY "public_delete_doctors" ON doctors FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_select_appointments" ON appointments;
CREATE POLICY "public_select_appointments" ON appointments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_insert_appointments" ON appointments;
CREATE POLICY "public_insert_appointments" ON appointments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_appointments" ON appointments;
CREATE POLICY "public_update_appointments" ON appointments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "public_delete_appointments" ON appointments;
CREATE POLICY "public_delete_appointments" ON appointments FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_select_patient_visits" ON patient_visits;
CREATE POLICY "public_select_patient_visits" ON patient_visits FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_insert_patient_visits" ON patient_visits;
CREATE POLICY "public_insert_patient_visits" ON patient_visits FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_patient_visits" ON patient_visits;
CREATE POLICY "public_update_patient_visits" ON patient_visits FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "public_delete_patient_visits" ON patient_visits;
CREATE POLICY "public_delete_patient_visits" ON patient_visits FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_select_patient_medications" ON patient_medications;
CREATE POLICY "public_select_patient_medications" ON patient_medications FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_insert_patient_medications" ON patient_medications;
CREATE POLICY "public_insert_patient_medications" ON patient_medications FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_patient_medications" ON patient_medications;
CREATE POLICY "public_update_patient_medications" ON patient_medications FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "public_delete_patient_medications" ON patient_medications;
CREATE POLICY "public_delete_patient_medications" ON patient_medications FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_select_doctor_availability" ON doctor_availability;
CREATE POLICY "public_select_doctor_availability" ON doctor_availability FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "public_insert_doctor_availability" ON doctor_availability;
CREATE POLICY "public_insert_doctor_availability" ON doctor_availability FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "public_update_doctor_availability" ON doctor_availability;
CREATE POLICY "public_update_doctor_availability" ON doctor_availability FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "public_delete_doctor_availability" ON doctor_availability;
CREATE POLICY "public_delete_doctor_availability" ON doctor_availability FOR DELETE TO anon, authenticated USING (true);
