import { useState, FormEvent } from 'react';
import { FlaskConical } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { LabReportStatus, PatientVisit } from '@/types/database';
import { Button } from '@/components/Button';
import { Field, Input, Select, Textarea } from '@/components/Field';
import { Modal } from '@/components/Modal';

interface LabReportFormProps {
  open: boolean;
  onClose: () => void;
  patientId: string;
  visits: PatientVisit[];
  preselectVisitId?: string | null;
  onSaved: () => void;
}

export function LabReportForm({ open, onClose, patientId, visits, preselectVisitId, onSaved }: LabReportFormProps) {
  const [form, setForm] = useState({
    visit_id: preselectVisitId ?? '',
    test_name: '',
    result_value: '',
    unit: '',
    normal_range: '',
    status: 'normal' as LabReportStatus,
    report_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('');
    if (!form.test_name.trim() || !form.result_value.trim()) { setError('Test name and result value are required.'); setSaving(false); return; }
    const { error: insertError } = await supabase.from('lab_reports').insert({
      patient_id: patientId,
      visit_id: form.visit_id || null,
      test_name: form.test_name,
      result_value: form.result_value,
      unit: form.unit || null,
      normal_range: form.normal_range || null,
      status: form.status,
      report_date: form.report_date,
      notes: form.notes || null,
    });
    if (insertError) { setError('Could not save the lab report.'); setSaving(false); return; }
    setForm({ visit_id: '', test_name: '', result_value: '', unit: '', normal_range: '', status: 'normal', report_date: new Date().toISOString().slice(0, 10), notes: '' });
    setSaving(false); onClose(); onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Lab Report" subtitle="Record a lab or test result for this patient." footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="lab-report-form" disabled={saving}>{saving ? 'Saving...' : 'Save Report'}</Button></>}>
      <form id="lab-report-form" onSubmit={handleSubmit} className="space-y-5">
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Test name" required><Input required value={form.test_name} onChange={(e) => setForm({ ...form, test_name: e.target.value })} placeholder="e.g. Complete Blood Count" /></Field>
          <Field label="Link to visit (optional)"><Select value={form.visit_id} onChange={(e) => setForm({ ...form, visit_id: e.target.value })}><option value="">None</option>{visits.map((visit) => <option key={visit.id} value={visit.id}>{visit.summary} · {new Date(visit.visit_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</option>)}</Select></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Result value" required><Input required value={form.result_value} onChange={(e) => setForm({ ...form, result_value: e.target.value })} placeholder="e.g. 11.5" /></Field>
          <Field label="Unit"><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="e.g. g/dL" /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Normal range"><Input value={form.normal_range} onChange={(e) => setForm({ ...form, normal_range: e.target.value })} placeholder="e.g. 13.5–17.5" /></Field>
          <Field label="Status" required><Select required value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as LabReportStatus })}><option value="normal">Normal</option><option value="abnormal">Abnormal</option></Select></Field>
        </div>
        <Field label="Report date" required><Input required type="date" value={form.report_date} onChange={(e) => setForm({ ...form, report_date: e.target.value })} /></Field>
        <Field label="Notes"><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." /></Field>
      </form>
    </Modal>
  );
}
