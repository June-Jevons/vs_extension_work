import { ChangedFile } from "../webview/dashboardState";

export interface ParsedGitStatus {
  branch: string;
  changedFiles: Array<Pick<ChangedFile, "path" | "status">>;
}

export function parseGitStatusPorcelain(output: string, branch = "unknown"): ParsedGitStatus {
  const changedFiles: ParsedGitStatus["changedFiles"] = [];

  for (const line of output.split(/\r?\n/)) {
    if (!line.trim()) {
      continue;
    }

    const statusCode = line.slice(0, 2);
    const rawPath = line.slice(3).trim();
    if (!rawPath) {
      continue;
    }

    const renamedPath = rawPath.includes(" -> ") ? rawPath.split(" -> ").at(-1) ?? rawPath : rawPath;
    changedFiles.push({
      path: normalizeGitPath(renamedPath),
      status: mapStatus(statusCode)
    });
  }

  return {
    branch,
    changedFiles
  };
}

function mapStatus(statusCode: string): ChangedFile["status"] {
  if (statusCode === "??") {
    return "untracked";
  }
  if (statusCode.includes("R")) {
    return "renamed";
  }
  if (statusCode.includes("A")) {
    return "added";
  }
  if (statusCode.includes("D")) {
    return "deleted";
  }
  if (statusCode.includes("M")) {
    return "modified";
  }
  return "unknown";
}

function normalizeGitPath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^"|"$/g, "");
}
