import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, PieChart, Award, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { AppointmentStatus } from '@/types/database';
import { PageHeader } from '@/components/PageHeader';
import { FullPageSpinner } from '@/components/Feedback';
import { APPOINTMENT_STATUS_LABELS, fullName, formatCurrency, formatMonthShort } from '@/lib/utils';

interface MonthBucket {
  key: string;
  label: string;
  value: number;
}

interface StatusSlice {
  status: AppointmentStatus;
  count: number;
}

interface DoctorRanking {
  doctorId: string;
  name: string;
  specialty: string;
  count: number;
}

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  scheduled: '#0ea5e9',
  completed: '#10b981',
  cancelled: '#ef4444',
  no_show: '#f59e0b',
};

export function Analytics() {
  const [loading, setLoading] = useState(true);
  const [patientBuckets, setPatientBuckets] = useState<MonthBucket[]>([]);
  const [statusSlices, setStatusSlices] = useState<StatusSlice[]>([]);
  const [revenueBuckets, setRevenueBuckets] = useState<MonthBucket[]>([]);
  const [doctorRankings, setDoctorRankings] = useState<DoctorRanking[]>([]);

  useEffect(() => {
    async function load() {
      const now = new Date();
      const months: { key: string; label: string; start: Date; end: Date }[] = [];
      for (let i = 5; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
        months.push({ key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`, label: formatMonthShort(start), start, end });
      }

      const sixMonthsAgo = months[0].start.toISOString();

      const [patientsRes, apptsRes, invoicesRes] = await Promise.all([
        supabase.from('patients').select('created_at').gte('created_at', sixMonthsAgo),
        supabase.from('appointments').select('id,status,doctor_id,doctor:doctors(id,first_name,last_name,specialty)'),
        supabase.from('invoices').select('id,status,date_issued,items:invoice_items(amount)').gte('date_issued', sixMonthsAgo.slice(0, 10)),
      ]);

      // Patients per month
      const patientCounts = months.map((m) => {
        const count = (patientsRes.data ?? []).filter((p: { created_at: string }) => {
          const d = new Date(p.created_at);
          return d >= m.start && d <= m.end;
        }).length;
        return { key: m.key, label: m.label, value: count };
      });
      setPatientBuckets(patientCounts);

      // Appointment status distribution
      const statusMap = new Map<AppointmentStatus, number>();
      const doctorCountMap = new Map<string, { doctorId: string; name: string; specialty: string; count: number }>();
      (apptsRes.data ?? []).forEach((row: any) => {
        const status = row.status as AppointmentStatus;
        statusMap.set(status, (statusMap.get(status) ?? 0) + 1);
        if (row.doctor) {
          const doc = Array.isArray(row.doctor) ? row.doctor[0] : row.doctor;
          if (doc) {
            const key = doc.id;
            const existing = doctorCountMap.get(key);
            if (existing) existing.count += 1;
            else doctorCountMap.set(key, { doctorId: key, name: fullName(doc.first_name, doc.last_name), specialty: doc.specialty, count: 1 });
          }
        }
      });
      setStatusSlices(Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })));
      setDoctorRankings(Array.from(doctorCountMap.values()).sort((a, b) => b.count - a.count).slice(0, 5));

      // Revenue per month (sum of invoice items)
      const revenueCounts = months.map((m) => {
        const total = (invoicesRes.data ?? []).filter((inv: any) => {
          const d = new Date(inv.date_issued);
          return d >= m.start && d <= m.end;
        }).reduce((sum: number, inv: any) => {
          const items = Array.isArray(inv.items) ? inv.items : [];
          return sum + items.reduce((s: number, item: { amount: number }) => s + Number(item.amount), 0);
        }, 0);
        return { key: m.key, label: m.label, value: total };
      });
      setRevenueBuckets(revenueCounts);
      setLoading(false);
    }
    load();
  }, []);

  const maxPatient = useMemo(() => Math.max(1, ...patientBuckets.map((b) => b.value)), [patientBuckets]);
  const maxRevenue = useMemo(() => Math.max(1, ...revenueBuckets.map((b) => b.value)), [revenueBuckets]);
  const totalAppointments = useMemo(() => statusSlices.reduce((s, slice) => s + slice.count, 0), [statusSlices]);

  if (loading) return <FullPageSpinner label="Loading analytics..." />;

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Insights from your hospital data — last 6 months" />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Patients registered per month */}
        <ChartCard icon={<Users className="h-5 w-5 text-cyan-500" />} title="Patients Registered" subtitle="New patients per month">
          <BarChart data={patientBuckets} max={maxPatient} color="#06b6d4" formatValue={(v) => String(v)} />
        </ChartCard>

        {/* Revenue per month */}
        <ChartCard icon={<TrendingUp className="h-5 w-5 text-emerald-500" />} title="Revenue" subtitle="From invoices per month">
          <BarChart data={revenueBuckets} max={maxRevenue} color="#10b981" formatValue={(v) => formatCurrency(v)} />
        </ChartCard>

        {/* Appointment status donut */}
        <ChartCard icon={<PieChart className="h-5 w-5 text-sky-500" />} title="Appointments by Status" subtitle={`${totalAppointments} total appointments`}>
          {totalAppointments === 0 ? <EmptyChart /> : <DonutChart slices={statusSlices} total={totalAppointments} />}
        </ChartCard>

        {/* Top doctors */}
        <ChartCard icon={<Award className="h-5 w-5 text-amber-500" />} title="Top Doctors" subtitle="By appointment count">
          {doctorRankings.length === 0 ? <EmptyChart /> : (
            <div className="space-y-3">
              {doctorRankings.map((doc, i) => {
                const maxCount = doctorRankings[0].count || 1;
                const pct = (doc.count / maxCount) * 100;
                return (
                  <div key={doc.doctorId ?? i} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-50 text-sm font-bold text-amber-600">{i + 1}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="truncate text-sm font-semibold text-slate-900">Dr. {doc.name}</p>
                        <p className="text-sm font-bold text-slate-700">{doc.count}</p>
                      </div>
                      <p className="text-xs text-slate-500">{doc.specialty}</p>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="mb-5 flex items-center gap-2">
        {icon}
        <div>
          <h2 className="font-bold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function EmptyChart() {
  return <div className="flex h-48 items-center justify-center text-sm text-slate-400">No data available</div>;
}

function BarChart({ data, max, color, formatValue }: { data: MonthBucket[]; max: number; color: string; formatValue: (v: number) => string }) {
  const chartHeight = 200;
  const barWidth = 40;
  const gap = 24;
  const totalWidth = data.length * (barWidth + gap) - gap;

  return (
    <div className="overflow-x-auto">
      <svg width={Math.max(totalWidth, 280)} height={chartHeight + 40} className="mx-auto">
        {data.map((bucket, i) => {
          const barHeight = max > 0 ? (bucket.value / max) * chartHeight : 0;
          const x = i * (barWidth + gap);
          const y = chartHeight - barHeight;
          return (
            <g key={bucket.key}>
              <rect x={x} y={y} width={barWidth} height={barHeight} rx={6} fill={color} opacity={0.85} className="transition-all duration-500" />
              <text x={x + barWidth / 2} y={y - 8} textAnchor="middle" className="fill-slate-700 text-[11px] font-semibold">
                {bucket.value > 0 ? formatValue(bucket.value) : ''}
              </text>
              <text x={x + barWidth / 2} y={chartHeight + 20} textAnchor="middle" className="fill-slate-400 text-[11px]">
                {bucket.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function DonutChart({ slices, total }: { slices: StatusSlice[]; total: number }) {
  const radius = 80;
  const strokeWidth = 28;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
      <svg width={200} height={200} viewBox="0 0 200 200">
        <g transform="translate(100,100) rotate(-90)">
          <circle r={radius} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
          {slices.map((slice) => {
            const fraction = slice.count / total;
            const dash = fraction * circumference;
            const circle = (
              <circle
                key={slice.status}
                r={radius}
                fill="none"
                stroke={STATUS_COLORS[slice.status]}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                className="transition-all duration-500"
              />
            );
            offset += dash;
            return circle;
          })}
        </g>
        <text x="100" y="95" textAnchor="middle" className="fill-slate-900 text-2xl font-bold">{total}</text>
        <text x="100" y="115" textAnchor="middle" className="fill-slate-400 text-xs">Total</text>
      </svg>
      <div className="space-y-2">
        {slices.map((slice) => (
          <div key={slice.status} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[slice.status] }} />
            <span className="text-sm font-medium text-slate-700">{APPOINTMENT_STATUS_LABELS[slice.status]}</span>
            <span className="text-sm text-slate-400">{slice.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
