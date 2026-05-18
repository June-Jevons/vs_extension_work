export type DirectoryEntryKind = "file" | "directory" | "other";

export interface DirectoryEntryLike {
  name: string;
  kind: DirectoryEntryKind;
}

export interface ReadDirectoryAdapter<TLocation> {
  readDirectory(location: TLocation): Promise<DirectoryEntryLike[]>;
  joinPath(location: TLocation, segment: string): TLocation;
  relativePath(root: TLocation, location: TLocation): string;
}

export interface ReadDirectoryScanConfig {
  excludeGlobs: string[];
  maxFilesToAnalyze: number;
}

export interface ReadDirectoryScanResult<TLocation> {
  files: TLocation[];
  unreadablePaths: string[];
}

export async function scanReadDirectoryTree<TLocation>(
  root: TLocation,
  config: ReadDirectoryScanConfig,
  adapter: ReadDirectoryAdapter<TLocation>
): Promise<ReadDirectoryScanResult<TLocation>> {
  const maxFiles = Math.max(config.maxFilesToAnalyze, 1);
  const files: TLocation[] = [];
  const unreadablePaths: string[] = [];
  const queue: TLocation[] = [root];

  while (queue.length > 0 && files.length < maxFiles) {
    const current = queue.shift();
    if (current === undefined) {
      break;
    }

    let entries: DirectoryEntryLike[];
    try {
      entries = await adapter.readDirectory(current);
    } catch {
      const path = normalizeRelativePath(adapter.relativePath(root, current));
      unreadablePaths.push(path || ".");
      continue;
    }

    for (const entry of entries) {
      const child = adapter.joinPath(current, entry.name);
      const relativePath = normalizeRelativePath(adapter.relativePath(root, child));
      if (!relativePath || shouldExcludePath(relativePath, config.excludeGlobs)) {
        continue;
      }

      if (entry.kind === "directory") {
        queue.push(child);
        continue;
      }

      if (entry.kind === "file" && isWatchedScanPath(relativePath)) {
        files.push(child);
        if (files.length >= maxFiles) {
          break;
        }
      }
    }
  }

  return {
    files,
    unreadablePaths
  };
}

export function isWatchedScanPath(relativePath: string): boolean {
  const normalized = normalizeRelativePath(relativePath).toLowerCase();
  const fileName = normalized.split("/").at(-1) ?? normalized;
  return normalized.endsWith(".py")
    || normalized.endsWith(".yaml")
    || normalized.endsWith(".yml")
    || normalized.endsWith(".json")
    || normalized.endsWith(".toml")
    || normalized.endsWith(".md")
    || fileName === "package.xml"
    || fileName === "setup.py"
    || fileName === "pyproject.toml";
}

export function shouldExcludePath(relativePath: string, excludeGlobs: string[]): boolean {
  const normalized = normalizeRelativePath(relativePath).toLowerCase();
  const pathSegments = normalized.split("/");

  return excludeGlobs.some((glob) => {
    const lowerGlob = normalizeRelativePath(glob).toLowerCase();
    const segmentMatch = /^\*\*\/([^/]+)\/\*\*$/.exec(lowerGlob);
    if (segmentMatch?.[1]) {
      return pathSegments.includes(segmentMatch[1]);
    }

    const fileMatch = /^\*\*\/([^/]+)$/.exec(lowerGlob);
    if (fileMatch?.[1]) {
      return pathSegments.includes(fileMatch[1]) || normalized.endsWith(fileMatch[1]);
    }

    const prefix = lowerGlob.replace(/\*\*\/?/g, "").replace(/\/\*\*$/g, "");
    return prefix.length > 0 && normalized.includes(prefix.replaceAll("*", ""));
  });
}

function normalizeRelativePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\/+/, "").replace(/\/+$/, "");
}
