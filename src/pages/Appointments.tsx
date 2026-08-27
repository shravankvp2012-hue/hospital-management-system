import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Plus, CalendarDays, Clock, UserRound, Stethoscope, Trash2, Search, X, Receipt } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { AppointmentInput, AppointmentStatus, AppointmentWithRelations, Doctor, DoctorAvailability, Patient } from '@/types/database';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { EmptyState, FullPageSpinner } from '@/components/Feedback';
import { Field, Input, Select, Textarea } from '@/components/Field';
import { Modal } from '@/components/Modal';
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_STYLES, formatDate, formatTime, fullName, StatusBadge, toLocalDatetimeValue } from '@/lib/utils';

const EMPTY_FORM: AppointmentInput = { patient_id: '', doctor_id: '', appointment_date: '', duration_minutes: 30, reason: '', status: 'scheduled', notes: '' };

interface AppointmentsProps {
  role?: 'admin' | 'doctor' | 'receptionist';
  doctorId?: string | null;
  onGenerateInvoice?: (appointmentId: string) => void;
}

export function Appointments({ role = 'receptionist', doctorId, onGenerateInvoice }: AppointmentsProps) {
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [availability, setAvailability] = useState<DoctorAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<AppointmentInput>(EMPTY_FORM);
  const [statusFilter, setStatusFilter] = useState<'all' | AppointmentStatus>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'upcoming' | 'range'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function loadData() {
    const appointmentsRequest = role === 'doctor' && doctorId
      ? supabase.from('appointments').select('id,patient_id,doctor_id,appointment_date,duration_minutes,reason,status,notes,created_at,patient:patients(id,first_name,last_name),doctor:doctors(id,first_name,last_name,specialty)').eq('doctor_id', doctorId).order('appointment_date', { ascending: true })
      : supabase.from('appointments').select('id,patient_id,doctor_id,appointment_date,duration_minutes,reason,status,notes,created_at,patient:patients(id,first_name,last_name),doctor:doctors(id,first_name,last_name,specialty)').order('appointment_date', { ascending: true });
    const [appointmentsRes, patientsRes, doctorsRes, availabilityRes] = await Promise.all([
      appointmentsRequest,
      supabase.from('patients').select('*').order('last_name'),
      supabase.from('doctors').select('*').eq('status', 'active').order('last_name'),
      supabase.from('doctor_availability').select('*'),
    ]);
    const firstError = appointmentsRes.error ?? patientsRes.error ?? doctorsRes.error ?? availabilityRes.error;
    if (firstError) setError('Could not load appointment data.');
    setAppointments((appointmentsRes.data ?? []) as unknown as AppointmentWithRelations[]);
    setPatients((patientsRes.data ?? []) as Patient[]);
    setDoctors((doctorsRes.data ?? []) as Doctor[]);
    setAvailability((availabilityRes.data ?? []) as DoctorAvailability[]);
    setLoading(false);
  }
  useEffect(() => { loadData(); }, [doctorId, role]);

  const filteredAppointments = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const normalizedQuery = query.trim().toLowerCase();
    const fromTime = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
    const toTime = dateTo ? new Date(dateTo + 'T23:59:59') : null;
    return appointments.filter((appointment) => {
      const appointmentDate = new Date(appointment.appointment_date);
      const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
      let matchesDate = true;
      if (dateFilter === 'today') matchesDate = appointmentDate >= todayStart && appointmentDate <= todayEnd;
      else if (dateFilter === 'upcoming') matchesDate = appointmentDate >= now;
      else if (dateFilter === 'range') {
        if (fromTime && appointmentDate < fromTime) matchesDate = false;
        if (toTime && appointmentDate > toTime) matchesDate = false;
      }
      const matchesQuery = !normalizedQuery || [appointment.patient.first_name, appointment.patient.last_name, appointment.doctor.first_name, appointment.doctor.last_name, appointment.reason].join(' ').toLowerCase().includes(normalizedQuery);
      return matchesStatus && matchesDate && matchesQuery;
    });
  }, [appointments, dateFilter, dateFrom, dateTo, query, statusFilter]);

  function isDoctorAvailable(candidateDoctorId: string, dateValue: string): boolean {
    const date = new Date(dateValue);
    const slots = availability.filter((item) => item.doctor_id === candidateDoctorId && item.day_of_week === date.getDay() && item.is_available);
    if (!availability.some((item) => item.doctor_id === candidateDoctorId)) return true;
    const time = dateValue.slice(11, 16);
    return slots.some((slot) => time >= slot.start_time.slice(0, 5) && time < slot.end_time.slice(0, 5));
  }

  const availableDoctors = doctors.filter((doctor) => isDoctorAvailable(doctor.id, form.appointment_date));

  function openCreate() {
    const defaultDate = new Date();
    defaultDate.setMinutes(Math.ceil(defaultDate.getMinutes() / 30) * 30, 0, 0);
    const defaultDateValue = toLocalDatetimeValue(defaultDate);
    const firstAvailable = doctors.find((doctor) => isDoctorAvailable(doctor.id, defaultDateValue));
    setForm({ ...EMPTY_FORM, appointment_date: defaultDateValue, patient_id: patients[0]?.id ?? '', doctor_id: firstAvailable?.id ?? '' });
    setError(''); setModalOpen(true);
  }
  function updateField<K extends keyof AppointmentInput>(key: K, value: AppointmentInput[K]) { setForm((current) => ({ ...current, [key]: value })); }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('');
    const result = await supabase.from('appointments').insert({ ...form, appointment_date: new Date(form.appointment_date).toISOString(), notes: form.notes || null });
    if (result.error) { setError('Could not schedule this appointment.'); setSaving(false); return; }
    await loadData(); setSaving(false); setModalOpen(false);
  }
  async function updateStatus(id: string, status: AppointmentStatus) {
    const { error: updateError } = await supabase.from('appointments').update({ status }).eq('id', id);
    if (updateError) setError('Could not update the appointment status.'); else setAppointments((current) => current.map((item) => item.id === id ? { ...item, status } : item));
  }
  async function handleDelete(appointment: AppointmentWithRelations) {
    if (!window.confirm(`Delete the appointment for ${fullName(appointment.patient.first_name, appointment.patient.last_name)}?`)) return;
    setDeleting(appointment.id); const { error: deleteError } = await supabase.from('appointments').delete().eq('id', appointment.id);
    if (deleteError) setError('Could not remove this appointment.'); else setAppointments((current) => current.filter((item) => item.id !== appointment.id)); setDeleting(null);
  }

  if (loading) return <FullPageSpinner label="Loading appointments..." />;
  return <div>
    <PageHeader title="Appointments" subtitle={`${appointments.length} appointment${appointments.length === 1 ? '' : 's'} in the system`} actions={<Button onClick={openCreate} disabled={!patients.length || !doctors.length}><Plus className="h-4 w-4" />New Appointment</Button>} />
    {(!patients.length || !doctors.length) && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Add at least one patient and one active doctor before scheduling an appointment.</div>}
    <div className="mb-5 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:flex-row lg:items-center"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search patient or doctor name..." className="pl-10" />{query && <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X className="h-4 w-4" /></button>}</div><div className="flex flex-wrap gap-2"><Select value={dateFilter} onChange={(event) => setDateFilter(event.target.value as typeof dateFilter)} className="min-w-[130px]"><option value="all">All dates</option><option value="today">Today</option><option value="upcoming">Upcoming</option><option value="range">Date range</option></Select>{dateFilter === 'range' && <><Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="w-[150px]" placeholder="From" /><Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="w-[150px]" placeholder="To" /></>}<Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="min-w-[130px]"><option value="all">All status</option>{Object.entries(APPOINTMENT_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></div></div>
    {error && !modalOpen && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {filteredAppointments.length === 0 ? <EmptyState icon={<CalendarDays className="h-7 w-7" />} title="No appointments found" description="Try changing your filters or schedule a new appointment." action={patients.length > 0 && doctors.length > 0 ? <Button onClick={openCreate}><Plus className="h-4 w-4" />New Appointment</Button> : undefined} /> : <div className="space-y-3">{filteredAppointments.map((appointment) => <div key={appointment.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition-all hover:shadow-md"><div className="flex flex-col gap-4 lg:flex-row lg:items-center"><div className="flex items-center gap-3 lg:w-56"><div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600"><CalendarDays className="h-5 w-5" /></div><div><p className="text-sm font-bold text-slate-900">{formatDate(appointment.appointment_date)}</p><p className="flex items-center gap-1 text-xs text-slate-500"><Clock className="h-3 w-3" />{formatTime(appointment.appointment_date)} · {appointment.duration_minutes} min</p></div></div><div className="flex-1 border-l-0 border-slate-100 lg:border-l lg:pl-6"><p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900"><UserRound className="h-3.5 w-3.5 text-slate-400" />{fullName(appointment.patient.first_name, appointment.patient.last_name)}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><Stethoscope className="h-3.5 w-3.5 text-slate-400" />Dr. {fullName(appointment.doctor.first_name, appointment.doctor.last_name)} · {appointment.doctor.specialty}</p></div><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-xs text-slate-400">Reason</p><p className="max-w-40 truncate text-sm text-slate-700">{appointment.reason}</p></div><Select value={appointment.status} onChange={(event) => updateStatus(appointment.id, event.target.value as AppointmentStatus)} className="w-32"><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="no_show">No Show</option></Select><button onClick={() => handleDelete(appointment)} disabled={deleting === appointment.id} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>{onGenerateInvoice && <button onClick={() => onGenerateInvoice(appointment.id)} className="rounded-lg p-2 text-slate-400 hover:bg-cyan-50 hover:text-cyan-600" aria-label="Generate invoice"><Receipt className="h-4 w-4" /></button>}</div></div><div className="flex justify-end lg:hidden"><StatusBadge label={APPOINTMENT_STATUS_LABELS[appointment.status]} className={APPOINTMENT_STATUS_STYLES[appointment.status]} /></div></div>)}</div>}
    <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Appointment" subtitle="Schedule a visit with a patient and doctor." footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button type="submit" form="appointment-form" disabled={saving || !patients.length || !doctors.length}>{saving ? 'Scheduling...' : 'Schedule Appointment'}</Button></>}><form id="appointment-form" onSubmit={handleSubmit} className="space-y-5">{error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}<div className="grid gap-4 sm:grid-cols-2"><Field label="Patient" required><Select required value={form.patient_id} onChange={(e) => updateField('patient_id', e.target.value)}><option value="">Select patient</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{fullName(patient.first_name, patient.last_name)}</option>)}</Select></Field><Field label="Doctor" required><Select required value={form.doctor_id} onChange={(e) => updateField('doctor_id', e.target.value)}><option value="">Select doctor</option>{availableDoctors.map((doctor) => <option key={doctor.id} value={doctor.id}>Dr. {fullName(doctor.first_name, doctor.last_name)} · {doctor.specialty}</option>)}</Select></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Date & time" required><Input required type="datetime-local" value={form.appointment_date} onChange={(e) => { const value = e.target.value; updateField('appointment_date', value); if (form.doctor_id && !isDoctorAvailable(form.doctor_id, value)) updateField('doctor_id', ''); }} /></Field><Field label="Duration" required><Select required value={String(form.duration_minutes)} onChange={(e) => updateField('duration_minutes', Number(e.target.value))}><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option></Select></Field></div><Field label="Reason for visit" required><Input required placeholder="e.g. Annual check-up" value={form.reason} onChange={(e) => updateField('reason', e.target.value)} /></Field><Field label="Notes"><Textarea rows={3} placeholder="Additional details for the appointment..." value={form.notes ?? ''} onChange={(e) => updateField('notes', e.target.value)} /></Field></form></Modal>
  </div>;
}
