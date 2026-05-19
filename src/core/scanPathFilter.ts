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
