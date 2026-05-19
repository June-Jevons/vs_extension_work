import { ChangedFile } from "../webview/dashboardState";

export function mergeChangedFileInputs(
  gitFiles: Array<Pick<ChangedFile, "path" | "status">>,
  changedPaths: readonly string[],
  deletedPaths: readonly string[]
): Array<Pick<ChangedFile, "path" | "status">> {
  const byPath = new Map<string, Pick<ChangedFile, "path" | "status">>();

  for (const changedPath of changedPaths) {
    const normalizedPath = normalizeChangePath(changedPath);
    if (normalizedPath) {
      byPath.set(normalizedPath, {
        path: normalizedPath,
        status: "modified"
      });
    }
  }

  for (const gitFile of gitFiles) {
    const normalizedPath = normalizeChangePath(gitFile.path);
    if (normalizedPath) {
      byPath.set(normalizedPath, {
        path: normalizedPath,
        status: gitFile.status
      });
    }
  }

  for (const deletedPath of deletedPaths) {
    const normalizedPath = normalizeChangePath(deletedPath);
    if (normalizedPath) {
      byPath.set(normalizedPath, {
        path: normalizedPath,
        status: "deleted"
      });
    }
  }

  return [...byPath.values()].sort((left, right) => left.path.localeCompare(right.path));
}

function normalizeChangePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\/+/, "").trim();
}
