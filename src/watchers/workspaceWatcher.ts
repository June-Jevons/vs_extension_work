import * as vscode from "vscode";
import { LiveArchitectureStateManager } from "../core/analysisEngine";

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

  constructor(private readonly stateManager: LiveArchitectureStateManager) {}

  start(): void {
    const configuration = vscode.workspace.getConfiguration("liveArchitectureMap");
    if (!configuration.get<boolean>("autoWatch", true)) {
      return;
    }

    for (const pattern of WATCH_PATTERNS) {
      const watcher = vscode.workspace.createFileSystemWatcher(pattern);
      this.disposables.push(
        watcher,
        watcher.onDidCreate(() => this.scheduleRefresh()),
        watcher.onDidChange(() => this.scheduleRefresh()),
        watcher.onDidDelete(() => this.scheduleRefresh())
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

  private scheduleRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = undefined;
      void this.stateManager.refresh();
    }, 600);
  }
}
