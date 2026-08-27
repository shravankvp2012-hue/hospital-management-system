import { useEffect, useState } from 'react';
import {
  Users,
  Stethoscope,
  CalendarDays,
  Clock,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { AppointmentWithRelations } from '@/types/database';
import { PageHeader } from '@/components/PageHeader';
import { FullPageSpinner, EmptyState } from '@/components/Feedback';
import { Button } from '@/components/Button';
import type { Page } from '@/components/Sidebar';
import {
  formatTime,
  formatDate,
  fullName,
  initials,
  APPOINTMENT_STATUS_STYLES,
  APPOINTMENT_STATUS_LABELS,
  StatusBadge,
} from '@/lib/utils';

interface Stats {
  patientCount: number;
  doctorCount: number;
  appointmentCount: number;
  todaysCount: number;
}

interface DashboardProps {
  onNavigate: (page: Page) => void;
  role?: 'admin' | 'doctor' | 'receptionist';
  doctorId?: string | null;
}

export function Dashboard({ onNavigate, role = 'receptionist', doctorId }: DashboardProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [upcoming, setUpcoming] = useState<AppointmentWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const appointmentsCountRequest = role === 'doctor' && doctorId
        ? supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('doctor_id', doctorId)
        : supabase.from('appointments').select('id', { count: 'exact', head: true });
      const upcomingRequest = role === 'doctor' && doctorId
        ? supabase.from('appointments').select('id,patient_id,doctor_id,appointment_date,duration_minutes,reason,status,notes,created_at,patient:patients(id,first_name,last_name),doctor:doctors(id,first_name,last_name,specialty)').eq('doctor_id', doctorId).gte('appointment_date', new Date().toISOString()).order('appointment_date', { ascending: true }).limit(6)
        : supabase.from('appointments').select('id,patient_id,doctor_id,appointment_date,duration_minutes,reason,status,notes,created_at,patient:patients(id,first_name,last_name),doctor:doctors(id,first_name,last_name,specialty)').gte('appointment_date', new Date().toISOString()).order('appointment_date', { ascending: true }).limit(6);
      const [patients, doctors, appointments, upcomingRes] = await Promise.all([
        supabase.from('patients').select('id', { count: 'exact', head: true }),
        supabase.from('doctors').select('id', { count: 'exact', head: true }),
        appointmentsCountRequest,
        upcomingRequest,
      ]);

      const now = new Date();
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      let todaysQuery = supabase.from('appointments').select('id', { count: 'exact', head: true }).gte('appointment_date', now.toISOString()).lte('appointment_date', endOfToday.toISOString());
      if (role === 'doctor' && doctorId) todaysQuery = todaysQuery.eq('doctor_id', doctorId);
      const { count: todaysCount } = await todaysQuery;

      setStats({
        patientCount: patients.count ?? 0,
        doctorCount: doctors.count ?? 0,
        appointmentCount: appointments.count ?? 0,
        todaysCount: todaysCount ?? 0,
      });
      setUpcoming((upcomingRes.data ?? []) as unknown as AppointmentWithRelations[]);
      setLoading(false);
    }
    load();
  }, [doctorId, role]);

  if (loading) return <FullPageSpinner label="Loading dashboard..." />;

  const cards = [
    {
      label: 'Total Patients',
      value: stats?.patientCount ?? 0,
      icon: Users,
      gradient: 'from-cyan-500 to-blue-500',
      page: 'patients' as Page,
    },
    {
      label: 'Total Doctors',
      value: stats?.doctorCount ?? 0,
      icon: Stethoscope,
      gradient: 'from-teal-500 to-emerald-500',
      page: 'doctors' as Page,
    },
    {
      label: 'Appointments',
      value: stats?.appointmentCount ?? 0,
      icon: CalendarDays,
      gradient: 'from-sky-500 to-cyan-500',
      page: 'appointments' as Page,
    },
    {
      label: "Today's Appointments",
      value: stats?.todaysCount ?? 0,
      icon: Clock,
      gradient: 'from-amber-500 to-orange-500',
      page: 'appointments' as Page,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your hospital management system"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              onClick={() => onNavigate(card.page)}
              className="group relative overflow-hidden rounded-2xl bg-white p-6 text-left shadow-sm ring-1 ring-slate-200 transition-all hover:shadow-lg hover:ring-slate-300"
            >
              <div className="flex items-center justify-between">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg`}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <ArrowRight className="h-5 w-5 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-slate-400" />
              </div>
              <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
                {card.value}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-500">{card.label}</p>
            </button>
          );
        })}
      </div>

      {/* Upcoming appointments */}
      <div className="mt-8 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-cyan-500" />
            <h2 className="text-base font-bold text-slate-900">Upcoming Appointments</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('appointments')}>
            View all
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {upcoming.length === 0 ? (
          <div className="px-6 py-8">
            <EmptyState
              icon={<CalendarDays className="h-7 w-7" />}
              title="No upcoming appointments"
              description="Schedule new appointments to see them here."
              action={
                <Button size="sm" onClick={() => onNavigate('appointments')}>
                  New Appointment
                </Button>
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {upcoming.map((appt) => (
              <div
                key={appt.id}
                className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-slate-50/50"
              >
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-100 to-teal-100 text-sm font-bold text-cyan-700">
                  {initials(appt.patient.first_name, appt.patient.last_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {fullName(appt.patient.first_name, appt.patient.last_name)}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    Dr. {fullName(appt.doctor.first_name, appt.doctor.last_name)} ·{' '}
                    {appt.doctor.specialty}
                  </p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-medium text-slate-700">
                    {formatDate(appt.appointment_date)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatTime(appt.appointment_date)} · {appt.duration_minutes}min
                  </p>
                </div>
                <StatusBadge
                  label={APPOINTMENT_STATUS_LABELS[appt.status]}
                  className={APPOINTMENT_STATUS_STYLES[appt.status]}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
