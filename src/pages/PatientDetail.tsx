import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, FileText, HeartPulse, Plus, Pill, Printer, Stethoscope, UserRound, FlaskConical } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { LabReport, Patient, PatientMedication, PatientVisit, PrescriptionWithItems } from '@/types/database';
import { Button } from '@/components/Button';
import { Field, Input, Textarea } from '@/components/Field';
import { Modal } from '@/components/Modal';
import { FullPageSpinner } from '@/components/Feedback';
import { PrescriptionForm, printPrescription } from '@/components/PrescriptionForm';
import { LabReportForm } from '@/components/LabReportForm';
import { calculateAge, formatDate, formatDateTime, fullName, initials, LAB_REPORT_STATUS_LABELS, LAB_REPORT_STATUS_STYLES, StatusBadge } from '@/lib/utils';

interface PatientDetailProps { patientId: string; onBack: () => void; onEdit: (patientId: string) => void; }

export function PatientDetail({ patientId, onBack, onEdit }: PatientDetailProps) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<PatientVisit[]>([]);
  const [medications, setMedications] = useState<PatientMedication[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionWithItems[]>([]);
  const [labReports, setLabReports] = useState<LabReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteOpen, setNoteOpen] = useState(false);
  const [rxOpen, setRxOpen] = useState(false);
  const [labOpen, setLabOpen] = useState(false);
  const [note, setNote] = useState({ summary: '', diagnosis: '', treatment: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const [patientResult, visitResult, medicationResult, rxResult, labResult] = await Promise.all([
      supabase.from('patients').select('*').eq('id', patientId).maybeSingle(),
      supabase.from('patient_visits').select('*').eq('patient_id', patientId).order('visit_date', { ascending: false }),
      supabase.from('patient_medications').select('*').eq('patient_id', patientId).order('is_current', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('prescriptions').select('id,patient_id,appointment_id,visit_id,notes,created_at,items:prescription_items(id,prescription_id,medicine_name,dosage,frequency,duration,instructions),patient:patients(id,first_name,last_name),doctor:doctors(id,first_name,last_name,specialty)').eq('patient_id', patientId).order('created_at', { ascending: false }),
      supabase.from('lab_reports').select('*').eq('patient_id', patientId).order('report_date', { ascending: false }),
    ]);
    if (patientResult.error || visitResult.error || medicationResult.error || rxResult.error || labResult.error || !patientResult.data) setError('This patient record could not be loaded.');
    setPatient(patientResult.data as Patient | null);
    setVisits((visitResult.data ?? []) as PatientVisit[]);
    setMedications((medicationResult.data ?? []) as PatientMedication[]);
    setPrescriptions((rxResult.data ?? []) as unknown as PrescriptionWithItems[]);
    setLabReports((labResult.data ?? []) as LabReport[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, [patientId]);

  async function addNote(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('');
    const { error: insertError } = await supabase.from('patient_visits').insert({ patient_id: patientId, summary: note.summary, diagnosis: note.diagnosis || null, treatment: note.treatment || null });
    if (insertError) setError('Could not save the visit note.'); else { setNote({ summary: '', diagnosis: '', treatment: '' }); setNoteOpen(false); await load(); }
    setSaving(false);
  }

  if (loading) return <FullPageSpinner label="Loading patient record..." />;
  if (!patient) return <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">{error || 'Patient not found.'}</div>;

  const rxByVisitId = new Map(prescriptions.filter((rx) => rx.visit_id).map((rx) => [rx.visit_id, rx]));
  const rxStandalone = prescriptions.filter((rx) => !rx.visit_id);
  const labsByVisitId = new Map<string, LabReport[]>();
  labReports.filter((lab) => lab.visit_id).forEach((lab) => {
    const arr = labsByVisitId.get(lab.visit_id!) ?? [];
    arr.push(lab);
    labsByVisitId.set(lab.visit_id!, arr);
  });
  const labsStandalone = labReports.filter((lab) => !lab.visit_id);

  return <div>
    <button onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Back to patients</button>
    {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <div className="mb-6 flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-50 text-lg font-bold text-cyan-700">{initials(patient.first_name, patient.last_name)}</div><div><h1 className="text-2xl font-bold text-slate-900">{fullName(patient.first_name, patient.last_name)}</h1><p className="mt-1 text-sm text-slate-500">{calculateAge(patient.date_of_birth)} years · {patient.gender} · Born {formatDate(patient.date_of_birth)}</p></div></div><div className="flex flex-wrap gap-3"><Button variant="secondary" onClick={() => onEdit(patient.id)}>Edit Patient</Button><Button variant="secondary" onClick={() => setRxOpen(true)}><Pill className="h-4 w-4" />Add Prescription</Button><Button variant="secondary" onClick={() => setLabOpen(true)}><FlaskConical className="h-4 w-4" />Add Lab Report</Button><Button onClick={() => setNoteOpen(true)}><Plus className="h-4 w-4" />Add Visit Note</Button></div></div>
    <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
      <div className="space-y-5">
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"><div className="mb-5 flex items-center gap-2"><HeartPulse className="h-5 w-5 text-cyan-500" /><h2 className="font-bold text-slate-900">Medical overview</h2></div><div className="grid gap-5 sm:grid-cols-2"><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Medical history</p><p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{patient.medical_history || 'No medical history recorded.'}</p></div><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Allergies</p><p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{patient.allergies || 'No known allergies recorded.'}</p></div></div></section>
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"><div className="mb-5 flex items-center gap-2"><FileText className="h-5 w-5 text-cyan-500" /><h2 className="font-bold text-slate-900">Visit history</h2></div>{visits.length === 0 ? <p className="rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-500">No visit notes have been added yet.</p> : <div className="space-y-6">{visits.map((visit) => { const rx = rxByVisitId.get(visit.id); return <div key={visit.id} className="relative border-l-2 border-cyan-100 pl-5"><span className="absolute -left-[7px] top-0 h-3 w-3 rounded-full bg-cyan-500 ring-4 ring-white" /><p className="text-xs font-semibold text-cyan-700">{formatDateTime(visit.visit_date)}</p><p className="mt-2 text-sm font-semibold text-slate-900">{visit.summary}</p>{visit.diagnosis && <p className="mt-1 text-sm text-slate-600"><strong>Diagnosis:</strong> {visit.diagnosis}</p>}{visit.treatment && <p className="mt-1 text-sm text-slate-600"><strong>Treatment:</strong> {visit.treatment}</p>}{rx && <div className="mt-3 rounded-xl bg-teal-50/70 p-4"><div className="mb-2 flex items-center justify-between"><p className="flex items-center gap-1.5 text-xs font-semibold text-teal-700"><Pill className="h-3.5 w-3.5" />Prescription</p><button onClick={() => printPrescription(fullName(patient.first_name, patient.last_name), rx.doctor ? `Dr. ${fullName(rx.doctor.first_name, rx.doctor.last_name)}` : '', rx.doctor?.specialty ?? '', formatDate(rx.created_at), rx.items, rx.notes)} className="rounded-lg p-1.5 text-teal-600 hover:bg-teal-100" aria-label="Print prescription"><Printer className="h-3.5 w-3.5" /></button></div><div className="space-y-1.5">{rx.items.map((item) => <div key={item.id} className="text-xs text-slate-700"><span className="font-semibold">{item.medicine_name}</span> — {item.dosage} · {item.frequency} · {item.duration}{item.instructions ? ` · ${item.instructions}` : ''}</div>)}</div>{rx.notes && <p className="mt-2 text-xs text-slate-500">Notes: {rx.notes}</p>}</div>}{labsByVisitId.has(visit.id) && <div className="mt-3 rounded-xl bg-violet-50/60 p-4"><p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-violet-700"><FlaskConical className="h-3.5 w-3.5" />Lab Reports</p><div className="space-y-2">{labsByVisitId.get(visit.id)!.map((lab) => <div key={lab.id} className="rounded-lg bg-white/70 p-3"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-900">{lab.test_name}</p><StatusBadge label={LAB_REPORT_STATUS_LABELS[lab.status]} className={LAB_REPORT_STATUS_STYLES[lab.status]} /></div><p className="mt-1 text-xs text-slate-600">Result: <span className="font-medium">{lab.result_value}{lab.unit ? ` ${lab.unit}` : ''}</span>{lab.normal_range ? ` (Normal: ${lab.normal_range})` : ''}</p>{lab.notes && <p className="mt-0.5 text-xs text-slate-500">{lab.notes}</p>}<p className="mt-0.5 text-xs text-slate-400">{formatDate(lab.report_date)}</p></div>)}</div></div>}</div>; })}</div>}</section>
        {rxStandalone.length > 0 && <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"><div className="mb-5 flex items-center gap-2"><Pill className="h-5 w-5 text-teal-500" /><h2 className="font-bold text-slate-900">Standalone prescriptions</h2></div><div className="space-y-4">{rxStandalone.map((rx) => <div key={rx.id} className="rounded-xl bg-teal-50/70 p-4"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-semibold text-teal-700">{formatDateTime(rx.created_at)}</p><button onClick={() => printPrescription(fullName(patient.first_name, patient.last_name), rx.doctor ? `Dr. ${fullName(rx.doctor.first_name, rx.doctor.last_name)}` : '', rx.doctor?.specialty ?? '', formatDate(rx.created_at), rx.items, rx.notes)} className="rounded-lg p-1.5 text-teal-600 hover:bg-teal-100" aria-label="Print prescription"><Printer className="h-3.5 w-3.5" /></button></div><div className="space-y-1.5">{rx.items.map((item) => <div key={item.id} className="text-xs text-slate-700"><span className="font-semibold">{item.medicine_name}</span> — {item.dosage} · {item.frequency} · {item.duration}{item.instructions ? ` · ${item.instructions}` : ''}</div>)}</div></div>)}</div></section>}
        {labsStandalone.length > 0 && <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"><div className="mb-5 flex items-center gap-2"><FlaskConical className="h-5 w-5 text-violet-500" /><h2 className="font-bold text-slate-900">Standalone Lab Reports</h2></div><div className="space-y-3">{labsStandalone.map((lab) => <div key={lab.id} className="rounded-xl bg-violet-50/60 p-4"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-900">{lab.test_name}</p><StatusBadge label={LAB_REPORT_STATUS_LABELS[lab.status]} className={LAB_REPORT_STATUS_STYLES[lab.status]} /></div><p className="mt-1 text-xs text-slate-600">Result: <span className="font-medium">{lab.result_value}{lab.unit ? ` ${lab.unit}` : ''}</span>{lab.normal_range ? ` (Normal: ${lab.normal_range})` : ''}</p>{lab.notes && <p className="mt-0.5 text-xs text-slate-500">{lab.notes}</p>}<p className="mt-0.5 text-xs text-slate-400">{formatDate(lab.report_date)}</p></div>)}</div></section>}
      </div>
      <div className="space-y-5"><section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"><div className="mb-5 flex items-center gap-2"><Pill className="h-5 w-5 text-teal-500" /><h2 className="font-bold text-slate-900">Current medications</h2></div>{medications.filter((medication) => medication.is_current).length > 0 ? <div className="space-y-3">{medications.filter((medication) => medication.is_current).map((medication) => <div key={medication.id} className="rounded-xl bg-teal-50/70 p-4"><p className="text-sm font-semibold text-slate-900">{medication.name}</p><p className="mt-1 text-xs text-slate-600">{medication.dosage} · {medication.frequency}</p></div>)}</div> : <p className="text-sm text-slate-500">No current medications recorded.</p>}</section><section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"><div className="mb-5 flex items-center gap-2"><UserRound className="h-5 w-5 text-cyan-500" /><h2 className="font-bold text-slate-900">Contact information</h2></div><div className="space-y-3 text-sm text-slate-600"><p>{patient.phone}</p><p>{patient.email || 'No email recorded'}</p><p>{patient.address || 'No address recorded'}</p><p>Blood type: {patient.blood_type || 'Not specified'}</p></div></section></div>
    </div>
    <Modal open={noteOpen} onClose={() => setNoteOpen(false)} title="Add visit note" subtitle="Record the important details from this patient visit." footer={<><Button variant="secondary" onClick={() => setNoteOpen(false)}>Cancel</Button><Button type="submit" form="visit-note" disabled={saving}>{saving ? 'Saving...' : 'Save note'}</Button></>}><form id="visit-note" onSubmit={addNote} className="space-y-5"><Field label="Visit summary" required><Input required value={note.summary} onChange={(event) => setNote({ ...note, summary: event.target.value })} placeholder="e.g. Follow-up consultation" /></Field><Field label="Diagnosis"><Textarea rows={3} value={note.diagnosis} onChange={(event) => setNote({ ...note, diagnosis: event.target.value })} /></Field><Field label="Treatment / plan"><Textarea rows={3} value={note.treatment} onChange={(event) => setNote({ ...note, treatment: event.target.value })} /></Field></form></Modal>
    <PrescriptionForm open={rxOpen} onClose={() => setRxOpen(false)} patientId={patientId} onSaved={load} />
    <LabReportForm open={labOpen} onClose={() => setLabOpen(false)} patientId={patientId} visits={visits} onSaved={load} />
  </div>;
}
