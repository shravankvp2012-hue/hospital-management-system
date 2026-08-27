import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Plus, Receipt, Search, X, Trash2, ChevronDown, ChevronRight, Printer } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { AppointmentWithRelations, InvoiceItem, InvoiceItemCategory, InvoiceStatus, InvoiceWithRelations, Patient } from '@/types/database';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { EmptyState, FullPageSpinner } from '@/components/Feedback';
import { Field, Input, Select, Textarea } from '@/components/Field';
import { Modal } from '@/components/Modal';
import { InvoicePreview } from '@/components/InvoicePreview';
import { INVOICE_ITEM_CATEGORIES, INVOICE_ITEM_CATEGORY_LABELS, INVOICE_STATUS_LABELS, INVOICE_STATUS_STYLES, formatCurrency, formatDate, fullName, generateInvoiceNumber, initials, StatusBadge } from '@/lib/utils';

interface BillingProps {
  preselectAppointmentId?: string;
}

export function Billing({ preselectAppointmentId }: BillingProps) {
  const [invoices, setInvoices] = useState<InvoiceWithRelations[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceWithRelations | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    patient_id: '',
    appointment_id: '',
    date_issued: new Date().toISOString().slice(0, 10),
    due_date: '',
    notes: '',
  });
  const [items, setItems] = useState<{ category: InvoiceItemCategory; description: string; amount: string }[]>([
    { category: 'consultation', description: '', amount: '' },
  ]);

  async function loadData() {
    const [invoicesRes, patientsRes, appointmentsRes] = await Promise.all([
      supabase.from('invoices').select('id,patient_id,appointment_id,invoice_number,status,date_issued,due_date,notes,created_at,patient:patients(id,first_name,last_name),appointment:appointments(id,reason,appointment_date),items:invoice_items(id,invoice_id,category,description,amount)').order('date_issued', { ascending: false }),
      supabase.from('patients').select('*').order('last_name'),
      supabase.from('appointments').select('id,patient_id,doctor_id,appointment_date,duration_minutes,reason,status,notes,created_at,patient:patients(id,first_name,last_name),doctor:doctors(id,first_name,last_name,specialty)').order('appointment_date', { ascending: false }),
    ]);
    const firstError = invoicesRes.error ?? patientsRes.error ?? appointmentsRes.error;
    if (firstError) setError('Could not load billing data.');
    setInvoices((invoicesRes.data ?? []) as unknown as InvoiceWithRelations[]);
    setPatients((patientsRes.data ?? []) as Patient[]);
    setAppointments((appointmentsRes.data ?? []) as unknown as AppointmentWithRelations[]);
    setLoading(false);
  }
  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (preselectAppointmentId && appointments.length) {
      const appt = appointments.find((a) => a.id === preselectAppointmentId);
      if (appt) {
        setForm({ patient_id: appt.patient_id, appointment_id: appt.id, date_issued: new Date().toISOString().slice(0, 10), due_date: '', notes: '' });
        setItems([{ category: 'consultation', description: appt.reason, amount: '' }]);
        setModalOpen(true);
      }
    }
  }, [preselectAppointmentId, appointments]);

  const filteredInvoices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return invoices.filter((inv) => {
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
      const matchesQuery = !normalizedQuery || [inv.invoice_number, inv.patient.first_name, inv.patient.last_name].join(' ').toLowerCase().includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [invoices, query, statusFilter]);

  function openCreate() {
    setForm({ patient_id: '', appointment_id: '', date_issued: new Date().toISOString().slice(0, 10), due_date: '', notes: '' });
    setItems([{ category: 'consultation', description: '', amount: '' }]);
    setError('');
    setModalOpen(true);
  }

  function addItem() { setItems((current) => [...current, { category: 'other', description: '', amount: '' }]); }
  function removeItem(index: number) { setItems((current) => current.filter((_, i) => i !== index)); }
  function updateItem(index: number, field: 'category' | 'description' | 'amount', value: string) { setItems((current) => current.map((item, i) => i === index ? { ...item, [field]: value } : item)); }

  const filteredAppointments = appointments.filter((a) => !form.patient_id || a.patient_id === form.patient_id);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('');
    if (!form.patient_id) { setError('Please select a patient.'); setSaving(false); return; }
    const validItems = items
      .map((item) => ({
        ...item,
        description: item.description.trim() || INVOICE_ITEM_CATEGORY_LABELS[item.category],
        amount: parseFloat(item.amount),
      }))
      .filter((item) => !isNaN(item.amount) && item.amount > 0);
    if (!validItems.length) { setError('Add at least one charge item with a valid amount.'); setSaving(false); return; }
    const invoiceNumber = generateInvoiceNumber();
    const { data: invoiceData, error: invoiceError } = await supabase.from('invoices').insert({
      patient_id: form.patient_id,
      appointment_id: form.appointment_id || null,
      invoice_number: invoiceNumber,
      status: 'unpaid',
      date_issued: form.date_issued,
      due_date: form.due_date || null,
      notes: form.notes || null,
    }).select('id').single();
    if (invoiceError) { setError(invoiceError.message || 'Could not create the invoice.'); setSaving(false); return; }
    const invoiceId = invoiceData.id;
    const { error: itemsError } = await supabase.from('invoice_items').insert(validItems.map((item) => ({ invoice_id: invoiceId, category: item.category, description: item.description, amount: item.amount })));
    if (itemsError) { setError(itemsError.message || 'Could not add charge items.'); setSaving(false); return; }
    await loadData(); setSaving(false); setModalOpen(false);
  }

  async function updateStatus(id: string, status: InvoiceStatus) {
    const { error: updateError } = await supabase.from('invoices').update({ status }).eq('id', id);
    if (updateError) setError('Could not update invoice status.');
    else setInvoices((current) => current.map((inv) => inv.id === id ? { ...inv, status } : inv));
  }

  async function handleDelete(invoice: InvoiceWithRelations) {
    if (!window.confirm(`Delete invoice ${invoice.invoice_number}?`)) return;
    const { error: deleteError } = await supabase.from('invoices').delete().eq('id', invoice.id);
    if (deleteError) setError('Could not remove this invoice.');
    else setInvoices((current) => current.filter((inv) => inv.id !== invoice.id));
  }

  function printInvoice(invoice: InvoiceWithRelations) {
    setPreviewInvoice(invoice);
  }

  if (loading) return <FullPageSpinner label="Loading billing..." />;

  return (
    <div>
      <PageHeader title="Billing" subtitle={`${invoices.length} invoice${invoices.length === 1 ? '' : 's'} in the system`} actions={<Button onClick={openCreate}><Plus className="h-4 w-4" />New Invoice</Button>} />
      <div className="mb-5 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:flex-row lg:items-center">
        <div className="relative flex-1"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search invoice number or patient..." className="pl-10" />{query && <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X className="h-4 w-4" /></button>}</div>
        <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="min-w-[130px]"><option value="all">All status</option>{Object.entries(INVOICE_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>
      </div>
      {error && !modalOpen && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {filteredInvoices.length === 0 ? <EmptyState icon={<Receipt className="h-7 w-7" />} title="No invoices found" description="Create a new invoice or adjust your filters." action={<Button onClick={openCreate}><Plus className="h-4 w-4" />New Invoice</Button>} /> : (
        <div className="space-y-3">
          {filteredInvoices.map((invoice) => {
            const total = invoice.items.reduce((sum, item) => sum + Number(item.amount), 0);
            const expanded = expandedId === invoice.id;
            return <div key={invoice.id} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition-all hover:shadow-md">
              <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
                <button onClick={() => setExpandedId(expanded ? null : invoice.id)} className="flex items-center gap-3 lg:w-64">
                  {expanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600"><Receipt className="h-5 w-5" /></div>
                  <div className="text-left"><p className="text-sm font-bold text-slate-900">{invoice.invoice_number}</p><p className="text-xs text-slate-500">{formatDate(invoice.date_issued)}</p></div>
                </button>
                <div className="flex-1 border-l-0 border-slate-100 lg:border-l lg:pl-6"><p className="text-sm font-semibold text-slate-900">{fullName(invoice.patient.first_name, invoice.patient.last_name)}</p>{invoice.appointment && <p className="mt-0.5 text-xs text-slate-500">{invoice.appointment.reason} · {formatDate(invoice.appointment.appointment_date)}</p>}</div>
                <div className="flex items-center gap-3"><p className="text-lg font-bold text-slate-900">{formatCurrency(total)}</p><Select value={invoice.status} onChange={(event) => updateStatus(invoice.id, event.target.value as InvoiceStatus)} className="w-36">{Object.entries(INVOICE_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select><button onClick={() => printInvoice(invoice)} className="rounded-lg p-2 text-slate-400 hover:bg-cyan-50 hover:text-cyan-600" aria-label="Print invoice"><Printer className="h-4 w-4" /></button><button onClick={() => handleDelete(invoice)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete invoice"><Trash2 className="h-4 w-4" /></button></div>
              </div>
              {expanded && <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4 lg:px-8"><div className="mb-3 flex items-center justify-between"><StatusBadge label={INVOICE_STATUS_LABELS[invoice.status]} className={INVOICE_STATUS_STYLES[invoice.status]} />{invoice.due_date && <p className="text-xs text-slate-500">Due: {formatDate(invoice.due_date)}</p>}</div><div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-100"><table className="w-full"><thead><tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-500"><th className="px-4 py-2.5 text-left">Category</th><th className="px-4 py-2.5 text-left">Description</th><th className="px-4 py-2.5 text-right">Amount</th></tr></thead><tbody>{invoice.items.map((item) => <tr key={item.id} className="border-b border-slate-50 text-sm"><td className="px-4 py-2.5 text-slate-600">{INVOICE_ITEM_CATEGORY_LABELS[item.category]}</td><td className="px-4 py-2.5 text-slate-700">{item.description}</td><td className="px-4 py-2.5 text-right font-medium text-slate-900">{formatCurrency(Number(item.amount))}</td></tr>)}</tbody><tfoot><tr className="bg-slate-50"><td colSpan={2} className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Total</td><td className="px-4 py-3 text-right text-base font-bold text-slate-900">{formatCurrency(total)}</td></tr></tfoot></table></div>{invoice.notes && <p className="mt-3 text-xs text-slate-500">Notes: {invoice.notes}</p>}</div>}
            </div>;
          })}
        </div>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Invoice" subtitle="Create an itemized invoice for a patient." footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button type="submit" form="invoice-form" disabled={saving}>{saving ? 'Saving...' : 'Create Invoice'}</Button></>}>
        <form id="invoice-form" onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Patient" required><Select required value={form.patient_id} onChange={(event) => setForm({ ...form, patient_id: event.target.value, appointment_id: '' })}><option value="">Select patient</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{fullName(patient.first_name, patient.last_name)}</option>)}</Select></Field><Field label="Appointment (optional)"><Select value={form.appointment_id} onChange={(event) => setForm({ ...form, appointment_id: event.target.value })}><option value="">None</option>{filteredAppointments.map((appt) => <option key={appt.id} value={appt.id}>{appt.reason} · {formatDate(appt.appointment_date)}</option>)}</Select></Field></div>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Date issued" required><Input required type="date" value={form.date_issued} onChange={(event) => setForm({ ...form, date_issued: event.target.value })} /></Field><Field label="Due date"><Input type="date" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} /></Field></div>
          <div><div className="mb-2 flex items-center justify-between"><p className="text-sm font-medium text-slate-700">Charge items</p><Button type="button" size="sm" variant="secondary" onClick={addItem}><Plus className="h-3.5 w-3.5" />Add item</Button></div><div className="space-y-3">{items.map((item, index) => <div key={index} className="flex gap-2"><Select value={item.category} onChange={(event) => updateItem(index, 'category', event.target.value)} className="w-36"><option value="consultation">Consultation</option><option value="tests">Tests</option><option value="medication">Medication</option><option value="other">Other</option></Select><Input placeholder="Description" value={item.description} onChange={(event) => updateItem(index, 'description', event.target.value)} className="flex-1" /><Input placeholder="0.00" type="number" step="0.01" value={item.amount} onChange={(event) => updateItem(index, 'amount', event.target.value)} className="w-24" />{items.length > 1 && <button type="button" onClick={() => removeItem(index)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}</div>)}</div></div>
          <Field label="Notes"><Textarea rows={2} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
        </form>
      </Modal>
      {previewInvoice && <InvoicePreview invoice={previewInvoice} onClose={() => setPreviewInvoice(null)} />}
    </div>
  );
}
