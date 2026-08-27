/*
# Tighten doctor visit-note access

1. Purpose
Ensure doctors can only add visit notes for patients assigned to one of their appointments.

2. Security changes
- Replace the visit-note INSERT policy with a role-aware policy.
- Admins and receptionists may add notes for any visible patient.
- Doctors must be the assigned doctor on an appointment for the patient.

3. Data safety
No rows or columns are removed or changed.
*/

DROP POLICY IF EXISTS "visits_insert_by_role" ON patient_visits;
CREATE POLICY "visits_insert_by_role" ON patient_visits FOR INSERT TO authenticated WITH CHECK (
  medicore_role('admin') OR medicore_role('receptionist') OR (
    created_by = auth.uid() AND EXISTS (
      SELECT 1 FROM appointments a
      JOIN profiles p ON p.doctor_id = a.doctor_id
      WHERE a.patient_id = patient_visits.patient_id AND p.id = auth.uid()
    )
  )
);
