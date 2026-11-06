import { FormEvent, useState } from 'react';
import { Activity, ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { invokeManageUsers } from '@/lib/manageUsers';
import { Button } from '@/components/Button';
import { Input } from '@/components/Field';

interface SessionTokens {
  session: { access_token: string; refresh_token: string };
}

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;

export function Login() {
  const [setupMode, setSetupMode] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function switchMode() {
    setSetupMode(!setupMode);
    setError('');
    setNotice('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
  }

  async function handleSignIn() {
    const { data, error: signInError } = await invokeManageUsers<SessionTokens>({ action: 'sign_in', username: username.trim().toLowerCase(), password });
    if (signInError || !data) {
      setError(signInError ?? 'Something went wrong. Please try again.');
      return;
    }
    const { error: sessionError } = await supabase.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
    if (sessionError) setError('We could not start your session. Please try again.');
  }

  async function handleSetup() {
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    const { error: setupError } = await invokeManageUsers({
      action: 'bootstrap_master',
      fullName: fullName.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim(),
      password,
      setupCode: setupCode.trim(),
    });
    if (setupError) {
      setError(setupError);
      return;
    }
    setSetupMode(false);
    setFullName('');
    setEmail('');
    setSetupCode('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setNotice('Your Master account is ready. Sign in with your username and password.');
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setNotice('');
    if (setupMode) await handleSetup();
    else await handleSignIn();
    setSubmitting(false);
  }

  const passwordToggle = (
    <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:text-slate-700">
      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );

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
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{setupMode ? 'Set up Master access' : 'Welcome back'}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">{setupMode ? 'Create the first Master account for this hospital workspace. You need the one-time setup code to continue.' : 'Sign in with the username and password your hospital administrator gave you.'}</p>
              {notice && <div role="status" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}
              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
                {setupMode && <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">Full name</span><Input required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="e.g. Dr. Anita Rao" /></label>}
                <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">Username</span><div className="relative"><UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input required autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="e.g. anita.rao" className="pl-10" pattern={setupMode ? USERNAME_PATTERN.source : undefined} title={setupMode ? 'Use 3 to 32 lowercase letters, numbers, dots, dashes, or underscores.' : undefined} /></div>{setupMode && <span className="mt-2 block text-xs text-slate-500">3 to 32 lowercase letters, numbers, dots, dashes, or underscores. You will sign in with this.</span>}</label>
                {setupMode && <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">Email address</span><Input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@medicorehospital.com" /><span className="mt-2 block text-xs text-slate-500">Used for account recovery and hospital notices.</span></label>}
                <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">Password</span><div className="relative"><LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input required autoComplete={setupMode ? 'new-password' : 'current-password'} type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={setupMode ? 'At least 8 characters' : 'Enter your password'} className="pl-10 pr-11" />{passwordToggle}</div>{setupMode && <span className="mt-2 block text-xs text-slate-500">At least 8 characters. Avoid using a password you use elsewhere.</span>}</label>
                {setupMode && <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">Confirm password</span><div className="relative"><LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input required autoComplete="new-password" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Re-enter the password" className="pl-10 pr-11" /></div></label>}
                {setupMode && <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">One-time setup code</span><div className="relative"><ShieldCheck className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input required autoComplete="off" value={setupCode} onChange={(event) => setSetupCode(event.target.value)} placeholder="Code provided during deployment" className="pl-10" /></div><span className="mt-2 block text-xs text-slate-500">This code works once. It is required only for the first Master account.</span></label>}
                <Button type="submit" className="w-full" disabled={submitting}>{submitting ? (setupMode ? 'Creating account...' : 'Signing in...') : (setupMode ? 'Create Master account' : 'Sign in')}<ArrowRight className="h-4 w-4" /></Button>
              </form>
              <button type="button" onClick={switchMode} className="mt-6 w-full text-center text-sm font-medium text-slate-500 hover:text-slate-900">{setupMode ? 'Back to staff sign in' : 'First time setting up MediCore?'}</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
