import { FormEvent, useState } from 'react';
import { ArrowRight, KeyRound, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/components/Button';
import { Input } from '@/components/Field';

export function ChangePassword() {
  const { profile, refreshProfile, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (password.length < 10) { setError('Your new password must be at least 10 characters.'); return; }
    if (password !== confirmation) { setError('The passwords do not match.'); return; }
    setSubmitting(true);
    const { error: passwordError } = await supabase.auth.updateUser({ password });
    if (passwordError) {
      setError('Could not update your password. Please try again.');
      setSubmitting(false);
      return;
    }
    const { error: completeError } = await supabase.functions.invoke('manage-users', { body: { action: 'complete_password_change' } });
    if (completeError) setError('Your password changed, but setup could not be completed. Please sign in again.');
    else await refreshProfile();
    setSubmitting(false);
  }

  return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8"><div className="w-full max-w-lg rounded-[2rem] bg-white p-7 shadow-2xl sm:p-10"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600"><KeyRound className="h-7 w-7" /></div><p className="mt-8 text-sm font-semibold text-cyan-600">First sign-in setup</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Choose a private password</h1><p className="mt-3 text-sm leading-6 text-slate-500">Welcome, {profile?.full_name || 'team member'}. Your administrator provided a temporary password, so choose your own before continuing.</p><form onSubmit={handleSubmit} className="mt-8 space-y-5">{error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}<label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">New password</span><Input required minLength={10} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 10 characters" /></label><label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">Confirm new password</span><Input required minLength={10} type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Re-enter your password" /></label><div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />Use a password that only you know and do not share it with other staff members.</div><Button type="submit" className="w-full" disabled={submitting}>{submitting ? 'Saving password...' : 'Continue securely'}<ArrowRight className="h-4 w-4" /></Button></form><button onClick={() => void signOut()} className="mt-5 w-full text-center text-sm font-medium text-slate-500 hover:text-slate-900">Sign out</button></div></main>;
}
