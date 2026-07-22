import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnimeCharacter, AnimeSeries } from "@/features/anime-collection/types";
import type { AnimeCharacterCard } from "@/lib/demo/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  errorMessage,
  isAnimeShareSchemaError,
  toError,
} from "@/lib/data/server/error-message";

export type AnimeWorkspaceRole = "owner" | "editor" | "viewer";

export interface AnimeWorkspaceSnapshotState {
  animeSeries: AnimeSeries[];
  animeCharacters: AnimeCharacter[];
  animeCharacterCards: AnimeCharacterCard[];
  animeBinderLayoutByCharacter: Record<string, (string | null)[]>;
}

export interface AnimeWorkspaceInfo {
  workspaceId: string;
  ownerUserId: string;
  role: AnimeWorkspaceRole;
  isOwner: boolean;
}

async function ensureOwnWorkspace(
  supabase: SupabaseClient,
  userId: string
): Promise<{ id: string; owner_user_id: string }> {
  const { data: existing, error: findErr } = await supabase
    .from("anime_workspaces")
    .select("id, owner_user_id")
    .eq("owner_user_id", userId)
    .maybeSingle();
  if (findErr) throw toError(findErr);
  if (existing) return existing as { id: string; owner_user_id: string };

  const { data: created, error } = await supabase
    .from("anime_workspaces")
    .insert({ owner_user_id: userId })
    .select("id, owner_user_id")
    .single();
  if (error) throw toError(error);

  await supabase.from("anime_workspace_snapshots").upsert({
    workspace_id: created.id,
    state: {
      animeSeries: [],
      animeCharacters: [],
      animeCharacterCards: [],
      animeBinderLayoutByCharacter: {},
    },
    updated_by: userId,
    updated_at: new Date().toISOString(),
  });

  return created as { id: string; owner_user_id: string };
}

export async function resolveAnimeWorkspace(
  supabase: SupabaseClient,
  userId: string
): Promise<AnimeWorkspaceInfo> {
  // Prefer a workspace owned by someone else where this user is a member.
  const { data: memberships } = await supabase
    .from("anime_workspace_members")
    .select("workspace_id, role")
    .eq("user_id", userId);

  for (const membership of memberships ?? []) {
    const { data: ws } = await supabase
      .from("anime_workspaces")
      .select("id, owner_user_id")
      .eq("id", membership.workspace_id)
      .maybeSingle();
    if (ws && ws.owner_user_id !== userId) {
      return {
        workspaceId: ws.id,
        ownerUserId: ws.owner_user_id,
        role: membership.role as AnimeWorkspaceRole,
        isOwner: false,
      };
    }
  }

  const own = await ensureOwnWorkspace(supabase, userId);
  return {
    workspaceId: own.id,
    ownerUserId: own.owner_user_id,
    role: "owner",
    isOwner: true,
  };
}

export async function getAnimeSnapshot(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<{ state: AnimeWorkspaceSnapshotState; updatedAt: string | null }> {
  const { data, error } = await supabase
    .from("anime_workspace_snapshots")
    .select("state, updated_at")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) throw toError(error);
  const state = (data?.state ?? {
    animeSeries: [],
    animeCharacters: [],
    animeCharacterCards: [],
    animeBinderLayoutByCharacter: {},
  }) as AnimeWorkspaceSnapshotState;
  return { state, updatedAt: (data?.updated_at as string | null) ?? null };
}

export async function putAnimeSnapshot(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
  state: AnimeWorkspaceSnapshotState
) {
  const { error } = await supabase.from("anime_workspace_snapshots").upsert({
    workspace_id: workspaceId,
    state,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  });
  if (error) throw toError(error);
  await supabase
    .from("anime_workspaces")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", workspaceId);
}

export async function inviteToAnimeWorkspace(
  supabase: SupabaseClient,
  userId: string,
  email: string,
  role: "editor" | "viewer",
  state?: AnimeWorkspaceSnapshotState
) {
  const own = await ensureOwnWorkspace(supabase, userId);
  if (own.owner_user_id !== userId) {
    throw new Error("Only the anime workspace owner can invite");
  }
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) throw new Error("Valid email required");

  if (state) {
    await putAnimeSnapshot(supabase, userId, own.id, state);
  }

  const { data, error } = await supabase
    .from("anime_workspace_invites")
    .upsert(
      {
        workspace_id: own.id,
        email: normalized,
        role,
        invited_by: userId,
      },
      { onConflict: "workspace_id,email" }
    )
    .select("id, workspace_id, email, role, invited_by, created_at")
    .single();
  if (error) throw toError(error);
  return data;
}

