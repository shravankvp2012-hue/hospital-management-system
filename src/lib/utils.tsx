import type { AppointmentStatus, DoctorStatus, Gender, InvoiceStatus, InvoiceItemCategory, LabReportStatus } from '@/types/database';

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function formatMonthShort(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short' });
}

export function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const dob = new Date(dateOfBirth);
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

export function initials(first: string, last: string): string { return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase(); }
export function fullName(first: string, last: string): string { return `${first} ${last}`; }

export const GENDER_LABELS: Record<Gender, string> = { male: 'Male', female: 'Female', other: 'Other' };
export const APPOINTMENT_STATUS_STYLES: Record<AppointmentStatus, string> = { scheduled: 'bg-blue-50 text-blue-700 ring-blue-200', completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200', cancelled: 'bg-red-50 text-red-700 ring-red-200', no_show: 'bg-amber-50 text-amber-700 ring-amber-200' };
export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = { scheduled: 'Scheduled', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No Show' };
export const DOCTOR_STATUS_STYLES: Record<DoctorStatus, string> = { active: 'bg-emerald-50 text-emerald-700 ring-emerald-200', on_leave: 'bg-amber-50 text-amber-700 ring-amber-200', inactive: 'bg-slate-100 text-slate-600 ring-slate-200' };
export const DOCTOR_STATUS_LABELS: Record<DoctorStatus, string> = { active: 'Active', on_leave: 'On Leave', inactive: 'Inactive' };

export function StatusBadge({ label, className }: { label: string; className: string }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}>{label}</span>;
}

export function toLocalDatetimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const INVOICE_STATUS_STYLES: Record<InvoiceStatus, string> = {
  paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  unpaid: 'bg-red-50 text-red-700 ring-red-200',
  partially_paid: 'bg-amber-50 text-amber-700 ring-amber-200',
};
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  paid: 'Paid',
  unpaid: 'Unpaid',
  partially_paid: 'Partially Paid',
};
export const INVOICE_ITEM_CATEGORY_LABELS: Record<InvoiceItemCategory, string> = {
  consultation: 'Consultation',
  tests: 'Tests',
  medication: 'Medication',
  other: 'Other',
};
export const INVOICE_ITEM_CATEGORIES: InvoiceItemCategory[] = ['consultation', 'tests', 'medication', 'other'];

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export function generateInvoiceNumber(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `INV-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

export const LAB_REPORT_STATUS_STYLES: Record<LabReportStatus, string> = {
  normal: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  abnormal: 'bg-red-50 text-red-700 ring-red-200',
};
export const LAB_REPORT_STATUS_LABELS: Record<LabReportStatus, string> = {
  normal: 'Normal',
  abnormal: 'Abnormal',
};
