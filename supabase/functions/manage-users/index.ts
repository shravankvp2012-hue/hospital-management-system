import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const roles = [
  "master", "admin", "manager", "doctor", "receptionist", "billing",
  "nurse", "pharmacist", "laboratory_technician", "accountant", "staff",
] as const;
type ManagedRole = (typeof roles)[number];
type AccountStatus = "active" | "disabled";

interface RequestBody {
  action?: "sign_in" | "list" | "create" | "update" | "reset_password" | "complete_password_change" | "bootstrap_master";
  userId?: string;
  username?: string;
  fullName?: string;
  email?: string;
  setupCode?: string;
  role?: ManagedRole;
  doctorId?: string | null;
  department?: string;
  phoneNumber?: string;
  accountStatus?: AccountStatus;
  password?: string;
}

const INVALID_LOGIN = "Invalid username or password.";
const INACTIVE_LOGIN = "Your account is inactive. Please contact the administrator.";
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;

function response(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateTemporaryPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const values = new Uint32Array(16);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizeUsername(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const username = value.trim().toLowerCase();
  return USERNAME_PATTERN.test(username) ? username : null;
}

function optionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text ? text : null;
}

function isManagedRole(value: unknown): value is ManagedRole {
  return typeof value === "string" && roles.includes(value as ManagedRole);
}