export async function listAnimeShare(
  supabase: SupabaseClient,
  userId: string
) {
  const own = await ensureOwnWorkspace(supabase, userId);
  const { data: members } = await supabase
    .from("anime_workspace_members")
    .select("id, user_id, role, created_at")
    .eq("workspace_id", own.id);

  const { data: invites } = await supabase
    .from("anime_workspace_invites")
    .select("id, email, role, created_at")
    .eq("workspace_id", own.id)
    .order("created_at", { ascending: false });

  const userIds = [own.owner_user_id, ...(members ?? []).map((m) => m.user_id as string)];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .in("user_id", [...new Set(userIds)]);

  const nameById = new Map(
    (profiles ?? []).map((p) => [p.user_id as string, (p.display_name as string) || "Collector"])
  );

  return {
    workspaceId: own.id,
    members: [
      {
        id: `owner:${own.owner_user_id}`,
        userId: own.owner_user_id,
        role: "owner" as const,
        displayName: nameById.get(own.owner_user_id) ?? "Collector",
        isOwner: true,
      },
      ...(members ?? [])
        .filter((m) => m.user_id !== own.owner_user_id)
        .map((m) => ({
          id: m.id as string,
          userId: m.user_id as string,
          role: m.role as AnimeWorkspaceRole,
          displayName: nameById.get(m.user_id as string) ?? "Collector",
          isOwner: false,
        })),
    ],
    invites: (invites ?? []).map((i) => ({
      id: i.id as string,
      email: i.email as string,
      role: i.role as "editor" | "viewer",
      createdAt: i.created_at as string,
    })),
  };
}

export async function removeAnimeMember(
  supabase: SupabaseClient,
  userId: string,
  memberUserId: string
) {
  const own = await ensureOwnWorkspace(supabase, userId);
  if (memberUserId === userId) throw new Error("Cannot remove the owner");
  const { error } = await supabase
    .from("anime_workspace_members")
    .delete()
    .eq("workspace_id", own.id)
    .eq("user_id", memberUserId);
  if (error) throw toError(error);
}

export async function cancelAnimeInvite(
  supabase: SupabaseClient,
  userId: string,
  inviteId: string
) {
  const own = await ensureOwnWorkspace(supabase, userId);
  const { error } = await supabase
    .from("anime_workspace_invites")
    .delete()
    .eq("id", inviteId)
    .eq("workspace_id", own.id);
  if (error) throw toError(error);
}

/**
 * Accept pending anime workspace invites for the current user.
 * Tries the RPC first, then a service-role fallback keyed by auth email
 * (covers JWT email claim mismatches / missing migration edge cases).
 *
 * Non-schema RPC failures do not hard-fail: owners can still resolve/push.
 */
export async function acceptAnimeInvites(
  supabase: SupabaseClient,
  opts?: { userId?: string; email?: string | null }
) {
  let accepted = 0;
  let rpcError: string | null = null;

  const { data, error } = await supabase.rpc("accept_anime_workspace_invites");
  if (error) {
    rpcError = errorMessage(error);
  } else {
    accepted = typeof data === "number" ? data : 0;
  }

  if (accepted > 0) return { accepted, rpcError: null };

  const email = opts?.email?.trim().toLowerCase() || null;
  const userId = opts?.userId;
  const admin = getSupabaseAdmin();

  if (email && userId && admin) {
    const { data: invites, error: inviteErr } = await admin
      .from("anime_workspace_invites")
      .select("id, workspace_id, role")
      .eq("email", email);

    if (inviteErr) {
      const msg = errorMessage(inviteErr);
      if (isAnimeShareSchemaError(msg) || (rpcError && isAnimeShareSchemaError(rpcError))) {
        throw new Error(
          "Anime share tables missing. Run migration 0013_anime_workspace_share.sql (and 0014) in Supabase."
        );
      }
      // Soft-fail: don't block owner sync for invite lookup issues
      return { accepted: 0, rpcError: rpcError ?? msg };
    }

    for (const invite of invites ?? []) {
      const { error: memberErr } = await admin.from("anime_workspace_members").upsert(
        {
          workspace_id: invite.workspace_id,
          user_id: userId,
          role: invite.role,
        },
        { onConflict: "workspace_id,user_id" }
      );
      if (memberErr) throw toError(memberErr);
      await admin.from("anime_workspace_invites").delete().eq("id", invite.id);
      accepted += 1;
    }

    if (accepted > 0) return { accepted, rpcError: null };
  }

  if (rpcError && isAnimeShareSchemaError(rpcError)) {
    throw new Error(
      "Anime share tables missing. Run migration 0013_anime_workspace_share.sql (and 0014) in Supabase."
    );
  }

  return { accepted: 0, rpcError };
}

/** Accept invites then resolve the workspace the user should use. */
export async function resolveAnimeWorkspaceAfterAccept(
  supabase: SupabaseClient,
  userId: string,
  email?: string | null
): Promise<AnimeWorkspaceInfo & { accepted: number }> {
  const { accepted } = await acceptAnimeInvites(supabase, { userId, email });
  const info = await resolveAnimeWorkspace(supabase, userId);
  return { ...info, accepted };
}
