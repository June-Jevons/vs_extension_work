import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { logInfo } from "../core/outputChannel";
import { DashboardState } from "../webview/dashboardState";
import { isExtensionManagedStoragePath } from "./workspaceKey";

export interface ExportSnapshotOptions {
  simulateCancel?: boolean;
}

export interface ExportSnapshotResult {
  exported: boolean;
  cancelled: boolean;
  uri?: string;
  reason?: string;
  defaultUri: string;
  defaultInsideWorkspace: boolean;
  wroteWorkspaceFiles: boolean;
}

export async function exportSnapshotAsJson(
  context: vscode.ExtensionContext,
  state: DashboardState,
  options?: ExportSnapshotOptions
): Promise<ExportSnapshotResult> {
  const defaultUri = buildDefaultExportUri(context, state);
  const workspacePath = state.diagnostics.workspaceFsPath ?? state.snapshot.rootUri;
  const defaultInsideWorkspace = !isExtensionManagedStoragePath(defaultUri.fsPath, workspacePath);

  if (options?.simulateCancel) {
    return {
      exported: false,
      cancelled: true,
      reason: "Export cancelled before choosing a save location.",
      defaultUri: defaultUri.toString(),
      defaultInsideWorkspace,
      wroteWorkspaceFiles: false
    };
  }

  const target = await vscode.window.showSaveDialog({
    defaultUri,
    filters: {
      JSON: ["json"]
    },
    saveLabel: "Export Snapshot"
  });

  if (!target) {
    logInfo("export snapshot: cancelled by user");
    return {
      exported: false,
      cancelled: true,
      reason: "Export cancelled by user.",
      defaultUri: defaultUri.toString(),
      defaultInsideWorkspace,
      wroteWorkspaceFiles: false
    };
  }

  const snapshotJson = JSON.stringify({
    exportedAtIso: new Date().toISOString(),
    stateSource: state.diagnostics.stateSource,
    isMockData: state.isMockData,
    workspace: state.workspace,
    diagnostics: state.diagnostics,
    snapshot: state.snapshot,
    baselineDiff: state.baselineDiff
  }, null, 2);
  await vscode.workspace.fs.createDirectory(parentUri(target));
  await vscode.workspace.fs.writeFile(target, Buffer.from(snapshotJson, "utf8"));
  const wroteWorkspaceFiles = !isExtensionManagedStoragePath(target.fsPath, workspacePath);
  logInfo(`export snapshot: uri=${target.toString()}, wroteWorkspaceFiles=${wroteWorkspaceFiles}`);

  return {
    exported: true,
    cancelled: false,
    uri: target.toString(),
    defaultUri: defaultUri.toString(),
    defaultInsideWorkspace,
    wroteWorkspaceFiles
  };
}

export function buildDefaultExportUri(context: vscode.ExtensionContext, state: DashboardState): vscode.Uri {
  const workspacePath = state.diagnostics.workspaceFsPath ?? state.snapshot.rootUri;
  let baseUri = context.globalStorageUri ?? context.storageUri ?? context.extensionUri;
  if (!isExtensionManagedStoragePath(baseUri.fsPath, workspacePath)) {
    baseUri = vscode.Uri.file(path.join(os.tmpdir(), "live-architecture-map"));
  }
  const safeWorkspaceName = state.workspace.name.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "workspace";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `${safeWorkspaceName}-architecture-snapshot-${timestamp}.json`;
  return vscode.Uri.joinPath(baseUri, "exports", fileName);
}

function parentUri(uri: vscode.Uri): vscode.Uri {
  const parentPath = uri.path.replace(/\/[^/]*$/, "") || "/";
  return uri.with({ path: parentPath });
}