function isAccountStatus(value: unknown): value is AccountStatus {
  return value === "active" || value === "disabled";
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const authorization = request.headers.get("Authorization");
    if (!supabaseUrl || !serviceRoleKey || !anonKey) return response({ error: "Unable to process this request." }, 500);
    const body = request.method === "POST" ? (await request.json()) as RequestBody : {};
    const action = body.action;
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    if (action === "sign_in") {
      const username = normalizeUsername(body.username);
      if (!username || typeof body.password !== "string" || !body.password) return response({ error: INVALID_LOGIN }, 401);
      const { data: profile, error: profileError } = await serviceClient.from("profiles").select("id, account_status").eq("username", username).maybeSingle();
      if (profileError) return response({ error: "Unable to process this request." }, 500);
      if (!profile) return response({ error: INVALID_LOGIN }, 401);
      if (profile.account_status !== "active") return response({ error: INACTIVE_LOGIN }, 403);
      const { data: authUser, error: authUserError } = await serviceClient.auth.admin.getUserById(profile.id);
      if (authUserError || !authUser.user?.email) return response({ error: INVALID_LOGIN }, 401);
      const anonClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data: signIn, error: signInError } = await anonClient.auth.signInWithPassword({ email: authUser.user.email, password: body.password });
      if (signInError || !signIn.session) return response({ error: INVALID_LOGIN }, 401);
      return response({ session: { access_token: signIn.session.access_token, refresh_token: signIn.session.refresh_token } });
    }

    if (action === "bootstrap_master") {
      const email = body.email?.trim().toLowerCase();
      const fullName = body.fullName?.trim();
      const username = normalizeUsername(body.username);
      if (!email || !fullName || !username || !body.password || body.password.length < 8) {
        return response({ error: "Name, username, email, and a password of at least 8 characters are required." }, 400);
      }
      const { data: bootstrap, error: bootstrapError } = await serviceClient.from("master_bootstrap").select("claimed_at, setup_code_hash").eq("id", true).maybeSingle();
      if (bootstrapError) return response({ error: "Unable to process this request." }, 500);
      if (!bootstrap || bootstrap.claimed_at || !bootstrap.setup_code_hash) {
        return response({ error: "Initial Master setup has already been completed." }, 409);
      }
      if (!body.setupCode || (await sha256Hex(body.setupCode.trim())) !== bootstrap.setup_code_hash) {
        return response({ error: "The setup code is incorrect." }, 403);
      }
      const { data: claim, error: claimError } = await serviceClient.from("master_bootstrap").update({ claimed_at: new Date().toISOString() }).eq("id", true).is("claimed_at", null).select("id").maybeSingle();
      if (claimError || !claim) return response({ error: "Initial Master setup has already been completed." }, 409);

      const releaseClaim = () => serviceClient.from("master_bootstrap").update({ claimed_at: null }).eq("id", true);
      const { data: created, error: createError } = await serviceClient.auth.admin.createUser({ email, password: body.password, email_confirm: true, user_metadata: { full_name: fullName } });
      if (createError || !created.user) {
        await releaseClaim();
        const duplicate = createError?.message.toLowerCase().includes("already") ?? false;
        return response({ error: duplicate ? "That email address is already in use." : "Could not create the initial Master account." }, 400);
      }
      const { data: profile, error: profileUpdateError } = await serviceClient.from("profiles").update({ full_name: fullName, username, role: "master", account_status: "active", must_change_password: false }).eq("id", created.user.id).select("id").maybeSingle();
      if (profileUpdateError || !profile) {
        await serviceClient.auth.admin.deleteUser(created.user.id);
        await releaseClaim();
        return response({ error: profileUpdateError?.message.includes("username") ? "That username is already taken." : "The Master account could not be configured. Please try again." }, 409);
      }
      return response({ success: true });
    }

    if (!authorization) return response({ error: "Authentication required." }, 401);
    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: callerData, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerData.user) return response({ error: "Authentication required." }, 401);
    const { data: callerProfile, error: profileError } = await serviceClient
      .from("profiles")
      .select("role, account_status")
      .eq("id", callerData.user.id)
      .maybeSingle();
    if (profileError || !callerProfile || callerProfile.role !== "master" || callerProfile.account_status !== "active") {
      return response({ error: "You do not have permission to manage users." }, 403);
    }

    if (action === "list") {
      const [{ data: usersData, error: usersError }, { data: profiles, error: profilesError }] = await Promise.all([
        serviceClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
        serviceClient.from("profiles").select("id, full_name, username, role, doctor_id, account_status, must_change_password, department, phone_number, created_at").order("created_at", { ascending: true }),
      ]);
      if (usersError || profilesError) return response({ error: "Could not load users." }, 500);
      const authById = new Map(usersData.users.map((user) => [user.id, user]));
      const users = (profiles ?? []).map((profile) => {
        const authUser = authById.get(profile.id);
        return {
          id: profile.id,
          fullName: profile.full_name,
          username: profile.username,
          email: authUser?.email ?? "",
          role: profile.role,
          doctorId: profile.doctor_id,
          accountStatus: profile.account_status,
          mustChangePassword: profile.must_change_password,
          department: profile.department,
          phoneNumber: profile.phone_number,
          createdAt: profile.created_at,
          lastSignInAt: authUser?.last_sign_in_at ?? null,
        };
      });
      return response({ users });
    }

    if (action === "create") {
      const fullName = body.fullName?.trim();
      const username = normalizeUsername(body.username);
      const email = body.email?.trim().toLowerCase();
      if (!fullName || !username || !email || !isManagedRole(body.role) || !isAccountStatus(body.accountStatus) || !body.password || body.password.length < 8) {
        return response({ error: "Full name, username, email, role, status, and a password of at least 8 characters are required." }, 400);
      }
      const { data: taken, error: takenError } = await serviceClient.from("profiles").select("id").eq("username", username).maybeSingle();
      if (takenError) return response({ error: "Could not create this account." }, 500);
      if (taken) return response({ error: "That username is already taken." }, 409);

      const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
        email,
        password: body.password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
        ban_duration: body.accountStatus === "disabled" ? "876000h" : "none",
      });
      if (createError || !created.user) {
        const duplicate = createError?.message.toLowerCase().includes("already") ?? false;
        return response({ error: duplicate ? "That email address is already in use." : "Could not create this account." }, duplicate ? 409 : 400);
      }

      const { data: profile, error: profileUpdateError } = await serviceClient.from("profiles").update({
        full_name: fullName,
        username,
        role: body.role,
        department: optionalText(body.department),
        phone_number: optionalText(body.phoneNumber),
        account_status: body.accountStatus,
        must_change_password: false,
        created_by: callerData.user.id,
        updated_at: new Date().toISOString(),
      }).eq("id", created.user.id).select("id").maybeSingle();
      if (profileUpdateError || !profile) {
        await serviceClient.auth.admin.deleteUser(created.user.id);
        return response({ error: "Could not save this account. Nothing was created." }, 500);
      }
      return response({ userId: created.user.id });
    }

    if (action === "update") {
      const fullName = body.fullName?.trim();
      if (!body.userId || !fullName || !isManagedRole(body.role) || !isAccountStatus(body.accountStatus)) return response({ error: "Full name, role, and status are required." }, 400);
      if (body.userId === callerData.user.id) return response({ error: "You cannot change your own administrative access." }, 400);
      const { error: updateAuthError } = await serviceClient.auth.admin.updateUserById(body.userId, {
        ban_duration: body.accountStatus === "disabled" ? "876000h" : "none",
      });
      if (updateAuthError) return response({ error: "Could not update this account." }, 400);
      const profileChanges: Record<string, unknown> = {
        full_name: fullName,
        role: body.role,
        department: optionalText(body.department),
        phone_number: optionalText(body.phoneNumber),
        account_status: body.accountStatus,
        updated_at: new Date().toISOString(),
      };
      if (body.doctorId !== undefined) profileChanges.doctor_id = body.doctorId || null;
      const { error: updateProfileError } = await serviceClient.from("profiles").update(profileChanges).eq("id", body.userId);
      if (updateProfileError) return response({ error: "Could not save the account changes." }, 500);
      return response({ success: true });
    }

    if (action === "reset_password") {
      if (!body.userId) return response({ error: "A user is required." }, 400);
      if (body.userId === callerData.user.id) return response({ error: "Use your personal password settings to change your own password." }, 400);
      const temporaryPassword = body.password || generateTemporaryPassword();
      if (temporaryPassword.length < 8) return response({ error: "Passwords must be at least 8 characters." }, 400);
      const { error: resetError } = await serviceClient.auth.admin.updateUserById(body.userId, { password: temporaryPassword });
      if (resetError) return response({ error: "Could not reset this password." }, 400);
      const { error: flagError } = await serviceClient.from("profiles").update({ must_change_password: true }).eq("id", body.userId);
      if (flagError) return response({ error: "Password reset but the first-login requirement could not be saved." }, 500);
      return response({ temporaryPassword });
    }

    if (action === "complete_password_change") {
      const { error: completeError } = await serviceClient.from("profiles").update({ must_change_password: false }).eq("id", callerData.user.id);
      if (completeError) return response({ error: "Could not complete password setup." }, 500);
      return response({ success: true });
    }

    return response({ error: "Unsupported user-management action." }, 400);
  } catch (error) {
    console.error("manage-users failed", error);
    return response({ error: "Unable to process this request." }, 500);
  }
});
