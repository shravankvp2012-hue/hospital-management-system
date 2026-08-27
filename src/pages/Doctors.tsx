import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Plus, Search, Stethoscope, Pencil, Trash2, Phone, Mail, MapPin, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Doctor, DoctorInput, DoctorStatus } from '@/types/database';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { EmptyState, FullPageSpinner } from '@/components/Feedback';
import { Field, Input, Select } from '@/components/Field';
import { Modal } from '@/components/Modal';
import { DOCTOR_STATUS_LABELS, DOCTOR_STATUS_STYLES, fullName, initials, StatusBadge } from '@/lib/utils';

const SPECIALTIES = ['Cardiology', 'Dermatology', 'General Medicine', 'Neurology', 'Oncology', 'Orthopedics', 'Pediatrics', 'Psychiatry', 'Radiology', 'Surgery'];
const EMPTY_FORM: DoctorInput = { first_name: '', last_name: '', specialty: 'General Medicine', phone: '', email: '', office: '', status: 'active', bio: '' };

interface DoctorsProps {
  onOpenDoctor?: (doctorId: string) => void;
}

export function Doctors({ onOpenDoctor }: DoctorsProps) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<Doctor | null>(null);
  const [form, setForm] = useState<DoctorInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function loadDoctors() {
    const { data, error: fetchError } = await supabase.from('doctors').select('*').order('last_name');
    if (fetchError) setError('Could not load doctor records.');
    setDoctors((data ?? []) as Doctor[]);
    setLoading(false);
  }
  useEffect(() => { loadDoctors(); }, []);

  const filteredDoctors = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return doctors.filter((doctor) => {
      const matchesSpecialty = specialtyFilter === 'all' || doctor.specialty === specialtyFilter;
      const matchesQuery = !normalizedQuery || [doctor.first_name, doctor.last_name, doctor.specialty, doctor.email ?? ''].join(' ').toLowerCase().includes(normalizedQuery);
      return matchesSpecialty && matchesQuery;
    });
  }, [doctors, query, specialtyFilter]);

  function updateField<K extends keyof DoctorInput>(key: K, value: DoctorInput[K]) { setForm((current) => ({ ...current, [key]: value })); }
  function openCreate() { setSelected(null); setForm(EMPTY_FORM); setError(''); setModalOpen(true); }
  function openEdit(doctor: Doctor) { setSelected(doctor); setForm({ first_name: doctor.first_name, last_name: doctor.last_name, specialty: doctor.specialty, phone: doctor.phone, email: doctor.email ?? '', office: doctor.office ?? '', status: doctor.status, bio: doctor.bio ?? '' }); setError(''); setModalOpen(true); }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('');
    const payload = { ...form, email: form.email || null, office: form.office || null, bio: form.bio || null };
    const result = selected ? await supabase.from('doctors').update(payload).eq('id', selected.id) : await supabase.from('doctors').insert(payload);
    if (result.error) { setError('Could not save this doctor record.'); setSaving(false); return; }
    await loadDoctors(); setSaving(false); setModalOpen(false);
  }
  async function handleDelete(doctor: Doctor) {
    if (!window.confirm(`Remove Dr. ${fullName(doctor.first_name, doctor.last_name)} from the doctor list?`)) return;
    setDeleting(doctor.id); const { error: deleteError } = await supabase.from('doctors').delete().eq('id', doctor.id);
    if (deleteError) setError('Could not remove this doctor record.'); else setDoctors((current) => current.filter((item) => item.id !== doctor.id)); setDeleting(null);
  }

  if (loading) return <FullPageSpinner label="Loading doctors..." />;
  return <div>
    <PageHeader title="Doctors" subtitle={`${doctors.length} doctor${doctors.length === 1 ? '' : 's'} on staff`} actions={<Button onClick={openCreate}><Plus className="h-4 w-4" />Add Doctor</Button>} />
    <div className="mb-5 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:flex-row lg:items-center"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or specialization..." className="pl-10" />{query && <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X className="h-4 w-4" /></button>}</div><Select value={specialtyFilter} onChange={(event) => setSpecialtyFilter(event.target.value)} className="min-w-[160px]"><option value="all">All specializations</option>{SPECIALTIES.map((specialty) => <option key={specialty} value={specialty}>{specialty}</option>)}</Select></div>
    {error && !modalOpen && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {filteredDoctors.length === 0 ? <EmptyState icon={<Stethoscope className="h-7 w-7" />} title={query ? 'No doctors found' : 'No doctors yet'} description={query ? 'Try a different name or specialty.' : 'Add your first doctor to manage your hospital staff.'} action={!query && <Button onClick={openCreate}><Plus className="h-4 w-4" />Add Doctor</Button>} /> : <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{filteredDoctors.map((doctor) => <div key={doctor.id} onClick={() => onOpenDoctor?.(doctor.id)} className="group cursor-pointer rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:ring-slate-300"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-100 to-cyan-100 text-sm font-bold text-teal-700">{initials(doctor.first_name, doctor.last_name)}</div><div><p className="text-sm font-bold text-slate-900">Dr. {fullName(doctor.first_name, doctor.last_name)}</p><p className="mt-0.5 text-xs text-cyan-600">{doctor.specialty}</p></div></div><StatusBadge label={DOCTOR_STATUS_LABELS[doctor.status]} className={DOCTOR_STATUS_STYLES[doctor.status]} /></div><div className="mt-5 space-y-2 border-t border-slate-100 pt-4"><p className="flex items-center gap-2 text-xs text-slate-600"><Phone className="h-3.5 w-3.5 text-slate-400" />{doctor.phone}</p>{doctor.email && <p className="flex items-center gap-2 truncate text-xs text-slate-600"><Mail className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />{doctor.email}</p>}{doctor.office && <p className="flex items-center gap-2 text-xs text-slate-600"><MapPin className="h-3.5 w-3.5 text-slate-400" />{doctor.office}</p>}</div><div className="mt-4 flex justify-end gap-1 border-t border-slate-100 pt-3 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"><button onClick={(event) => { event.stopPropagation(); openEdit(doctor); }} className="rounded-lg p-2 text-slate-400 hover:bg-cyan-50 hover:text-cyan-600"><Pencil className="h-4 w-4" /></button><button onClick={(event) => { event.stopPropagation(); handleDelete(doctor); }} disabled={deleting === doctor.id} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div></div>)}</div>}
    <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={selected ? 'Edit Doctor' : 'Add New Doctor'} subtitle="Manage doctor contact and availability details." footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button type="submit" form="doctor-form" disabled={saving}>{saving ? 'Saving...' : selected ? 'Save Changes' : 'Add Doctor'}</Button></>}><form id="doctor-form" onSubmit={handleSubmit} className="space-y-5">{error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}<div className="grid gap-4 sm:grid-cols-2"><Field label="First name" required><Input required value={form.first_name} onChange={(e) => updateField('first_name', e.target.value)} /></Field><Field label="Last name" required><Input required value={form.last_name} onChange={(e) => updateField('last_name', e.target.value)} /></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Specialty" required><Select required value={form.specialty} onChange={(e) => updateField('specialty', e.target.value)}>{SPECIALTIES.map((specialty) => <option key={specialty}>{specialty}</option>)}</Select></Field><Field label="Status" required><Select required value={form.status} onChange={(e) => updateField('status', e.target.value as DoctorStatus)}>{Object.entries(DOCTOR_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Phone" required><Input required type="tel" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} /></Field><Field label="Email"><Input type="email" value={form.email ?? ''} onChange={(e) => updateField('email', e.target.value)} /></Field></div><Field label="Office"><Input placeholder="e.g. Building A, Room 204" value={form.office ?? ''} onChange={(e) => updateField('office', e.target.value)} /></Field><Field label="Specialization bio"><Input placeholder="e.g. Board-certified cardiologist" value={form.bio ?? ''} onChange={(e) => updateField('bio', e.target.value)} /></Field></form></Modal>
  </div>;
}
