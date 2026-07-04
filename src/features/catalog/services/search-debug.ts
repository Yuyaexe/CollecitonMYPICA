export type SearchDebugLevel = "info" | "warn" | "error" | "success";

export interface SearchDebugEntry {
  at: string;
  level: SearchDebugLevel;
  stage: string;
  message: string;
  ms?: number;
  detail?: string;
}

export class SearchDebugLog {
  private entries: SearchDebugEntry[] = [];

  push(level: SearchDebugLevel, stage: string, message: string, extra?: { ms?: number; detail?: string }) {
    this.entries.push({
      at: new Date().toISOString(),
      level,
      stage,
      message,
      ms: extra?.ms,
      detail: extra?.detail,
    });
  }

  async time<T>(stage: string, message: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      this.push("success", stage, message, { ms: Date.now() - start });
      return result;
    } catch (error) {
      this.push("error", stage, message, {
        ms: Date.now() - start,
        detail: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  toJSON(): SearchDebugEntry[] {
    return [...this.entries];
  }
}

export function mergeSearchDebugLogs(...logs: SearchDebugEntry[][]): SearchDebugEntry[] {
  return logs.flat().sort((a, b) => a.at.localeCompare(b.at));
}
