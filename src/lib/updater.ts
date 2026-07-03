const GITHUB_REPO = process.env.NEXT_PUBLIC_GITHUB_REPO ?? "";

export interface UpdateInfo {
  available: boolean;
  version?: string;
  url?: string;
  notes?: string;
}

export async function checkGitHubUpdate(currentVersion: string): Promise<UpdateInfo> {
  if (!GITHUB_REPO) {
    return { available: false };
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { available: false };
    const data = await res.json();
    const latest = (data.tag_name as string)?.replace(/^v/, "");
    if (!latest || latest === currentVersion) {
      return { available: false };
    }
    return {
      available: true,
      version: latest,
      url: data.html_url as string,
      notes: data.body as string,
    };
  } catch {
    return { available: false };
  }
}

export async function checkTauriUpdate(): Promise<UpdateInfo> {
  if (typeof window === "undefined") return { available: false };
  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    if (!update) return { available: false };
    return {
      available: true,
      version: update.version,
      notes: update.body ?? undefined,
    };
  } catch {
    return checkGitHubUpdate(process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0");
  }
}

export async function installTauriUpdate(): Promise<boolean> {
  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const { relaunch } = await import("@tauri-apps/plugin-process");
    const update = await check();
    if (!update) return false;
    await update.downloadAndInstall();
    await relaunch();
    return true;
  } catch {
    return false;
  }
}
