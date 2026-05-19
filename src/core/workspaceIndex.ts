export interface WorkspaceIndexDecisionInput {
  hasExistingIndex: boolean;
  manualFullRefresh?: boolean;
  branchChanged?: boolean;
  settingsChanged?: boolean;
  schemaChanged?: boolean;
  cacheInvalidated?: boolean;
  changedPaths: readonly string[];
  maxIncrementalPaths: number;
}

export interface WorkspaceIndexDecision {
  fullRebuild: boolean;
  reason: string;
}

export class WorkspaceIndex {
  private readonly paths = new Set<string>();

  get size(): number {
    return this.paths.size;
  }

  updateFromFullScan(paths: readonly string[]): void {
    this.paths.clear();
    for (const item of paths) {
      this.paths.add(normalizePath(item));
    }
  }

  applyChanges(createdOrChangedPaths: readonly string[], deletedPaths: readonly string[] = []): void {
    for (const item of createdOrChangedPaths) {
      this.paths.add(normalizePath(item));
    }
    for (const item of deletedPaths) {
      this.paths.delete(normalizePath(item));
    }
  }

  has(path: string): boolean {
    return this.paths.has(normalizePath(path));
  }

  snapshot(): string[] {
    return [...this.paths].sort();
  }
}

export function decideWorkspaceIndexRefresh(input: WorkspaceIndexDecisionInput): WorkspaceIndexDecision {
  if (!input.hasExistingIndex) {
    return { fullRebuild: true, reason: "first workspace open" };
  }
  if (input.manualFullRefresh) {
    return { fullRebuild: true, reason: "manual full refresh" };
  }
  if (input.branchChanged) {
    return { fullRebuild: true, reason: "branch change" };
  }
  if (input.settingsChanged) {
    return { fullRebuild: true, reason: "settings/exclude globs change" };
  }
  if (input.schemaChanged) {
    return { fullRebuild: true, reason: "cache schema version change" };
  }
  if (input.cacheInvalidated) {
    return { fullRebuild: true, reason: "explicit cache invalidation" };
  }
  if (input.changedPaths.length > input.maxIncrementalPaths) {
    return { fullRebuild: true, reason: "too many changed paths in one batch" };
  }
  return { fullRebuild: false, reason: input.changedPaths.length > 0 ? "watcher incremental update" : "no changed paths" };
}

function normalizePath(value: string): string {
  return value.replaceAll("\\", "/").replace(/^\/+/, "");
}
