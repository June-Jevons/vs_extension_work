import { DependencyEdge, ModuleNode } from "../webview/dashboardState";
import { ParsedImport, resolveLocalImport } from "./importParser";

export interface ModuleImportRecord {
  moduleId: string;
  imports: ParsedImport[];
}

export interface DependencyGraphDiagnostics {
  parsedImportStatementCount: number;
  resolvedLocalEdgeCount: number;
  unresolvedImportCount: number;
  topIncoming: Array<{ moduleId: string; count: number }>;
  topOutgoing: Array<{ moduleId: string; count: number }>;
}

export function buildDependencyGraph(
  modules: ModuleNode[],
  importRecords: ModuleImportRecord[]
): { modules: ModuleNode[]; dependencies: DependencyEdge[]; diagnostics: DependencyGraphDiagnostics } {
  const moduleIds = new Set(modules.map((moduleNode) => moduleNode.id));
  const dependencies: DependencyEdge[] = [];
  const importsByModule = new Map<string, string[]>();
  const importedByModule = new Map<string, string[]>();
  let unresolvedImportCount = 0;
  let parsedImportStatementCount = 0;

  for (const record of importRecords) {
    for (const parsedImport of record.imports) {
      parsedImportStatementCount += 1;
      const resolved = resolveLocalImport(parsedImport, moduleIds, record.moduleId);
      if (!resolved || resolved === record.moduleId) {
        if (!resolved) {
          unresolvedImportCount += 1;
        }
        continue;
      }

      dependencies.push({
        from: record.moduleId,
        to: resolved,
        kind: inferDependencyKind(parsedImport.module),
        confidence: parsedImport.importedName ? "medium" : "high"
      });

      const imports = importsByModule.get(record.moduleId) ?? [];
      imports.push(resolved);
      importsByModule.set(record.moduleId, imports);

      const importedBy = importedByModule.get(resolved) ?? [];
      importedBy.push(record.moduleId);
      importedByModule.set(resolved, importedBy);
    }
  }

  const updatedModules = modules.map((moduleNode) => {
    const imports = unique(importsByModule.get(moduleNode.id) ?? []);
    const importedBy = unique(importedByModule.get(moduleNode.id) ?? []);
    return {
      ...moduleNode,
      imports,
      importedBy,
      isOrphan: !moduleNode.isEntryPoint && !moduleNode.isTest && importedBy.length === 0
    };
  });

  const uniqueDependencies = uniqueEdges(dependencies);

  return {
    modules: updatedModules,
    dependencies: uniqueDependencies,
    diagnostics: {
      parsedImportStatementCount,
      resolvedLocalEdgeCount: uniqueDependencies.length,
      unresolvedImportCount,
      topIncoming: topCounts(importedByModule),
      topOutgoing: topCounts(importsByModule)
    }
  };
}

function inferDependencyKind(importName: string): DependencyEdge["kind"] {
  if (/\b(config|settings|env)\b/i.test(importName)) {
    return "config";
  }
  if (/\b(test|tests)\b/i.test(importName)) {
    return "test";
  }
  if (/\b(launch|launcher|startup|main)\b/i.test(importName)) {
    return "entrypoint";
  }
  return "import";
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function uniqueEdges(edges: DependencyEdge[]): DependencyEdge[] {
  const seen = new Set<string>();
  const uniqueList: DependencyEdge[] = [];
  for (const edge of edges) {
    const key = `${edge.from}->${edge.to}:${edge.kind}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    uniqueList.push(edge);
  }
  return uniqueList;
}

function topCounts(valuesByModule: ReadonlyMap<string, string[]>): Array<{ moduleId: string; count: number }> {
  return [...valuesByModule.entries()]
    .map(([moduleId, values]) => ({
      moduleId,
      count: unique(values).length
    }))
    .sort((left, right) => right.count - left.count || left.moduleId.localeCompare(right.moduleId))
    .slice(0, 5);
}
