import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/types/database';

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  master: 'Master Admin',
  admin: 'Administrator',
  manager: 'Department manager',
  doctor: 'Doctor',
  nurse: 'Nurse',
  receptionist: 'Receptionist',
  pharmacist: 'Pharmacist',
  laboratory_technician: 'Laboratory Technician',
  accountant: 'Accountant',
  billing: 'Billing staff',
  staff: 'Staff',
};

export const USER_ROLE_OPTIONS = Object.entries(USER_ROLE_LABELS) as [UserRole, string][];

export async function invokeManageUsers<T>(body: Record<string, unknown>): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke('manage-users', { body });
  if (error) {
    const serverMessage = error instanceof FunctionsHttpError
      ? await error.context.json().then((payload: { error?: unknown }) => payload.error, () => undefined)
      : undefined;
    return { data: null, error: typeof serverMessage === 'string' ? serverMessage : 'Something went wrong. Please try again.' };
  }
  if (!data || typeof data !== 'object') return { data: null, error: 'Something went wrong. Please try again.' };
  const payload = data as { error?: unknown };
  if (typeof payload.error === 'string') return { data: null, error: payload.error };
  return { data: data as T, error: null };
}
