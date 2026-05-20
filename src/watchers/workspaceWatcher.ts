import * as vscode from "vscode";
import { LiveArchitectureStateManager } from "../core/analysisEngine";
import { logInfo } from "../core/outputChannel";
import { shouldExcludePath } from "../core/scanPathFilter";

const WATCH_PATTERNS = [
  "**/.codex/status.json",
  "**/*.py",
  "**/*.launch.py",
  "**/*.cpp",
  "**/*.c",
  "**/*.h",
  "**/*.hpp",
  "**/*.ts",
  "**/*.tsx",
  "**/*.js",
  "**/*.jsx",
  "**/*.css",
  "**/*.scss",
  "**/*.yaml",
  "**/*.yml",
  "**/*.json",
  "**/*.toml",
  "**/*.md",
  "**/*.xml",
  "**/*.urdf",
  "**/*.xacro",
  "**/CMakeLists.txt",
  "**/package.xml",
  "**/setup.py",
  "**/pyproject.toml"
] as const;

const REFRESH_DEBOUNCE_MS = 160;

export class WorkspaceWatcher implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private refreshTimer: NodeJS.Timeout | undefined;
  private excludeGlobs: string[] = [];
  private readonly changedPaths = new Set<string>();
  private readonly deletedPaths = new Set<string>();

  constructor(private readonly stateManager: LiveArchitectureStateManager) {}

  start(): void {
    const configuration = vscode.workspace.getConfiguration("liveArchitectureMap");
    if (!configuration.get<boolean>("autoWatch", true)) {
      return;
    }
    this.excludeGlobs = configuration.get<string[]>("excludeGlobs", []);

    for (const pattern of WATCH_PATTERNS) {
      const watcher = vscode.workspace.createFileSystemWatcher(pattern);
      this.disposables.push(
        watcher,
        watcher.onDidCreate((uri) => this.scheduleRefresh(uri, "changed")),
        watcher.onDidChange((uri) => this.scheduleRefresh(uri, "changed")),
        watcher.onDidDelete((uri) => this.scheduleRefresh(uri, "deleted"))
      );
    }
  }

  dispose(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  private scheduleRefresh(uri: vscode.Uri, kind: "changed" | "deleted"): void {
    const relativePath = vscode.workspace.asRelativePath(uri, false).replaceAll("\\", "/");
    if (shouldExcludePath(relativePath, this.excludeGlobs)) {
      return;
    }
    const isStatusRefresh = relativePath === ".codex/status.json" || relativePath.endsWith("/.codex/status.json");
    if (isStatusRefresh) {
      logInfo(`watcher event: codex status changed path=${relativePath}`);
      this.queueRefresh();
      return;
    }

    if (kind === "deleted") {
      this.deletedPaths.add(relativePath);
      this.changedPaths.delete(relativePath);
    } else {
      this.changedPaths.add(relativePath);
      this.deletedPaths.delete(relativePath);
    }

    logInfo(`watcher event: kind=${kind}, path=${relativePath}`);
    this.queueRefresh();
  }

  private queueRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = undefined;
      const changedPaths = [...this.changedPaths];
      const deletedPaths = [...this.deletedPaths];
      this.changedPaths.clear();
      this.deletedPaths.clear();
      logInfo(`watcher refresh: changedPaths=${changedPaths.length}, deletedPaths=${deletedPaths.length}`);
      void this.stateManager.refresh({
        changedPaths,
        deletedPaths
      });
    }, REFRESH_DEBOUNCE_MS);
  }
}
