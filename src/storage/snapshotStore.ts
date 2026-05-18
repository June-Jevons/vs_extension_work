import * as vscode from "vscode";
import { WorkspaceSnapshot } from "../webview/dashboardState";
import { isExtensionManagedStoragePath } from "./workspaceKey";

const SNAPSHOT_PREFIX = "liveArchitectureMap.snapshot.";

export interface StoragePathAudit {
  workspaceStateOnly: true;
  storageUriSafe: boolean;
  globalStorageUriSafe: boolean;
}

export class SnapshotStore {
  constructor(private readonly context: vscode.ExtensionContext) {}

  async saveSnapshot(snapshot: WorkspaceSnapshot): Promise<void> {
    await this.context.workspaceState.update(this.snapshotKey(snapshot.workspaceKey), snapshot);
  }

  getSnapshot(workspaceKey: string): WorkspaceSnapshot | undefined {
    return this.context.workspaceState.get<WorkspaceSnapshot>(this.snapshotKey(workspaceKey));
  }

  async clearSnapshot(workspaceKey: string): Promise<void> {
    await this.context.workspaceState.update(this.snapshotKey(workspaceKey), undefined);
  }

  auditStoragePaths(workspaceFsPath: string): StoragePathAudit {
    return {
      workspaceStateOnly: true,
      storageUriSafe: isExtensionManagedStoragePath(this.context.storageUri?.fsPath, workspaceFsPath),
      globalStorageUriSafe: isExtensionManagedStoragePath(this.context.globalStorageUri?.fsPath, workspaceFsPath)
    };
  }

  private snapshotKey(workspaceKey: string): string {
    return `${SNAPSHOT_PREFIX}${workspaceKey}`;
  }
}
