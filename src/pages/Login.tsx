import { FormEvent, useState } from 'react';
import { Activity, ArrowRight, LockKeyhole, Mail } from 'lucide-react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import { Input } from '@/components/Field';

export function Login() {
  const [setupMode, setSetupMode] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    if (setupMode) {
      const { error: setupError } = await supabase.functions.invoke('manage-users', { body: { action: 'bootstrap_master', fullName: fullName.trim(), email: email.trim(), password } });
      if (setupError) {
        const serverMessage = setupError instanceof FunctionsHttpError ? await setupError.context.json().then((body: { error?: unknown }) => body.error, () => undefined) : undefined;
        setError(typeof serverMessage === 'string' ? serverMessage : 'Initial setup could not be completed. Please try again.');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) setError('The Master account was created, but automatic sign-in failed. Please sign in again.');
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) setError('The email or password is incorrect. Please try again.');
    }
    setSubmitting(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-cyan-950/20 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative hidden overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="relative flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-500 shadow-lg shadow-cyan-500/20"><Activity className="h-6 w-6" /></div>
              <div><p className="text-lg font-bold">MediCore</p><p className="text-xs text-slate-400">Hospital Management</p></div>
            </div>
            <div className="relative max-w-md">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Care, connected</p>
              <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight">A calmer way to run every part of your hospital.</h1>
              <p className="mt-5 text-base leading-7 text-slate-300">Sign in to manage patients, appointments, care teams, and billing from one secure workspace.</p>
            </div>
            <p className="relative text-xs text-slate-500">Secure staff access · MediCore Hospital</p>
          </div>
          <div className="p-6 sm:p-12 lg:p-16">
            <div className="mb-10 flex items-center gap-3 lg:hidden"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 text-white"><Activity className="h-5 w-5" /></div><div><p className="font-bold text-slate-900">MediCore</p><p className="text-xs text-slate-500">Hospital Management</p></div></div>
            <div className="max-w-md">
              <p className="text-sm font-semibold text-cyan-600">Staff portal</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Welcome back</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">{setupMode ? 'Create the first Master account for this hospital workspace.' : 'Use the credentials provided by your hospital administrator to continue.'}</p>
              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
                {setupMode && <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">Your full name</span><Input required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="e.g. Dr. Anita Rao" /><span className="mt-2 block text-xs text-slate-500">Shown on your account and in the staff list.</span></label>}
                <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">Email address</span><div className="relative"><Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@medicorehospital.com" className="pl-10" /></div>{setupMode && <span className="mt-2 block text-xs text-slate-500">This becomes your sign-in email.</span>}</label>
                <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">{setupMode ? 'Master password' : 'Password'}</span><div className="relative"><LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={setupMode ? 'At least 10 characters' : 'Enter your password'} className="pl-10" /></div>{setupMode && <span className="mt-2 block text-xs text-slate-500">Use at least 10 characters. You will use this to sign in.</span>}</label>
                <Button type="submit" className="w-full" disabled={submitting}>{submitting ? (setupMode ? 'Creating workspace...' : 'Signing in...') : (setupMode ? 'Create Master account' : 'Sign in')}<ArrowRight className="h-4 w-4" /></Button>
              </form>
              <button type="button" onClick={() => { setSetupMode(!setupMode); setError(''); }} className="mt-6 w-full text-center text-sm font-medium text-slate-500 hover:text-slate-900">{setupMode ? 'Back to staff sign in' : 'First time setting up MediCore?'}</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
