export type Gender = 'male' | 'female' | 'other';

export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export type DoctorStatus = 'active' | 'on_leave' | 'inactive';

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';
export type UserRole = 'admin' | 'doctor' | 'receptionist';

export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: Gender;
  phone: string;
  email: string | null;
  address: string | null;
  blood_type: BloodType | null;
  allergies: string | null;
  notes: string | null;
  medical_history: string | null;
  current_medications: string | null;
  created_at: string;
}

export interface PatientVisit {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  visit_date: string;
  summary: string;
  diagnosis: string | null;
  treatment: string | null;
  created_by: string;
  created_at: string;
}

export interface PatientMedication {
  id: string;
  patient_id: string;
  name: string;
  dosage: string;
  frequency: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  notes: string | null;
  created_at: string;
}

export interface DoctorAvailability {
  id: string;
  doctor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  doctor_id: string | null;
  created_at: string;
}

export interface Doctor { 
  id: string;
  first_name: string;
  last_name: string;
  specialty: string;
  phone: string;
  email: string | null;
  office: string | null;
  status: DoctorStatus;
  bio: string | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  duration_minutes: number;
  reason: string;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
}

export interface AppointmentWithRelations extends Appointment {
  patient: Pick<Patient, 'id' | 'first_name' | 'last_name'>;
  doctor: Pick<Doctor, 'id' | 'first_name' | 'last_name' | 'specialty'>;
}

export type PatientInput = Omit<Patient, 'id' | 'created_at'>;
export type DoctorInput = Omit<Doctor, 'id' | 'created_at'>;
export type PatientVisitInput = Omit<PatientVisit, 'id' | 'created_at' | 'created_by'>;
export type PatientMedicationInput = Omit<PatientMedication, 'id' | 'created_at'>;
export type InvoiceStatus = 'paid' | 'unpaid' | 'partially_paid';
export type InvoiceItemCategory = 'consultation' | 'tests' | 'medication' | 'other';

export interface Invoice {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  invoice_number: string;
  status: InvoiceStatus;
  date_issued: string;
  due_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  category: InvoiceItemCategory;
  description: string;
  amount: number;
}

export interface InvoiceWithRelations extends Invoice {
  patient: Pick<Patient, 'id' | 'first_name' | 'last_name'>;
  appointment: Pick<Appointment, 'id' | 'reason' | 'appointment_date'> | null;
  items: InvoiceItem[];
}

export interface Prescription {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  visit_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface PrescriptionItem {
  id: string;
  prescription_id: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string | null;
}

export interface PrescriptionWithItems extends Prescription {
  items: PrescriptionItem[];
  patient: Pick<Patient, 'id' | 'first_name' | 'last_name'>;
  doctor: Pick<Doctor, 'id' | 'first_name' | 'last_name' | 'specialty'> | null;
}

export type LabReportStatus = 'normal' | 'abnormal';

export interface LabReport {
  id: string;
  patient_id: string;
  visit_id: string | null;
  appointment_id: string | null;
  test_name: string;
  result_value: string;
  unit: string | null;
  normal_range: string | null;
  status: LabReportStatus;
  report_date: string;
  notes: string | null;
  created_at: string;
}

export type LabReportInput = Omit<LabReport, 'id' | 'created_at' | 'patient_id'>;

export type AppointmentInput = Omit<Appointment, 'id' | 'created_at'>;
