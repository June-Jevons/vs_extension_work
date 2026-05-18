import * as cp from "child_process";
import * as vscode from "vscode";
import { logInfo } from "../core/outputChannel";
import { ChangedFile, GitStatusSource, GitSummary } from "../webview/dashboardState";
import { parseGitStatusPorcelain } from "./gitStatusParser";

export interface GitStatusResult {
  summary?: GitSummary;
  source: GitStatusSource;
  changedFiles: Array<Pick<ChangedFile, "path" | "status">>;
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
  if (fromApi) {
    logInfo(`git status source=${fromApi.source}, branch=${fromApi.summary?.branch ?? "unknown"}, changedFileCount=${fromApi.changedFiles.length}`);
    return fromApi;
  }

  const fromCli = await getGitStatusFromCli(folder.uri.fsPath);
  logInfo(`git status source=${fromCli.source}, branch=${fromCli.summary?.branch ?? "unknown"}, changedFileCount=${fromCli.changedFiles.length}`);
  return fromCli;
}

async function getGitStatusFromVsCodeApi(folder: vscode.WorkspaceFolder): Promise<GitStatusResult | undefined> {
  const extension = vscode.extensions.getExtension<GitExtension>("vscode.git");
  if (!extension) {
    return undefined;
  }

  const gitExtension = extension.isActive ? extension.exports : await extension.activate();
  const api = gitExtension.getAPI(1);
  const repository = api.repositories.find((candidate) => candidate.rootUri.fsPath === folder.uri.fsPath);
  if (!repository) {
    return undefined;
  }

  const changes = [
    ...repository.state.workingTreeChanges,
    ...repository.state.indexChanges,
    ...repository.state.untrackedChanges
  ];
  const changedFiles = changes.map((change) => ({
    path: normalizeRelativePath(folder.uri, change.resourceUri),
    status: mapGitApiStatus(change.type)
  }));

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

function getGitStatusFromCli(cwd: string): Promise<GitStatusResult> {
  return new Promise((resolve) => {
    cp.execFile("git", ["-c", "safe.directory=*", "status", "--porcelain=v1", "--branch"], { cwd, windowsHide: true }, (error, stdout) => {
      if (error) {
        resolve({
          source: "unavailable",
          changedFiles: []
        });
        return;
      }

      const lines = stdout.split(/\r?\n/);
      const branchLine = lines.find((line) => line.startsWith("## "));
      const branch = branchLine ? parseBranch(branchLine) : "unknown";
      const statusOutput = lines.filter((line) => !line.startsWith("## ")).join("\n");
      const parsed = parseGitStatusPorcelain(statusOutput, branch);
      resolve({
        source: "CLI fallback",
        summary: {
          branch,
          changedFileCount: parsed.changedFiles.length,
          ahead: 0,
          behind: 0
        },
        changedFiles: parsed.changedFiles
      });
    });
  });
}

function parseBranch(line: string): string {
  return line.replace(/^##\s+/, "").split("...")[0]?.trim() || "unknown";
}

function normalizeRelativePath(rootUri: vscode.Uri, resourceUri: vscode.Uri): string {
  const relative = resourceUri.fsPath.slice(rootUri.fsPath.length).replace(/^[/\\]+/, "");
  return relative.replaceAll("\\", "/");
}

function mapGitApiStatus(type: number | undefined): ChangedFile["status"] {
  switch (type) {
    case 0:
      return "modified";
    case 1:
      return "added";
    case 2:
      return "deleted";
    case 3:
      return "renamed";
    default:
      return "unknown";
  }
}
