import * as vscode from "vscode";
import { classifyFeatureForPath, getFeatureDefinition, isTestPath } from "./featureMapper";
import { FileAnalysisCache, FileAnalysisCacheStats, FileAnalysisValue, toModuleImportRecord } from "./fileAnalysisCache";
import { AnalysisTimingRecorder } from "./analysisTiming";
import { ModuleNode, ScannerStatus } from "../webview/dashboardState";
import { ModuleImportRecord } from "../graph/dependencyGraph";
import { parsePythonImports } from "../graph/importParser";
import { logInfo } from "./outputChannel";
import { shouldExcludePath } from "./scanPathFilter";
import { ScannerBackendSelection, selectScannerBackend } from "./scannerBackendSelection";
import { describePathKind } from "./pathKind";

export interface WorkspaceScanConfig {
  excludeGlobs: string[];
  maxFilesToAnalyze: number;
  workspaceKey: string;
  fileCache?: FileAnalysisCache;
  timing?: AnalysisTimingRecorder;
  changedPaths?: readonly string[];
}

export interface WorkspaceScanResult {
  modules: ModuleNode[];
  importRecords: ModuleImportRecord[];
  totalPythonFiles: number;
  totalClasses: number;
  totalFunctions: number;
  unreadableFiles: string[];
  discoveredFileCount: number;
  scannerStatus: ScannerStatus;
  scannerBackend: ScannerBackendSelection;
  cache: FileAnalysisCacheStats;
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
  logInfo(`scan start: workspace=${folder.uri.toString()}`);
  const scannerBackend = selectScannerBackend(describePathKind(folder.uri.fsPath));
  logInfo(`scanner backend selected=${scannerBackend.backend}, reason=${scannerBackend.reason}`);
  config.fileCache?.beginRun();
  const foundFiles = await (config.timing?.measure("scanner/index discovery", () => findWorkspaceFiles(folder, config))
    ?? findWorkspaceFiles(folder, config));
  const uris = foundFiles.uris;
  const modules: ModuleNode[] = [];
  const importRecords: ModuleImportRecord[] = [];
  const unreadableFiles: string[] = [];
  let totalClasses = 0;
  let totalFunctions = 0;
  const currentPythonPaths = new Set<string>();

  for (const uri of uris) {
    const relativePath = normalizeRelativePath(folder.uri, uri);
    if (!relativePath.endsWith(".py")) {
      continue;
    }
    if (isTestPath(relativePath)) {
      continue;
    }
    currentPythonPaths.add(relativePath);

    const stat = await (config.timing?.measure("file stat/hash", () => Promise.resolve(vscode.workspace.fs.stat(uri)))
      ?? vscode.workspace.fs.stat(uri));
    const metadata = {
      workspaceKey: config.workspaceKey,
      relativePath,
      mtimeMs: stat.mtime,
      size: stat.size
    };
    const cached = config.timing?.measureSync("cache read", () => config.fileCache?.get(metadata))
      ?? config.fileCache?.get(metadata);
    if (cached) {
      modules.push(cached.module);
      importRecords.push(toModuleImportRecord(cached));
      totalClasses += cached.totalClasses;
      totalFunctions += cached.totalFunctions;
      continue;
    }

    let source: string;
    try {
      const buffer = await (config.timing?.measure("file read", () => Promise.resolve(vscode.workspace.fs.readFile(uri)))
        ?? vscode.workspace.fs.readFile(uri));
      source = Buffer.from(buffer).toString("utf8");
    } catch {
      unreadableFiles.push(relativePath);
      source = "";
    }

    const analysis = config.timing?.measureSync("parse imports/metrics", () => analyzePythonFile(relativePath, source))
      ?? analyzePythonFile(relativePath, source);
    config.timing?.measureSync("cache write", () => config.fileCache?.set(metadata, analysis));
    if (!config.timing) {
      config.fileCache?.set(metadata, analysis);
    }

    modules.push(analysis.module);
    importRecords.push(toModuleImportRecord(analysis));
    totalClasses += analysis.totalClasses;
    totalFunctions += analysis.totalFunctions;
  }
  config.fileCache?.reconcileWorkspace(config.workspaceKey, currentPythonPaths);

  const result = {
    modules,
    importRecords,
    totalPythonFiles: modules.length,
    totalClasses,
    totalFunctions,
    unreadableFiles,
    discoveredFileCount: uris.length,
    scannerStatus: foundFiles.scannerStatus,
    scannerBackend,
    cache: config.fileCache?.snapshotStats() ?? {
      hitCount: 0,
      missCount: 0,
      invalidatedCount: 0,
      deletedCount: 0,
      entryCount: 0
    }
  };
  logInfo(
    `scan end: discoveredFiles=${result.discoveredFileCount}, pythonModules=${result.modules.length}, scannerStatus=${result.scannerStatus}, cacheHits=${result.cache.hitCount}, cacheMisses=${result.cache.missCount}, cacheEntries=${result.cache.entryCount}`
  );
  return result;
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
): Promise<{
  uris: vscode.Uri[];
  scannerStatus: ScannerStatus;
}> {
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
        return {
          uris: [...byPath.values()],
          scannerStatus: "vscodeFindFiles"
        };
      }
    }
  }

  return {
    uris: [...byPath.values()],
    scannerStatus: "vscodeFindFiles"
  };
}

function buildExcludePattern(excludeGlobs: string[]): string | undefined {
  if (excludeGlobs.length === 0) {
    return undefined;
  }

  return excludeGlobs.length === 1 ? excludeGlobs[0] : `{${excludeGlobs.join(",")}}`;
}

function isLikelyEntryPoint(relativePath: string, source: string): boolean {
  const normalized = relativePath.toLowerCase();
  return /\b(main|launcher|launch|startup|setup)\.py$/.test(normalized)
    || normalized.includes("/launch/")
    || source.includes("if __name__ == \"__main__\"")
    || source.includes("if __name__ == '__main__'");
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

function analyzePythonFile(relativePath: string, source: string): FileAnalysisValue {
  const moduleId = moduleIdFromPath(relativePath);
  const metrics = countPythonMetrics(source);
  const isTest = isTestPath(relativePath);
  const classification = isTest
    ? {
      feature: getFeatureDefinition("tests"),
      reason: {
        category: "path-pattern-match" as const,
        detail: "Path is under tests or follows test naming.",
        confidence: "high" as const
      }
    }
    : classifyFeatureForPath(relativePath);
  const feature = classification.feature;

  return {
    module: {
      id: moduleId,
      name: moduleId.split("/").at(-1) ?? moduleId,
      path: relativePath,
      language: "python",
      packageName: moduleId.replaceAll("/", "."),
      featureId: feature.id,
      classificationReason: classification.reason,
      imports: [],
      importedBy: [],
      isEntryPoint: isLikelyEntryPoint(relativePath, source),
      isTest,
      isOrphan: false,
      riskLevel: feature.defaultRisk
    },
    imports: parsePythonImports(source),
    totalClasses: metrics.classes,
    totalFunctions: metrics.functions
  };
}
