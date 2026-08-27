import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Plus, Search, Users, Pencil, Trash2, Phone, Mail, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { BloodType, Gender, Patient, PatientInput } from '@/types/database';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { EmptyState, FullPageSpinner } from '@/components/Feedback';
import { Field, Input, Select, Textarea } from '@/components/Field';
import { Modal } from '@/components/Modal';
import {
  calculateAge,
  fullName,
  initials,
  formatDate,
  GENDER_LABELS,
} from '@/lib/utils';

const EMPTY_FORM: PatientInput = {
  first_name: '',
  last_name: '',
  date_of_birth: '',
  gender: 'female',
  phone: '',
  email: '',
  address: '',
  blood_type: null,
  allergies: '',
  notes: '',
  medical_history: '',
  current_medications: '',
};

interface PatientsProps {
  onOpenPatient?: (patientId: string) => void;
  focusPatientId?: string;
}

export function Patients({ onOpenPatient, focusPatientId }: PatientsProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [form, setForm] = useState<PatientInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function loadPatients() {
    const { data, error: fetchError } = await supabase
      .from('patients')
      .select('*')
      .order('last_name', { ascending: true });
    if (fetchError) setError('Could not load patient records.');
    setPatients((data ?? []) as Patient[]);
    setLoading(false);
  }

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    const patient = patients.find((item) => item.id === focusPatientId);
    if (patient) openEdit(patient);
  }, [focusPatientId, patients]);

  const filteredPatients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return patients;
    return patients.filter((patient) =>
      [patient.first_name, patient.last_name, patient.phone, patient.email ?? '']
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [patients, query]);

  function openCreate() {
    setSelected(null);
    setForm(EMPTY_FORM);
    setError('');
    setModalOpen(true);
  }

  function openEdit(patient: Patient) {
    setSelected(patient);
    setForm({
      first_name: patient.first_name,
      last_name: patient.last_name,
      date_of_birth: patient.date_of_birth,
      gender: patient.gender,
      phone: patient.phone,
      email: patient.email ?? '',
      address: patient.address ?? '',
      blood_type: patient.blood_type,
      allergies: patient.allergies ?? '',
      notes: patient.notes ?? '',
      medical_history: patient.medical_history ?? '',
      current_medications: patient.current_medications ?? '',
    });
    setError('');
    setModalOpen(true);
  }

  function updateField<K extends keyof PatientInput>(key: K, value: PatientInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      ...form,
      email: form.email || null,
      address: form.address || null,
      allergies: form.allergies || null,
      notes: form.notes || null,
      medical_history: form.medical_history || null,
      current_medications: form.current_medications || null,
    };
    const result = selected
      ? await supabase.from('patients').update(payload).eq('id', selected.id)
      : await supabase.from('patients').insert(payload);
    if (result.error) {
      setError('Could not save this patient record.');
      setSaving(false);
      return;
    }
    await loadPatients();
    setSaving(false);
    setModalOpen(false);
  }

  async function handleDelete(patient: Patient) {
    if (!window.confirm(`Remove ${fullName(patient.first_name, patient.last_name)} from the patient list?`)) return;
    setDeleting(patient.id);
    const { error: deleteError } = await supabase.from('patients').delete().eq('id', patient.id);
    if (deleteError) setError('Could not remove this patient record.');
    else setPatients((current) => current.filter((item) => item.id !== patient.id));
    setDeleting(null);
  }

  if (loading) return <FullPageSpinner label="Loading patients..." />;

  return (
    <div>
      <PageHeader
        title="Patients"
        subtitle={`${patients.length} patient${patients.length === 1 ? '' : 's'} in your records`}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Patient
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search patients..."
            className="pl-10"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {query && <p className="text-sm text-slate-500">{filteredPatients.length} result{filteredPatients.length === 1 ? '' : 's'}</p>}
      </div>

      {error && !modalOpen && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {filteredPatients.length === 0 ? (
        <EmptyState
          icon={<Users className="h-7 w-7" />}
          title={query ? 'No patients found' : 'No patients yet'}
          description={query ? 'Try a different name, phone number, or email.' : 'Add your first patient to begin building your records.'}
          action={!query && <Button onClick={openCreate}><Plus className="h-4 w-4" />Add Patient</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="hidden grid-cols-[minmax(220px,1.4fr)_minmax(150px,1fr)_minmax(190px,1fr)_110px] gap-4 border-b border-slate-100 bg-slate-50/70 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 md:grid">
            <span>Patient</span><span>Birth date</span><span>Contact</span><span className="text-right">Actions</span>
          </div>
          <div className="divide-y divide-slate-100">
            {filteredPatients.map((patient) => (
              <div key={patient.id} onClick={() => onOpenPatient?.(patient.id)} className="grid cursor-pointer gap-4 px-5 py-4 transition-colors hover:bg-slate-50/50 md:grid-cols-[minmax(220px,1.4fr)_minmax(150px,1fr)_minmax(190px,1fr)_110px] md:items-center md:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-sm font-bold text-cyan-700">{initials(patient.first_name, patient.last_name)}</div>
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{fullName(patient.first_name, patient.last_name)}</p><p className="text-xs text-slate-500">{calculateAge(patient.date_of_birth)} years · {GENDER_LABELS[patient.gender]}</p></div>
                </div>
                <div><p className="text-sm text-slate-700">{formatDate(patient.date_of_birth)}</p><p className="mt-0.5 text-xs text-slate-400">{patient.blood_type ?? 'Blood type not set'}</p></div>
                <div className="space-y-1"><p className="flex items-center gap-1.5 text-xs text-slate-600"><Phone className="h-3.5 w-3.5 text-slate-400" />{patient.phone}</p>{patient.email && <p className="flex items-center gap-1.5 truncate text-xs text-slate-500"><Mail className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />{patient.email}</p>}</div>
                <div className="flex items-center justify-start gap-1 md:justify-end"><button onClick={(event) => { event.stopPropagation(); openEdit(patient); }} className="rounded-lg p-2 text-slate-400 hover:bg-cyan-50 hover:text-cyan-600" aria-label={`Edit ${fullName(patient.first_name, patient.last_name)}`}><Pencil className="h-4 w-4" /></button><button onClick={(event) => { event.stopPropagation(); handleDelete(patient); }} disabled={deleting === patient.id} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50" aria-label={`Delete ${fullName(patient.first_name, patient.last_name)}`}><Trash2 className="h-4 w-4" /></button></div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={selected ? 'Edit Patient' : 'Add New Patient'} subtitle="Keep patient information accurate and up to date." footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button type="submit" form="patient-form" disabled={saving}>{saving ? 'Saving...' : selected ? 'Save Changes' : 'Add Patient'}</Button></>}>
        <form id="patient-form" onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div className="grid gap-4 sm:grid-cols-2"><Field label="First name" required><Input required value={form.first_name} onChange={(e) => updateField('first_name', e.target.value)} /></Field><Field label="Last name" required><Input required value={form.last_name} onChange={(e) => updateField('last_name', e.target.value)} /></Field></div>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Date of birth" required><Input required type="date" value={form.date_of_birth} onChange={(e) => updateField('date_of_birth', e.target.value)} /></Field><Field label="Gender" required><Select required value={form.gender} onChange={(e) => updateField('gender', e.target.value as Gender)}><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></Select></Field></div>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Phone" required><Input required type="tel" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} /></Field><Field label="Email"><Input type="email" value={form.email ?? ''} onChange={(e) => updateField('email', e.target.value)} /></Field></div>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Blood type"><Select value={form.blood_type ?? ''} onChange={(e) => updateField('blood_type', (e.target.value || null) as BloodType | null)}><option value="">Not specified</option>{['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((type) => <option key={type} value={type}>{type}</option>)}</Select></Field><Field label="Address"><Input value={form.address ?? ''} onChange={(e) => updateField('address', e.target.value)} /></Field></div>
          <Field label="Allergies"><Input placeholder="e.g. Penicillin, peanuts" value={form.allergies ?? ''} onChange={(e) => updateField('allergies', e.target.value)} /></Field>
          <Field label="Medical history"><Textarea rows={3} placeholder="Relevant medical history..." value={form.medical_history ?? ''} onChange={(e) => updateField('medical_history', e.target.value)} /></Field>
          <Field label="Current medications"><Textarea rows={3} placeholder="Medication names and instructions..." value={form.current_medications ?? ''} onChange={(e) => updateField('current_medications', e.target.value)} /></Field>
          <Field label="Notes"><Textarea rows={3} placeholder="Additional medical notes..." value={form.notes ?? ''} onChange={(e) => updateField('notes', e.target.value)} /></Field>
        </form>
      </Modal>
    </div>
  );
}
