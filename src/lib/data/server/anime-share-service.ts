import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnimeCharacter, AnimeSeries } from "@/features/anime-collection/types";
import type { AnimeCharacterCard } from "@/lib/demo/types";

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
  if (findErr) throw findErr;
  if (existing) return existing as { id: string; owner_user_id: string };

  const { data: created, error } = await supabase
    .from("anime_workspaces")
    .insert({ owner_user_id: userId })
    .select("id, owner_user_id")
    .single();
  if (error) throw error;

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
  if (error) throw error;
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
  if (error) throw error;
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
  if (error) throw error;
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
  if (error) throw error;
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
  if (error) throw error;
}

export async function acceptAnimeInvites(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc("accept_anime_workspace_invites");
  if (error) throw error;
  return { accepted: typeof data === "number" ? data : 0 };
}
