import { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { Sidebar, type Page } from '@/components/Sidebar';
import { NotificationsDropdown } from '@/components/NotificationsDropdown';
import { Dashboard } from '@/pages/Dashboard';
import { Patients } from '@/pages/Patients';
import { PatientDetail } from '@/pages/PatientDetail';
import { Doctors } from '@/pages/Doctors';
import { DoctorProfile } from '@/pages/DoctorProfile';
import { Appointments } from '@/pages/Appointments';
import { Billing } from '@/pages/Billing';
import { Analytics } from '@/pages/Analytics';

const ROUTE_TO_PAGE: Record<string, Page> = {
  '/dashboard': 'dashboard',
  '/patients': 'patients',
  '/doctors': 'doctors',
  '/appointments': 'appointments',
  '/billing': 'billing',
  '/analytics': 'analytics',
};

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [editPatientId, setEditPatientId] = useState<string | undefined>();
  const [invoiceAppointmentId, setInvoiceAppointmentId] = useState<string | undefined>();

  const current = ROUTE_TO_PAGE[location.pathname] ?? 'dashboard';

  function navigateTo(nextPage: Page) {
    setPatientId(null);
    setDoctorId(null);
    setEditPatientId(undefined);
    setInvoiceAppointmentId(undefined);
    navigate(`/${nextPage}`);
  }

  function openPatient(id: string) {
    setPatientId(id);
    navigate('/patients');
  }

  function openDoctor(id: string) {
    setDoctorId(id);
    navigate('/doctors');
  }

  function editPatient(id: string) {
    setPatientId(null);
    setEditPatientId(id);
    navigate('/patients');
  }

  function generateInvoice(appointmentId: string) {
    setInvoiceAppointmentId(appointmentId);
    navigate('/billing');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar current={current} onNavigate={navigateTo} />
      <div className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-end border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-4">
            <span className="hidden text-xs font-semibold uppercase tracking-wider text-slate-400 sm:block">Admin view</span>
            <NotificationsDropdown />
            <div className="hidden h-7 w-px bg-slate-200 sm:block" />
            <button className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-50" aria-label="Admin account">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">MC</div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] p-4 sm:p-8">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard onNavigate={navigateTo} role="admin" />} />
            <Route path="/patients" element={patientId ? <PatientDetail patientId={patientId} onBack={() => navigateTo('patients')} onEdit={editPatient} /> : <Patients onOpenPatient={openPatient} focusPatientId={editPatientId} />} />
            <Route path="/doctors" element={doctorId ? <DoctorProfile doctorId={doctorId} onBack={() => navigateTo('doctors')} /> : <Doctors onOpenDoctor={openDoctor} />} />
            <Route path="/appointments" element={<Appointments role="admin" onGenerateInvoice={generateInvoice} />} />
            <Route path="/billing" element={<Billing preselectAppointmentId={invoiceAppointmentId} />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
