import { useEffect, useRef, useState } from 'react';
import { Bell, CalendarDays, Receipt, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { AppointmentWithRelations, InvoiceWithRelations } from '@/types/database';
import { formatDate, formatTime, fullName, formatCurrency, INVOICE_STATUS_LABELS } from '@/lib/utils';

interface NotificationItem {
  id: string;
  type: 'appointment' | 'invoice';
  title: string;
  subtitle: string;
  meta: string;
}

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const [apptsRes, invoicesRes] = await Promise.all([
        supabase.from('appointments').select('id,patient_id,doctor_id,appointment_date,duration_minutes,reason,status,notes,created_at,patient:patients(id,first_name,last_name),doctor:doctors(id,first_name,last_name,specialty)').gte('appointment_date', now.toISOString()).lte('appointment_date', in24h.toISOString()).neq('status', 'cancelled').order('appointment_date', { ascending: true }),
        supabase.from('invoices').select('id,patient_id,appointment_id,invoice_number,status,date_issued,due_date,notes,created_at,patient:patients(id,first_name,last_name),items:invoice_items(id,invoice_id,category,description,amount)').eq('status', 'unpaid'),
      ]);

      const notifications: NotificationItem[] = [];

      (apptsRes.data ?? []).forEach((appt: any) => {
        const a = appt as unknown as AppointmentWithRelations;
        notifications.push({
          id: `appt-${a.id}`,
          type: 'appointment',
          title: fullName(a.patient.first_name, a.patient.last_name),
          subtitle: `Dr. ${fullName(a.doctor.first_name, a.doctor.last_name)} · ${a.reason}`,
          meta: `${formatDate(a.appointment_date)} at ${formatTime(a.appointment_date)}`,
        });
      });

      (invoicesRes.data ?? []).forEach((inv: any) => {
        const invoice = inv as unknown as InvoiceWithRelations;
        if (invoice.due_date && new Date(invoice.due_date) < now) {
          const total = invoice.items.reduce((sum, item) => sum + Number(item.amount), 0);
          notifications.push({
            id: `inv-${invoice.id}`,
            type: 'invoice',
            title: `${invoice.invoice_number} — ${fullName(invoice.patient.first_name, invoice.patient.last_name)}`,
            subtitle: `${INVOICE_STATUS_LABELS[invoice.status]} · ${formatCurrency(total)}`,
            meta: `Overdue (due ${formatDate(invoice.due_date)})`,
          });
        }
      });

      setItems(notifications);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = items.filter((item) => !readIds.has(item.id)).length;

  function markAllRead() {
    setReadIds(new Set(items.map((item) => item.id)));
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-cyan-500 ring-2 ring-white" />}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-slate-900">Notifications</p>
              <p className="text-xs text-slate-500">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</p>
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-cyan-600 hover:bg-cyan-50">
                <Check className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">Loading notifications...</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">No notifications right now.</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {items.map((item) => {
                  const isRead = readIds.has(item.id);
                  return (
                    <div key={item.id} className={`flex gap-3 px-4 py-3 transition-colors ${isRead ? 'bg-white' : 'bg-cyan-50/40'}`}>
                      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${item.type === 'appointment' ? 'bg-cyan-50 text-cyan-600' : 'bg-red-50 text-red-600'}`}>
                        {item.type === 'appointment' ? <CalendarDays className="h-4 w-4" /> : <Receipt className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="truncate text-xs text-slate-600">{item.subtitle}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{item.meta}</p>
                      </div>
                      {!isRead && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-cyan-500" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
