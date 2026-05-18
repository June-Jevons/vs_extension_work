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

    const fromMatch = /^from\s+([A-Za-z_][\w.]*|\.+[A-Za-z_][\w.]*)\s+import\s+(.+)$/.exec(line);
    if (fromMatch?.[1] && fromMatch[2]) {
      const moduleName = fromMatch[1].trim();
      if (!isAbsoluteImport(moduleName)) {
        continue;
      }
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

export function resolveLocalImport(importName: string, moduleIds: ReadonlySet<string>): string | undefined {
  const normalized = importName.replaceAll(".", "/");
  if (moduleIds.has(normalized)) {
    return normalized;
  }

  const segments = normalized.split("/");
  while (segments.length > 1) {
    segments.pop();
    const candidate = segments.join("/");
    if (moduleIds.has(candidate)) {
      return candidate;
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
