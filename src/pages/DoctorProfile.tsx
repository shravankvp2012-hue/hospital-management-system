import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarClock, Mail, MapPin, Phone, Plus, Save, Stethoscope, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Doctor, DoctorAvailability } from '@/types/database';
import { Button } from '@/components/Button';
import { Field, Input, Select, Textarea } from '@/components/Field';
import { Modal } from '@/components/Modal';
import { FullPageSpinner } from '@/components/Feedback';
import { DOCTOR_STATUS_LABELS, DOCTOR_STATUS_STYLES, fullName, initials, StatusBadge } from '@/lib/utils';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
interface DoctorProfileProps { doctorId: string; onBack: () => void; }

export function DoctorProfile({ doctorId, onBack }: DoctorProfileProps) {
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [availability, setAvailability] = useState<DoctorAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [slot, setSlot] = useState({ day_of_week: 1, start_time: '09:00', end_time: '17:00' });
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const [doctorResult, availabilityResult] = await Promise.all([supabase.from('doctors').select('*').eq('id', doctorId).maybeSingle(), supabase.from('doctor_availability').select('*').eq('doctor_id', doctorId).order('day_of_week').order('start_time')]);
    if (doctorResult.error || availabilityResult.error || !doctorResult.data) setError('This doctor profile could not be loaded.');
    setDoctor(doctorResult.data as Doctor | null); setBio(doctorResult.data?.bio ?? ''); setAvailability((availabilityResult.data ?? []) as DoctorAvailability[]); setLoading(false);
  }
  useEffect(() => { load(); }, [doctorId]);

  async function addSlot(event: FormEvent) { event.preventDefault(); setSaving(true); setError(''); const { error: insertError } = await supabase.from('doctor_availability').insert({ doctor_id: doctorId, ...slot }); if (insertError) setError('Could not save this availability slot.'); else { setModalOpen(false); await load(); } setSaving(false); }
  async function saveBio() { setSaving(true); const { error: updateError } = await supabase.from('doctors').update({ bio }).eq('id', doctorId); if (updateError) setError('Could not save the profile.'); else await load(); setSaving(false); }
  async function removeSlot(id: string) { const { error: deleteError } = await supabase.from('doctor_availability').delete().eq('id', id); if (deleteError) setError('Could not remove this availability slot.'); else setAvailability((current) => current.filter((item) => item.id !== id)); }

  const grouped = useMemo(() => DAYS.map((day, index) => ({ day, slots: availability.filter((item) => item.day_of_week === index && item.is_available) })), [availability]);
  if (loading) return <FullPageSpinner label="Loading doctor profile..." />;
  if (!doctor) return <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">{error || 'Doctor not found.'}</div>;
  return <div><button onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Back to doctors</button>{error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}<div className="mb-6 flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-100 to-cyan-100 text-lg font-bold text-teal-700">{initials(doctor.first_name, doctor.last_name)}</div><div><div className="flex items-center gap-3"><h1 className="text-2xl font-bold text-slate-900">Dr. {fullName(doctor.first_name, doctor.last_name)}</h1><StatusBadge label={DOCTOR_STATUS_LABELS[doctor.status]} className={DOCTOR_STATUS_STYLES[doctor.status]} /></div><p className="mt-1 text-sm font-medium text-cyan-700">{doctor.specialty}</p></div></div><Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" />Add time slot</Button></div><div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]"><section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"><div className="mb-5 flex items-center gap-2"><Stethoscope className="h-5 w-5 text-cyan-500" /><h2 className="font-bold text-slate-900">Profile details</h2></div><div className="space-y-4 text-sm text-slate-600"><p className="flex items-center gap-3"><Phone className="h-4 w-4 text-slate-400" />{doctor.phone}</p><p className="flex items-center gap-3"><Mail className="h-4 w-4 text-slate-400" />{doctor.email || 'No email recorded'}</p><p className="flex items-center gap-3"><MapPin className="h-4 w-4 text-slate-400" />{doctor.office || 'No office recorded'}</p></div><div className="mt-6 border-t border-slate-100 pt-5"><Field label="Specialization bio"><Textarea rows={5} value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Add a short profile description..." /></Field><Button className="mt-3" size="sm" onClick={saveBio} disabled={saving}><Save className="h-4 w-4" />Save bio</Button></div></section><section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"><div className="mb-5 flex items-center gap-2"><CalendarClock className="h-5 w-5 text-teal-500" /><h2 className="font-bold text-slate-900">Weekly availability</h2></div><div className="space-y-3">{grouped.map(({ day, slots }) => <div key={day} className="flex flex-col gap-2 rounded-xl bg-slate-50 px-4 py-3 sm:flex-row sm:items-center"><p className="w-28 text-sm font-semibold text-slate-700">{day}</p>{slots.length ? <div className="flex flex-wrap gap-2">{slots.map((item) => <span key={item.id} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs text-slate-700 ring-1 ring-slate-200">{item.start_time.slice(0, 5)}–{item.end_time.slice(0, 5)}<button onClick={() => removeSlot(item.id)} className="text-slate-400 hover:text-red-600" aria-label={`Remove ${day} slot`}><Trash2 className="h-3.5 w-3.5" /></button></span>)}</div> : <span className="text-xs text-slate-400">Unavailable</span>}</div>)}</div></section></div><Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add availability slot" subtitle="Set when this doctor accepts appointments." footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button type="submit" form="availability-form" disabled={saving}>Save slot</Button></>}><form id="availability-form" onSubmit={addSlot} className="space-y-5"><Field label="Day" required><Select value={slot.day_of_week} onChange={(event) => setSlot({ ...slot, day_of_week: Number(event.target.value) })}>{DAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}</Select></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Start time" required><Input required type="time" value={slot.start_time} onChange={(event) => setSlot({ ...slot, start_time: event.target.value })} /></Field><Field label="End time" required><Input required type="time" value={slot.end_time} onChange={(event) => setSlot({ ...slot, end_time: event.target.value })} /></Field></div></form></Modal></div>;
}
