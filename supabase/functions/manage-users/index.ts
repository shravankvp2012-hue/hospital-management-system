import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const roles = ["admin", "manager", "doctor", "receptionist", "billing"] as const;
type ManagedRole = (typeof roles)[number];
type AccountStatus = "active" | "disabled";

interface RequestBody {
  action?: "list" | "create" | "update" | "reset_password" | "complete_password_change" | "bootstrap_master";
  userId?: string;
  fullName?: string;
  email?: string;
  role?: ManagedRole;
  doctorId?: string | null;
  accountStatus?: AccountStatus;
  password?: string;
}

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

    if (action === "bootstrap_master") {
      const email = body.email?.trim().toLowerCase();
      const fullName = body.fullName?.trim();
      if (!email || !fullName || !body.password || body.password.length < 8) return response({ error: "Name, email, and a password of at least 8 characters are required." }, 400);
      const { data: claim, error: claimError } = await serviceClient.from("master_bootstrap").update({ claimed_at: new Date().toISOString() }).eq("id", true).is("claimed_at", null).select("id").maybeSingle();
      if (claimError || !claim) return response({ error: "Initial Master setup has already been completed." }, 409);
      const { data: created, error: createError } = await serviceClient.auth.admin.createUser({ email, password: body.password, email_confirm: true, user_metadata: { full_name: fullName } });
      if (createError || !created.user) {
        await serviceClient.from("master_bootstrap").update({ claimed_at: null }).eq("id", true);
        return response({ error: "Could not create the initial Master account." }, 400);
      }
      const { error: profileUpdateError } = await serviceClient.from("profiles").update({ full_name: fullName, role: "master", account_status: "active", must_change_password: false }).eq("id", created.user.id);
      if (profileUpdateError) return response({ error: "The account was created but could not be configured." }, 500);
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
        serviceClient.from("profiles").select("id, full_name, role, doctor_id, account_status, must_change_password, created_by, created_at"),
      ]);
      if (usersError || profilesError) return response({ error: "Could not load users." }, 500);
      const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
      const users = usersData.users.map((user) => ({
        id: user.id,
        email: user.email ?? "",
        lastSignInAt: user.last_sign_in_at,
        createdAt: user.created_at,
        ...(profileById.get(user.id) ?? {
          full_name: "",
          role: "receptionist",
          doctor_id: null,
          account_status: "active",
          must_change_password: false,
          created_by: null,
          created_at: user.created_at,
        }),
      }));
      return response({ users });
    }

    if (action === "create") {
      const email = body.email?.trim().toLowerCase();
      const fullName = body.fullName?.trim();
      if (!email || !fullName || !isManagedRole(body.role)) return response({ error: "Name, email, and role are required." }, 400);
      if (body.password && body.password.length < 10) return response({ error: "Temporary passwords must be at least 10 characters." }, 400);
      const temporaryPassword = body.password || generateTemporaryPassword();
      const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (createError || !created.user) return response({ error: "Could not create this account." }, 400);

      const { error: profileUpdateError } = await serviceClient.from("profiles").update({
        full_name: fullName,
        role: body.role,
        doctor_id: body.doctorId || null,
        account_status: "active",
        must_change_password: true,
        created_by: callerData.user.id,
      }).eq("id", created.user.id);
      if (profileUpdateError) return response({ error: "The account was created but could not be configured." }, 500);
      return response({ userId: created.user.id, temporaryPassword });
    }

    if (action === "update") {
      if (!body.userId || !isManagedRole(body.role) || !isAccountStatus(body.accountStatus)) return response({ error: "User, role, and account status are required." }, 400);
      if (body.userId === callerData.user.id) return response({ error: "You cannot change your own administrative access." }, 400);
      const { error: updateAuthError } = await serviceClient.auth.admin.updateUserById(body.userId, {
        ban_duration: body.accountStatus === "disabled" ? "876000h" : "none",
      });
      if (updateAuthError) return response({ error: "Could not update this account." }, 400);
      const { error: updateProfileError } = await serviceClient.from("profiles").update({
        role: body.role,
        doctor_id: body.doctorId || null,
        account_status: body.accountStatus,
      }).eq("id", body.userId);
      if (updateProfileError) return response({ error: "Could not save the account changes." }, 500);
      return response({ success: true });
    }

    if (action === "reset_password") {
      if (!body.userId) return response({ error: "A user is required." }, 400);
      if (body.userId === callerData.user.id) return response({ error: "Use your personal password settings to change your own password." }, 400);
      const temporaryPassword = body.password || generateTemporaryPassword();
      if (temporaryPassword.length < 10) return response({ error: "Temporary passwords must be at least 10 characters." }, 400);
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
