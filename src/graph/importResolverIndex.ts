import { ParsedImport } from "./importParser";

export interface ImportResolverIndex {
  exactIds: Set<string>;
  suffixIndex: Map<string, string[]>;
  parentPackageIndex: Map<string, string[]>;
  topLevelPackageIndex: Map<string, string[]>;
  reverseDependencyIndex: Map<string, string[]>;
}

export function buildImportResolverIndex(
  moduleIds: Iterable<string>,
  dependencies: readonly { from: string; to: string }[] = []
): ImportResolverIndex {
  const exactIds = new Set([...moduleIds].map(normalizeModuleId));
  const suffixIndex = new Map<string, string[]>();
  const parentPackageIndex = new Map<string, string[]>();
  const topLevelPackageIndex = new Map<string, string[]>();
  const reverseDependencyIndex = new Map<string, string[]>();

  for (const moduleId of exactIds) {
    const segments = moduleId.split("/");
    for (let index = 0; index < segments.length; index += 1) {
      addIndexedValue(suffixIndex, segments.slice(index).join("/"), moduleId);
    }
    addIndexedValue(parentPackageIndex, segments.slice(0, -1).join("/"), moduleId);
    addIndexedValue(topLevelPackageIndex, segments[0] ?? "", moduleId);
  }

  for (const dependency of dependencies) {
    addIndexedValue(reverseDependencyIndex, dependency.to, dependency.from);
  }

  sortIndex(suffixIndex);
  sortIndex(parentPackageIndex);
  sortIndex(topLevelPackageIndex);
  sortIndex(reverseDependencyIndex);

  return {
    exactIds,
    suffixIndex,
    parentPackageIndex,
    topLevelPackageIndex,
    reverseDependencyIndex
  };
}

export function resolveLocalImportWithIndex(
  importName: string | ParsedImport,
  index: ImportResolverIndex,
  sourceModuleId?: string
): string | undefined {
  const candidates = typeof importName === "string"
    ? getAbsoluteCandidates(importName, undefined)
    : getImportCandidates(importName, sourceModuleId);

  for (const candidate of candidates) {
    const resolved = resolveCandidate(candidate, index);
    if (resolved) {
      return resolved;
    }
  }
  return undefined;
}

function resolveCandidate(candidate: string, index: ImportResolverIndex): string | undefined {
  const normalized = normalizeModuleId(candidate);
  if (index.exactIds.has(normalized)) {
    return normalized;
  }

  const suffixMatches = index.suffixIndex.get(normalized) ?? [];
  if (suffixMatches.length === 1) {
    return suffixMatches[0];
  }

  const segments = normalized.split("/");
  while (segments.length > 1) {
    segments.pop();
    const parent = segments.join("/");
    if (index.exactIds.has(parent)) {
      return parent;
    }
    const parentSuffixMatches = index.suffixIndex.get(parent) ?? [];
    if (parentSuffixMatches.length === 1) {
      return parentSuffixMatches[0];
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

function addIndexedValue(index: Map<string, string[]>, key: string, value: string): void {
  if (!key) {
    return;
  }
  const values = index.get(key) ?? [];
  if (!values.includes(value)) {
    values.push(value);
  }
  index.set(key, values);
}

function sortIndex(index: Map<string, string[]>): void {
  for (const [key, values] of index) {
    index.set(key, values.sort());
  }
}

function normalizeModuleId(value: string): string {
  return value.replaceAll("\\", "/").replace(/^\/+/, "");
}

function splitPath(value: string): string[] {
  return value.split("/").filter(Boolean);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}
