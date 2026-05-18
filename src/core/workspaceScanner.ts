import * as vscode from "vscode";
import { mapFeatureForPath } from "./featureMapper";
import { ModuleNode } from "../webview/dashboardState";
import { ModuleImportRecord } from "../graph/dependencyGraph";
import { parsePythonImports } from "../graph/importParser";

export interface WorkspaceScanConfig {
  excludeGlobs: string[];
  maxFilesToAnalyze: number;
}

export interface WorkspaceScanResult {
  modules: ModuleNode[];
  importRecords: ModuleImportRecord[];
  totalPythonFiles: number;
  totalClasses: number;
  totalFunctions: number;
  unreadableFiles: string[];
}

const WATCHED_SCAN_GLOBS = [
  "**/*.py",
  "**/*.yaml",
  "**/*.yml",
  "**/*.json",
  "**/*.toml",
  "**/*.md",
  "package.xml",
  "setup.py",
  "pyproject.toml"
] as const;

export async function scanWorkspace(
  folder: vscode.WorkspaceFolder,
  config: WorkspaceScanConfig
): Promise<WorkspaceScanResult> {
  const uris = await findWorkspaceFiles(folder, config);
  const modules: ModuleNode[] = [];
  const importRecords: ModuleImportRecord[] = [];
  const unreadableFiles: string[] = [];
  let totalClasses = 0;
  let totalFunctions = 0;

  for (const uri of uris) {
    const relativePath = normalizeRelativePath(folder.uri, uri);
    if (!relativePath.endsWith(".py")) {
      continue;
    }

    const moduleId = moduleIdFromPath(relativePath);
    let source = "";
    try {
      source = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString("utf8");
    } catch {
      unreadableFiles.push(relativePath);
    }

    const metrics = countPythonMetrics(source);
    totalClasses += metrics.classes;
    totalFunctions += metrics.functions;
    const feature = mapFeatureForPath(relativePath);

    modules.push({
      id: moduleId,
      name: moduleId.split("/").at(-1) ?? moduleId,
      path: relativePath,
      language: "python",
      packageName: moduleId.replaceAll("/", "."),
      featureId: feature.id,
      imports: [],
      importedBy: [],
      isEntryPoint: isLikelyEntryPoint(relativePath, source),
      isTest: isTestPath(relativePath),
      isOrphan: false,
      riskLevel: feature.defaultRisk
    });

    importRecords.push({
      moduleId,
      imports: parsePythonImports(source)
    });
  }

  return {
    modules,
    importRecords,
    totalPythonFiles: modules.length,
    totalClasses,
    totalFunctions,
    unreadableFiles
  };
}

export function moduleIdFromPath(relativePath: string): string {
  let normalized = relativePath.replaceAll("\\", "/").replace(/\.py$/i, "");
  normalized = normalized.replace(/^src\//, "");
  normalized = normalized.replace(/\/__init__$/i, "");
  return normalized;
}

export function normalizeRelativePath(rootUri: vscode.Uri, uri: vscode.Uri): string {
  const rootPath = rootUri.fsPath.replaceAll("\\", "/").replace(/\/+$/, "");
  const filePath = uri.fsPath.replaceAll("\\", "/");
  return filePath.startsWith(`${rootPath}/`) ? filePath.slice(rootPath.length + 1) : filePath;
}

async function findWorkspaceFiles(
  folder: vscode.WorkspaceFolder,
  config: WorkspaceScanConfig
): Promise<vscode.Uri[]> {
  const byPath = new Map<string, vscode.Uri>();
  const maxPerGlob = Math.max(config.maxFilesToAnalyze, 1);

  for (const glob of WATCHED_SCAN_GLOBS) {
    const found = await vscode.workspace.findFiles(
      new vscode.RelativePattern(folder, glob),
      buildExcludePattern(config.excludeGlobs),
      maxPerGlob
    );

    for (const uri of found) {
      const relativePath = normalizeRelativePath(folder.uri, uri);
      if (shouldExcludePath(relativePath, config.excludeGlobs)) {
        continue;
      }
      byPath.set(relativePath, uri);
      if (byPath.size >= config.maxFilesToAnalyze) {
        return [...byPath.values()];
      }
    }
  }

  return [...byPath.values()];
}

function buildExcludePattern(excludeGlobs: string[]): string | undefined {
  if (excludeGlobs.length === 0) {
    return undefined;
  }

  return excludeGlobs.length === 1 ? excludeGlobs[0] : `{${excludeGlobs.join(",")}}`;
}

function shouldExcludePath(relativePath: string, excludeGlobs: string[]): boolean {
  const normalized = relativePath.replaceAll("\\", "/").toLowerCase();
  return excludeGlobs.some((glob) => {
    const lowerGlob = glob.replaceAll("\\", "/").toLowerCase();
    const segmentMatch = /^\*\*\/([^/]+)\/\*\*$/.exec(lowerGlob);
    if (segmentMatch?.[1]) {
      return normalized.split("/").includes(segmentMatch[1]);
    }
    const suffixMatch = /^\*\*\/(.+)$/.exec(lowerGlob);
    if (suffixMatch?.[1]) {
      return normalized.endsWith(suffixMatch[1].replace("/**", ""));
    }
    return normalized.includes(lowerGlob.replaceAll("*", ""));
  });
}

function isLikelyEntryPoint(relativePath: string, source: string): boolean {
  const normalized = relativePath.toLowerCase();
  return /\b(main|launcher|launch|startup|setup)\.py$/.test(normalized)
    || normalized.includes("/launch/")
    || source.includes("if __name__ == \"__main__\"")
    || source.includes("if __name__ == '__main__'");
}

function isTestPath(relativePath: string): boolean {
  const normalized = relativePath.toLowerCase();
  return normalized.startsWith("tests/")
    || normalized.includes("/tests/")
    || normalized.split("/").some((segment) => segment.startsWith("test_") || segment.endsWith("_test.py"));
}

function countPythonMetrics(source: string): { classes: number; functions: number } {
  if (!source) {
    return {
      classes: 0,
      functions: 0
    };
  }

  const classes = source.match(/^\s*class\s+[A-Za-z_]\w*/gm)?.length ?? 0;
  const functions = source.match(/^\s*(async\s+def|def)\s+[A-Za-z_]\w*/gm)?.length ?? 0;
  return {
    classes,
    functions
  };
}
