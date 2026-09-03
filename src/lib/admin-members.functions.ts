import { createServerFn } from "@tanstack/react-start";

const TIERS = ["starter", "signature", "sovereign"] as const;
type PlanSlug = (typeof TIERS)[number];

export interface AdminMember {
  userId: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  planSlug: string;
  membershipStatus: string | null;
  expiresAt: string | null;
  isAdmin: boolean;
}

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

export const listMembers = createServerFn({ method: "GET" })
  .middleware([
    (await import("@/integrations/supabase/auth-middleware")).requireSupabaseAuth,
  ])
  .handler(async ({ context }): Promise<AdminMember[]> => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: usersPage, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (usersError) throw new Error(usersError.message);

    const admin = supabaseAdmin as any;
    const [{ data: profiles }, { data: memberships }, { data: roles }] = await Promise.all([
      admin.from("profiles").select("user_id, display_name, avatar_url"),
      admin.from("memberships").select("user_id, plan_slug, status, expires_at").eq("status", "active"),
      admin.from("user_roles").select("user_id, role").eq("role", "admin"),
    ]);

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
    const membershipMap = new Map((memberships ?? []).map((m: any) => [m.user_id, m]));
    const adminSet = new Set((roles ?? []).map((r: any) => r.user_id));

    return usersPage.users.map((u) => {
      const profile: any = profileMap.get(u.id);
      const membership: any = membershipMap.get(u.id);
      return {
        userId: u.id,
        email: u.email ?? null,
        displayName: profile?.display_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        createdAt: u.created_at ?? null,
        lastSignInAt: u.last_sign_in_at ?? null,
        planSlug: membership?.plan_slug ?? "starter",
        membershipStatus: membership?.status ?? null,
        expiresAt: membership?.expires_at ?? null,
        isAdmin: adminSet.has(u.id),
      };
    });
  });

export const setMemberPlan = createServerFn({ method: "POST" })
  .middleware([
    (await import("@/integrations/supabase/auth-middleware")).requireSupabaseAuth,
  ])
  .inputValidator((input: { userId: string; planSlug: PlanSlug; durationDays?: number | null }) => {
    if (!input?.userId || typeof input.userId !== "string") throw new Error("userId required");
    if (!TIERS.includes(input.planSlug)) throw new Error("Invalid plan");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    await admin
      .from("memberships")
      .update({ status: "cancelled" })
      .eq("user_id", data.userId)
      .eq("status", "active");

    const expiresAt =
      data.planSlug === "signature"
        ? new Date(Date.now() + (data.durationDays ?? 30) * 86_400_000).toISOString()
        : null;

    const { error } = await admin.from("memberships").insert({
      user_id: data.userId,
      plan_slug: data.planSlug,
      status: "active",
      source: "admin",
      expires_at: expiresAt,
    });
    if (error) throw new Error(error.message);

    return { ok: true };
  });
