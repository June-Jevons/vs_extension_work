export interface ParsedImport {
  module: string;
  importedName?: string;
  statement: string;
  line: number;
}

export function parsePythonImports(source: string): ParsedImport[] {
  const imports: ParsedImport[] = [];
  const lines = source.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index] ?? "";
    const line = stripInlineComment(rawLine).trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const importMatch = /^import\s+(.+)$/.exec(line);
    if (importMatch?.[1]) {
      for (const importPart of importMatch[1].split(",")) {
        const moduleName = importPart.trim().split(/\s+as\s+/)[0]?.trim();
        if (moduleName && isAbsoluteImport(moduleName)) {
          imports.push({
            module: moduleName,
            statement: rawLine.trim(),
            line: index + 1
          });
        }
      }
      continue;
    }

    const fromMatch = /^from\s+([A-Za-z_][\w.]*|\.*[A-Za-z_][\w.]*|\.+)\s+import\s+(.+)$/.exec(line);
    if (fromMatch?.[1] && fromMatch[2]) {
      const moduleName = fromMatch[1].trim();
      for (const importPart of fromMatch[2].split(",")) {
        const importedName = importPart.trim().split(/\s+as\s+/)[0]?.trim();
        imports.push({
          module: moduleName,
          importedName: importedName && importedName !== "*" ? importedName : undefined,
          statement: rawLine.trim(),
          line: index + 1
        });
      }
    }
  }

  return imports;
}

export function resolveLocalImport(
  importName: string | ParsedImport,
  moduleIds: ReadonlySet<string>,
  sourceModuleId?: string
): string | undefined {
  const candidates = typeof importName === "string"
    ? getAbsoluteCandidates(importName, undefined)
    : getImportCandidates(importName, sourceModuleId);

  for (const candidate of candidates) {
    const resolved = resolveCandidate(candidate, moduleIds);
    if (resolved) {
      return resolved;
    }
  }

  return undefined;
}

function getImportCandidates(parsedImport: ParsedImport, sourceModuleId: string | undefined): string[] {
  if (!parsedImport.module.startsWith(".")) {
    return getAbsoluteCandidates(parsedImport.module, parsedImport.importedName);
  }

  if (!sourceModuleId) {
    return [];
  }

  const level = parsedImport.module.match(/^\.+/)?.[0].length ?? 0;
  const remainder = parsedImport.module.slice(level).replaceAll(".", "/");
  const sourcePackage = sourceModuleId.split("/").slice(0, -1);
  const base = sourcePackage.slice(0, Math.max(0, sourcePackage.length - (level - 1)));
  const modulePath = [...base, ...splitPath(remainder)].join("/");
  const importedPath = parsedImport.importedName
    ? [...splitPath(modulePath), parsedImport.importedName].join("/")
    : undefined;

  return uniqueStrings([
    importedPath,
    modulePath
  ].filter((value): value is string => Boolean(value)));
}

function getAbsoluteCandidates(moduleName: string, importedName: string | undefined): string[] {
  const normalized = moduleName.replaceAll(".", "/");
  const importedPath = importedName ? `${normalized}/${importedName}` : undefined;
  return uniqueStrings([
    importedPath,
    normalized
  ].filter((value): value is string => Boolean(value)));
}

function resolveCandidate(candidate: string, moduleIds: ReadonlySet<string>): string | undefined {
  const normalized = candidate.replaceAll("\\", "/").replace(/^\/+/, "");
  if (moduleIds.has(normalized)) {
    return normalized;
  }

  const suffixMatches = [...moduleIds].filter((moduleId) => moduleId.endsWith(`/${normalized}`));
  if (suffixMatches.length === 1) {
    return suffixMatches[0];
  }

  const segments = normalized.split("/");
  while (segments.length > 1) {
    segments.pop();
    const parent = segments.join("/");
    if (moduleIds.has(parent)) {
      return parent;
    }
    const parentSuffixMatches = [...moduleIds].filter((moduleId) => moduleId.endsWith(`/${parent}`));
    if (parentSuffixMatches.length === 1) {
      return parentSuffixMatches[0];
    }
  }

  return undefined;
}

function stripInlineComment(line: string): string {
  let quote: "\"" | "'" | undefined;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const previous = index > 0 ? line[index - 1] : undefined;
    if ((char === "\"" || char === "'") && previous !== "\\") {
      quote = quote === char ? undefined : quote ?? char;
    }
    if (char === "#" && !quote) {
      return line.slice(0, index);
    }
  }
  return line;
}

function isAbsoluteImport(moduleName: string): boolean {
  return !moduleName.startsWith(".");
}

function splitPath(value: string): string[] {
  return value.split("/").filter(Boolean);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}
