import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  CalendarDays,
  Activity,
  X,
  LogOut,
  Receipt,
  BarChart3,
} from 'lucide-react';

export type Page = 'dashboard' | 'patients' | 'doctors' | 'appointments' | 'billing' | 'analytics';

interface NavItem {
  id: Page;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'patients', label: 'Patients', icon: Users },
  { id: 'doctors', label: 'Doctors', icon: Stethoscope },
  { id: 'appointments', label: 'Appointments', icon: CalendarDays },
  { id: 'billing', label: 'Billing', icon: Receipt },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

interface SidebarProps {
  current: Page;
  onNavigate: (page: Page) => void;
  role?: 'admin' | 'doctor' | 'receptionist';
  fullName?: string;
  onSignOut?: () => void;
}

export function Sidebar({ current, onNavigate, role = 'admin', fullName = 'Admin User', onSignOut }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [current]);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-xl bg-white p-2.5 shadow-lg ring-1 ring-slate-200 lg:hidden"
        aria-label="Open menu"
      >
        <LayoutDashboard className="h-5 w-5 text-slate-700" />
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-900 transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 shadow-lg shadow-cyan-500/20">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white">MediCore</h1>
              <p className="text-xs text-slate-400">Hospital Management</p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 px-4 py-4">
          {NAV_ITEMS.filter((item) => role !== 'doctor' || item.id !== 'doctors').map((item) => {
            const Icon = item.icon;
            const active = current === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all ${
                  active
                    ? 'bg-gradient-to-r from-cyan-500/20 to-teal-500/10 text-white ring-1 ring-cyan-500/30'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                }`}
              >
                <Icon
                  className={`h-5 w-5 transition-transform group-hover:scale-110 ${
                    active ? 'text-cyan-400' : ''
                  }`}
                />
                {item.label}
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold text-slate-200">
              MC
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-200">{fullName || 'MediCore user'}</p>
              <p className="truncate text-xs capitalize text-slate-500">{role}</p>
            </div>
            {onSignOut && <button onClick={onSignOut} className="ml-auto rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-white" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </button>}
          </div>
        </div>
      </aside>
    </>
  );
}
