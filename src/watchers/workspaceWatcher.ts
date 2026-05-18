import * as vscode from "vscode";
import { LiveArchitectureStateManager } from "../core/analysisEngine";
import { shouldExcludePath } from "../core/readDirectoryFallbackScanner";

const WATCH_PATTERNS = [
  "**/*.py",
  "**/*.yaml",
  "**/*.yml",
  "**/*.json",
  "**/*.toml",
  "**/*.md",
  "**/package.xml",
  "**/setup.py",
  "**/pyproject.toml"
] as const;

export class WorkspaceWatcher implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private refreshTimer: NodeJS.Timeout | undefined;
  private excludeGlobs: string[] = [];

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
        watcher.onDidCreate((uri) => this.scheduleRefresh(uri)),
        watcher.onDidChange((uri) => this.scheduleRefresh(uri)),
        watcher.onDidDelete((uri) => this.scheduleRefresh(uri))
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

  private scheduleRefresh(uri: vscode.Uri): void {
    const relativePath = vscode.workspace.asRelativePath(uri, false).replaceAll("\\", "/");
    if (shouldExcludePath(relativePath, this.excludeGlobs)) {
      return;
    }

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = undefined;
      void this.stateManager.refresh();
    }, 600);
  }
}
