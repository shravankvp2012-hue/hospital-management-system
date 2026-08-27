import { Printer, Download, X, Activity } from 'lucide-react';
import { Button } from '@/components/Button';
import type { InvoiceWithRelations } from '@/types/database';
import { INVOICE_ITEM_CATEGORY_LABELS, INVOICE_STATUS_LABELS, formatDate, fullName } from '@/lib/utils';

interface InvoicePreviewProps {
  invoice: InvoiceWithRelations;
  onClose: () => void;
}

const HOSPITAL_INFO = {
  name: 'MediCore Hospital',
  address: '123 Healthcare Avenue, Medical District, Bengaluru 560001',
  phone: '+91 80 1234 5678',
  email: 'contact@medicorehospital.com',
};

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(amount);
}

function buildPrintHTML(invoice: InvoiceWithRelations): string {
  const subtotal = invoice.items.reduce((sum, item) => sum + Number(item.amount), 0);
  const discount = 0;
  const tax = 0;
  const grandTotal = subtotal - discount + tax;
  const amountPaid = invoice.status === 'paid' ? grandTotal : 0;
  const balanceDue = grandTotal - amountPaid;
  const patientName = fullName(invoice.patient.first_name, invoice.patient.last_name);
  const serviceDesc = invoice.appointment?.reason ?? 'General Consultation';
  const serviceDate = invoice.appointment ? formatDate(invoice.appointment.appointment_date) : formatDate(invoice.date_issued);
  const statusLabel = INVOICE_STATUS_LABELS[invoice.status];
  const statusColor = invoice.status === 'paid' ? '#065f46' : invoice.status === 'unpaid' ? '#991b1b' : '#92400e';
  const statusBg = invoice.status === 'paid' ? '#d1fae5' : invoice.status === 'unpaid' ? '#fee2e2' : '#fef3c7';

  const rows = invoice.items.map((item) => {
    const desc = `${INVOICE_ITEM_CATEGORY_LABELS[item.category]} — ${item.description}`;
    const amt = Number(item.amount);
    return `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#1e293b">${desc}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center;font-size:13px;color:#64748b">1</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;color:#64748b">${formatINR(amt)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;color:#64748b">${formatINR(0)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;color:#64748b">${formatINR(0)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;font-weight:600;color:#1e293b">${formatINR(amt)}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${invoice.invoice_number} — MediCore Hospital</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', -apple-system, sans-serif; background: #f8fafc; color: #1e293b; padding: 40px 20px; }
  .invoice-sheet { max-width: 800px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .invoice-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 40px 40px 32px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #fff; }
  .hospital-brand { display: flex; align-items: center; gap: 14px; }
  .hospital-logo { width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #22d3ee, #14b8a6); display: flex; align-items: center; justify-content: center; font-size: 24px; }
  .hospital-name { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
  .hospital-sub { font-size: 12px; color: #94a3b8; margin-top: 2px; }
  .invoice-title { text-align: right; }
  .invoice-title h1 { font-size: 28px; font-weight: 800; letter-spacing: 2px; }
  .invoice-title p { font-size: 13px; color: #94a3b8; margin-top: 4px; }
  .invoice-body { padding: 32px 40px; }
  .info-grid { display: flex; justify-content: space-between; gap: 40px; margin-bottom: 32px; flex-wrap: wrap; }
  .info-block { flex: 1; min-width: 200px; }
  .info-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 8px; }
  .info-value { font-size: 14px; color: #1e293b; line-height: 1.6; }
  .info-value strong { font-weight: 600; }
  .status-badge { display: inline-block; padding: 4px 14px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; background: ${statusBg}; color: ${statusColor}; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead th { padding: 12px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; border-bottom: 2px solid #e2e8f0; }
  thead th.right { text-align: right; }
  thead th.center { text-align: center; }
  .totals-section { margin-left: auto; width: 300px; }
  .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; color: #475569; }
  .totals-row.divider { border-top: 1px solid #f1f5f9; margin-top: 8px; padding-top: 12px; }
  .totals-row.grand { font-size: 16px; font-weight: 700; color: #1e293b; border-top: 2px solid #0f172a; margin-top: 8px; padding-top: 12px; }
  .totals-row.paid { color: #065f46; font-weight: 600; }
  .totals-row.balance { color: #991b1b; font-weight: 600; }
  .paid-stamp { margin: 24px 0; text-align: center; }
  .paid-stamp span { display: inline-block; padding: 8px 32px; border: 3px solid ${statusColor}; border-radius: 8px; font-size: 20px; font-weight: 800; letter-spacing: 3px; color: ${statusColor}; transform: rotate(-2deg); }
  .invoice-footer { padding: 24px 40px 40px; text-align: center; border-top: 1px solid #f1f5f9; }
  .invoice-footer p { font-size: 13px; color: #64748b; }
  .invoice-footer .contact { font-size: 11px; color: #94a3b8; margin-top: 8px; }
  @media print {
    body { background: #fff; padding: 0; }
    .invoice-sheet { box-shadow: none; border-radius: 0; max-width: 100%; }
    @page { margin: 0.5in; }
  }
</style>
</head>
<body>
  <div class="invoice-sheet">
    <div class="invoice-header">
      <div class="hospital-brand">
        <div class="hospital-logo">+</div>
        <div>
          <div class="hospital-name">${HOSPITAL_INFO.name}</div>
          <div class="hospital-sub">Healthcare Management System</div>
        </div>
      </div>
      <div class="invoice-title">
        <h1>INVOICE</h1>
        <p>${invoice.invoice_number}</p>
      </div>
    </div>
    <div class="invoice-body">
      <div class="info-grid">
        <div class="info-block">
          <div class="info-label">From</div>
          <div class="info-value">
            <strong>${HOSPITAL_INFO.name}</strong><br/>
            ${HOSPITAL_INFO.address}<br/>
            Tel: ${HOSPITAL_INFO.phone}<br/>
            Email: ${HOSPITAL_INFO.email}
          </div>
        </div>
        <div class="info-block">
          <div class="info-label">Bill To</div>
          <div class="info-value">
            <strong>${patientName}</strong><br/>
            Patient ID: ${invoice.patient.id}<br/>
            Service: ${serviceDesc}<br/>
            Service Date: ${serviceDate}
          </div>
        </div>
        <div class="info-block">
          <div class="info-label">Invoice Details</div>
          <div class="info-value">
            <strong>Invoice #:</strong> ${invoice.invoice_number}<br/>
            <strong>Issued:</strong> ${formatDate(invoice.date_issued)}<br/>
            ${invoice.due_date ? `<strong>Due:</strong> ${formatDate(invoice.due_date)}<br/>` : ''}
            <strong>Status:</strong> <span class="status-badge">${statusLabel}</span>
          </div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th class="center">Qty</th>
            <th class="right">Unit Price</th>
            <th class="right">Discount</th>
            <th class="right">Tax</th>
            <th class="right">Amount</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="totals-section">
        <div class="totals-row"><span>Subtotal</span><span>${formatINR(subtotal)}</span></div>
        <div class="totals-row"><span>Discount</span><span>${formatINR(discount)}</span></div>
        <div class="totals-row"><span>Tax</span><span>${formatINR(tax)}</span></div>
        <div class="totals-row grand"><span>Grand Total</span><span>${formatINR(grandTotal)}</span></div>
        <div class="totals-row paid"><span>Amount Paid</span><span>${formatINR(amountPaid)}</span></div>
        <div class="totals-row balance"><span>Balance Due</span><span>${formatINR(balanceDue)}</span></div>
      </div>
      ${invoice.status === 'paid' ? '<div class="paid-stamp"><span>PAID</span></div>' : ''}
      ${invoice.notes ? `<div style="margin-top:24px;padding:16px;background:#f8fafc;border-radius:8px;font-size:13px;color:#64748b;"><strong>Notes:</strong> ${invoice.notes}</div>` : ''}
    </div>
    <div class="invoice-footer">
      <p>Thank you for choosing ${HOSPITAL_INFO.name}.</p>
      <p class="contact">${HOSPITAL_INFO.phone} · ${HOSPITAL_INFO.email}</p>
    </div>
  </div>
</body>
</html>`;
}

export function InvoicePreview({ invoice, onClose }: InvoicePreviewProps) {
  const subtotal = invoice.items.reduce((sum, item) => sum + Number(item.amount), 0);
  const discount = 0;
  const tax = 0;
  const grandTotal = subtotal - discount + tax;
  const amountPaid = invoice.status === 'paid' ? grandTotal : 0;
  const balanceDue = grandTotal - amountPaid;
  const patientName = fullName(invoice.patient.first_name, invoice.patient.last_name);
  const serviceDesc = invoice.appointment?.reason ?? 'General Consultation';
  const serviceDate = invoice.appointment ? formatDate(invoice.appointment.appointment_date) : formatDate(invoice.date_issued);
  const statusLabel = INVOICE_STATUS_LABELS[invoice.status];
  const statusClass = invoice.status === 'paid' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : invoice.status === 'unpaid' ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-amber-50 text-amber-700 ring-amber-200';

  function handlePrint() {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      alert('Please allow pop-ups to print the invoice.');
      return;
    }
    printWindow.document.write(buildPrintHTML(invoice));
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Action bar */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Invoice Preview</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint}><Printer className="h-4 w-4" />Print Invoice</Button>
            <Button size="sm" variant="secondary" onClick={handlePrint}><Download className="h-4 w-4" />Save as PDF</Button>
            <Button size="sm" variant="secondary" onClick={onClose}><X className="h-4 w-4" />Close</Button>
          </div>
        </div>

        {/* Invoice content */}
        <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            {/* Header */}
            <div className="flex items-start justify-between bg-gradient-to-br from-slate-900 to-slate-800 px-8 py-8 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight">{HOSPITAL_INFO.name}</h1>
                  <p className="text-xs text-slate-400">Healthcare Management System</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-extrabold tracking-widest">INVOICE</p>
                <p className="mt-1 text-xs text-slate-400">{invoice.invoice_number}</p>
              </div>
            </div>

            {/* Info section */}
            <div className="grid gap-6 px-8 py-6 sm:grid-cols-3">
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">From</p>
                <div className="text-sm leading-relaxed text-slate-700">
                  <p className="font-semibold text-slate-900">{HOSPITAL_INFO.name}</p>
                  <p className="text-xs text-slate-500">{HOSPITAL_INFO.address}</p>
                  <p className="text-xs text-slate-500">Tel: {HOSPITAL_INFO.phone}</p>
                  <p className="text-xs text-slate-500">{HOSPITAL_INFO.email}</p>
                </div>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Bill To</p>
                <div className="text-sm leading-relaxed text-slate-700">
                  <p className="font-semibold text-slate-900">{patientName}</p>
                  <p className="text-xs text-slate-500">Patient ID: {invoice.patient.id}</p>
                  <p className="text-xs text-slate-500">Service: {serviceDesc}</p>
                  <p className="text-xs text-slate-500">Service Date: {serviceDate}</p>
                </div>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Invoice Details</p>
                <div className="text-sm leading-relaxed text-slate-700">
                  <p className="text-xs text-slate-500"><span className="font-medium text-slate-700">Invoice #:</span> {invoice.invoice_number}</p>
                  <p className="text-xs text-slate-500"><span className="font-medium text-slate-700">Issued:</span> {formatDate(invoice.date_issued)}</p>
                  {invoice.due_date && <p className="text-xs text-slate-500"><span className="font-medium text-slate-700">Due:</span> {formatDate(invoice.due_date)}</p>}
                  <div className="mt-1.5"><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusClass}`}>{statusLabel}</span></div>
                </div>
              </div>
            </div>

            {/* Items table */}
            <div className="px-8">
              <div className="overflow-hidden rounded-xl ring-1 ring-slate-100">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Description</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Qty</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Unit Price</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Discount</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Tax</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item) => {
                      const amt = Number(item.amount);
                      return (
                        <tr key={item.id} className="border-b border-slate-50">
                          <td className="px-4 py-3 text-sm text-slate-700">{INVOICE_ITEM_CATEGORY_LABELS[item.category]} — {item.description}</td>
                          <td className="px-4 py-3 text-center text-sm text-slate-500">1</td>
                          <td className="px-4 py-3 text-right text-sm text-slate-500">{formatINR(amt)}</td>
                          <td className="px-4 py-3 text-right text-sm text-slate-500">{formatINR(0)}</td>
                          <td className="px-4 py-3 text-right text-sm text-slate-500">{formatINR(0)}</td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{formatINR(amt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end px-8 py-6">
              <div className="w-full max-w-[300px] space-y-2">
                <div className="flex justify-between text-sm text-slate-500"><span>Subtotal</span><span>{formatINR(subtotal)}</span></div>
                <div className="flex justify-between text-sm text-slate-500"><span>Discount</span><span>{formatINR(discount)}</span></div>
                <div className="flex justify-between text-sm text-slate-500"><span>Tax</span><span>{formatINR(tax)}</span></div>
                <div className="flex justify-between border-t-2 border-slate-900 pt-3 text-base font-bold text-slate-900"><span>Grand Total</span><span>{formatINR(grandTotal)}</span></div>
                <div className="flex justify-between pt-2 text-sm font-semibold text-emerald-700"><span>Amount Paid</span><span>{formatINR(amountPaid)}</span></div>
                <div className="flex justify-between text-sm font-semibold text-red-700"><span>Balance Due</span><span>{formatINR(balanceDue)}</span></div>
              </div>
            </div>

            {/* Paid stamp */}
            {invoice.status === 'paid' && (
              <div className="px-8 pb-6 text-center">
                <span className="inline-block rotate-[-2deg] rounded-lg border-[3px] border-emerald-600 px-8 py-2 text-xl font-extrabold tracking-widest text-emerald-600">PAID</span>
              </div>
            )}

            {/* Notes */}
            {invoice.notes && (
              <div className="mx-8 mb-6 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                <span className="font-medium text-slate-700">Notes:</span> {invoice.notes}
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-slate-100 px-8 py-6 text-center">
              <p className="text-sm text-slate-600">Thank you for choosing {HOSPITAL_INFO.name}.</p>
              <p className="mt-2 text-xs text-slate-400">{HOSPITAL_INFO.phone} · {HOSPITAL_INFO.email}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
