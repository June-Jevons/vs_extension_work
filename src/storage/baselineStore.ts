import * as vscode from "vscode";
import { WorkspaceSnapshot } from "../webview/dashboardState";
import { isExtensionManagedStoragePath } from "./workspaceKey";

const BASELINE_PREFIX = "liveArchitectureMap.baseline.";

export interface StoredBaseline {
  id: string;
  capturedAtIso: string;
  snapshot: WorkspaceSnapshot;
}

export class BaselineStore {
  constructor(private readonly context: vscode.ExtensionContext) {}

  async saveBaseline(workspaceKey: string, snapshot: WorkspaceSnapshot): Promise<StoredBaseline> {
    const baseline: StoredBaseline = {
      id: `baseline_${snapshot.capturedAtIso.replaceAll(":", "-")}`,
      capturedAtIso: snapshot.capturedAtIso,
      snapshot
    };
    await this.context.workspaceState.update(this.baselineKey(workspaceKey), baseline);
    return baseline;
  }

  getBaseline(workspaceKey: string): StoredBaseline | undefined {
    return this.context.workspaceState.get<StoredBaseline>(this.baselineKey(workspaceKey));
  }

  async clearBaseline(workspaceKey: string): Promise<void> {
    await this.context.workspaceState.update(this.baselineKey(workspaceKey), undefined);
  }

  auditStoragePaths(workspaceFsPath: string): { workspaceStateOnly: true; storageUriSafe: boolean; globalStorageUriSafe: boolean } {
    return {
      workspaceStateOnly: true,
      storageUriSafe: isExtensionManagedStoragePath(this.context.storageUri?.fsPath, workspaceFsPath),
      globalStorageUriSafe: isExtensionManagedStoragePath(this.context.globalStorageUri?.fsPath, workspaceFsPath)
    };
  }

  private baselineKey(workspaceKey: string): string {
    return `${BASELINE_PREFIX}${workspaceKey}`;
  }
}
