import * as vscode from "vscode";
import { logInfo } from "../core/outputChannel";
import { ChangedFile, GitStatusSource, GitSummary } from "../webview/dashboardState";

export interface GitStatusResult {
  summary?: GitSummary;
  source: GitStatusSource;
  changedFiles: Array<Pick<ChangedFile, "path" | "status">>;
  unavailableReason?: string;
}

interface GitExtension {
  getAPI(version: 1): GitApi;
}

interface GitApi {
  repositories: GitRepository[];
}

interface GitRepository {
  rootUri: vscode.Uri;
  state: {
    HEAD?: {
      name?: string;
      ahead?: number;
      behind?: number;
    };
    workingTreeChanges: GitResourceState[];
    indexChanges: GitResourceState[];
    untrackedChanges: GitResourceState[];
  };
}

interface GitResourceState {
  resourceUri: vscode.Uri;
  type?: number;
}

export async function getGitStatus(folder: vscode.WorkspaceFolder): Promise<GitStatusResult> {
  const fromApi = await getGitStatusFromVsCodeApi(folder);
  logInfo(`git status source=${fromApi.source}, branch=${fromApi.summary?.branch ?? "unknown"}, changedFileCount=${fromApi.changedFiles.length}${fromApi.unavailableReason ? `, unavailableReason=${fromApi.unavailableReason}` : ""}`);
  return fromApi;
}

async function getGitStatusFromVsCodeApi(folder: vscode.WorkspaceFolder): Promise<GitStatusResult> {
  const extension = vscode.extensions.getExtension<GitExtension>("vscode.git");
  if (!extension) {
    return gitUnavailable("VS Code Git extension is unavailable.");
  }

  let gitExtension: GitExtension;
  try {
    gitExtension = extension.isActive ? extension.exports : await extension.activate();
  } catch (error: unknown) {
    return gitUnavailable(`VS Code Git extension activation failed: ${error instanceof Error ? error.message : "unknown error"}`);
  }

  const api = gitExtension.getAPI(1);
  const repository = api.repositories.find((candidate) => isSameOrParentPath(candidate.rootUri.fsPath, folder.uri.fsPath));
  if (!repository) {
    return gitUnavailable("No VS Code Git repository matches the workspace folder.");
  }

  const changes = [
    ...repository.state.workingTreeChanges,
    ...repository.state.indexChanges,
    ...repository.state.untrackedChanges
  ];
  const changedFiles = dedupeChangedFiles(changes
    .filter((change) => isSameOrParentPath(folder.uri.fsPath, change.resourceUri.fsPath))
    .map((change) => ({
      path: normalizeRelativePath(folder.uri, change.resourceUri),
      status: mapGitApiStatus(change.type)
    })));

  return {
    source: "VS Code Git API",
    summary: {
      branch: repository.state.HEAD?.name ?? "unknown",
      changedFileCount: changedFiles.length,
      ahead: repository.state.HEAD?.ahead ?? 0,
      behind: repository.state.HEAD?.behind ?? 0
    },
    changedFiles
  };
}

function normalizeRelativePath(rootUri: vscode.Uri, resourceUri: vscode.Uri): string {
  const relative = resourceUri.fsPath.slice(rootUri.fsPath.length).replace(/^[/\\]+/, "");
  return relative.replaceAll("\\", "/");
}

function mapGitApiStatus(type: number | undefined): ChangedFile["status"] {
  switch (type) {
    case 0:
    case 5:
      return "modified";
    case 1:
    case 13:
    case 15:
      return "added";
    case 2:
    case 6:
    case 10:
    case 11:
    case 14:
      return "deleted";
    case 3:
      return "renamed";
    case 7:
    case 9:
      return "untracked";
    case 12:
    case 16:
      return "modified";
    default:
      return "unknown";
  }
}

function dedupeChangedFiles(files: Array<Pick<ChangedFile, "path" | "status">>): Array<Pick<ChangedFile, "path" | "status">> {
  const byPath = new Map<string, Pick<ChangedFile, "path" | "status">>();
  const priority: Record<ChangedFile["status"], number> = {
    modified: 5,
    added: 6,
    deleted: 6,
    renamed: 6,
    untracked: 4,
    unknown: 1
  };

  for (const file of files) {
    const existing = byPath.get(file.path);
    if (!existing || priority[file.status] >= priority[existing.status]) {
      byPath.set(file.path, file);
    }
  }

  return [...byPath.values()].sort((left, right) => left.path.localeCompare(right.path));
}

function gitUnavailable(unavailableReason: string): GitStatusResult {
  return {
    source: "unavailable",
    changedFiles: [],
    unavailableReason
  };
}

function isSameOrParentPath(repositoryRoot: string, workspacePath: string): boolean {
  const normalizedRoot = repositoryRoot.replaceAll("\\", "/").replace(/\/+$/, "");
  const normalizedWorkspace = workspacePath.replaceAll("\\", "/").replace(/\/+$/, "");
  return normalizedWorkspace === normalizedRoot || normalizedWorkspace.startsWith(`${normalizedRoot}/`);
}
