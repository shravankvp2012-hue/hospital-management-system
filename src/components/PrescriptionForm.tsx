import { useState, FormEvent } from 'react';
import { Plus, Trash2, Pill } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { PrescriptionItem } from '@/types/database';
import { Button } from '@/components/Button';
import { Field, Input, Textarea } from '@/components/Field';
import { Modal } from '@/components/Modal';

interface PrescriptionFormProps {
  open: boolean;
  onClose: () => void;
  patientId: string;
  appointmentId?: string;
  visitId?: string;
  onSaved: () => void;
}

interface MedicineRow {
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

const EMPTY_ROW: MedicineRow = { medicine_name: '', dosage: '', frequency: '', duration: '', instructions: '' };

export function PrescriptionForm({ open, onClose, patientId, appointmentId, visitId, onSaved }: PrescriptionFormProps) {
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<MedicineRow[]>([{ ...EMPTY_ROW }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function addRow() { setRows((current) => [...current, { ...EMPTY_ROW }]); }
  function removeRow(index: number) { setRows((current) => current.filter((_, i) => i !== index)); }
  function updateRow(index: number, field: keyof MedicineRow, value: string) { setRows((current) => current.map((row, i) => i === index ? { ...row, [field]: value } : row)); }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('');
    const validRows = rows.filter((r) => r.medicine_name.trim() && r.dosage.trim());
    if (!validRows.length) { setError('Add at least one medicine.'); setSaving(false); return; }
    const { data: rxData, error: rxError } = await supabase.from('prescriptions').insert({
      patient_id: patientId,
      appointment_id: appointmentId || null,
      visit_id: visitId || null,
      notes: notes || null,
    }).select('id').single();
    if (rxError) { setError('Could not create the prescription.'); setSaving(false); return; }
    const prescriptionId = rxData.id;
    const { error: itemsError } = await supabase.from('prescription_items').insert(validRows.map((row) => ({
      prescription_id: prescriptionId,
      medicine_name: row.medicine_name,
      dosage: row.dosage,
      frequency: row.frequency,
      duration: row.duration,
      instructions: row.instructions || null,
    })));
    if (itemsError) { setError('Could not add medicines.'); setSaving(false); return; }
    setNotes(''); setRows([{ ...EMPTY_ROW }]); setSaving(false); onClose(); onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Prescription" subtitle="Add medicines with dosage, frequency, and instructions." footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="prescription-form" disabled={saving}>{saving ? 'Saving...' : 'Save Prescription'}</Button></>}>
      <form id="prescription-form" onSubmit={handleSubmit} className="space-y-5">
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <div><div className="mb-2 flex items-center justify-between"><p className="text-sm font-medium text-slate-700">Medicines</p><Button type="button" size="sm" variant="secondary" onClick={addRow}><Plus className="h-3.5 w-3.5" />Add medicine</Button></div><div className="space-y-3">{rows.map((row, index) => <div key={index} className="rounded-xl border border-slate-200 p-4"><div className="mb-3 flex items-center justify-between"><span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Pill className="h-3.5 w-3.5" />Medicine {index + 1}</span>{rows.length > 1 && <button type="button" onClick={() => removeRow(index)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}</div><div className="space-y-3"><Field label="Medicine name" required><Input required value={row.medicine_name} onChange={(event) => updateRow(index, 'medicine_name', event.target.value)} placeholder="e.g. Amoxicillin" /></Field><div className="grid gap-3 sm:grid-cols-3"><Field label="Dosage" required><Input required value={row.dosage} onChange={(event) => updateRow(index, 'dosage', event.target.value)} placeholder="e.g. 500mg" /></Field><Field label="Frequency" required><Input required value={row.frequency} onChange={(event) => updateRow(index, 'frequency', event.target.value)} placeholder="e.g. 3x daily" /></Field><Field label="Duration" required><Input required value={row.duration} onChange={(event) => updateRow(index, 'duration', event.target.value)} placeholder="e.g. 7 days" /></Field></div><Field label="Special instructions"><Textarea rows={2} value={row.instructions} onChange={(event) => updateRow(index, 'instructions', event.target.value)} placeholder="e.g. Take with food" /></Field></div></div>)}</div></div>
        <Field label="General notes"><Textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Additional prescription notes..." /></Field>
      </form>
    </Modal>
  );
}

export function printPrescription(patientName: string, doctorName: string, specialty: string, date: string, items: Pick<PrescriptionItem, 'medicine_name' | 'dosage' | 'frequency' | 'duration' | 'instructions'>[], notes?: string | null) {
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) return;
  printWindow.document.write(`<!DOCTYPE html><html><head><title>Prescription — ${patientName}</title><style>body{font-family:Georgia,serif;max-width:600px;margin:40px auto;padding:20px;color:#1e293b}h1{font-size:22px;margin:0;color:#0891b2}h2{font-size:13px;color:#64748b;margin:4px 0 0}.header{border-bottom:2px solid #0891b2;padding-bottom:16px;margin-bottom:24px}.info{display:flex;justify-content:space-between;margin-bottom:24px;font-size:13px}.rx-symbol{font-size:36px;font-style:italic;color:#0891b2;margin-bottom:16px}table{width:100%;border-collapse:collapse}th{text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;border-bottom:1px solid #e2e8f0;padding:8px}td{padding:10px 8px;border-bottom:1px solid #f1f5f9;font-size:13px;vertical-align:top}.footer{margin-top:24px;border-top:1px solid #e2e8f0;padding-top:16px}.signature{margin-top:48px;border-top:1px solid #64748b;width:200px;padding-top:4px;font-size:13px}</style></head><body><div class="header"><h1>MediCore Hospital</h1><h2>Prescription</h2></div><div class="info"><div><strong>Patient:</strong><br>${patientName}</div><div><strong>Date:</strong><br>${date}</div></div>${doctorName ? `<div class="info"><div><strong>Doctor:</strong><br>${doctorName}${specialty ? ` · ${specialty}` : ''}</div></div>` : ''}<div class="rx-symbol">Rx</div><table><thead><tr><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Instructions</th></tr></thead><tbody>${items.map((item) => `<tr><td><strong>${item.medicine_name}</strong></td><td>${item.dosage}</td><td>${item.frequency}</td><td>${item.duration}</td><td>${item.instructions ?? ''}</td></tr>`).join('')}</tbody></table>${notes ? `<div class="footer"><strong>Notes:</strong> ${notes}</div>` : ''}<div class="signature">${doctorName ?? ''}</div></body></html>`);
  printWindow.document.close();
  printWindow.print();
}
