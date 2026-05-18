import * as vscode from "vscode";
import { mapFeatureForPath } from "./featureMapper";
import { ModuleNode } from "../webview/dashboardState";
import { ModuleImportRecord } from "../graph/dependencyGraph";
import { parsePythonImports } from "../graph/importParser";
import { logInfo } from "./outputChannel";
import {
  DirectoryEntryLike,
  isWatchedScanPath,
  scanReadDirectoryTree,
  shouldExcludePath
} from "./readDirectoryFallbackScanner";

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
  discoveredFileCount: number;
  scannerStatus: "findFiles" | "readDirectory fallback";
  fallbackReason?: string;
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
  const foundFiles = await findWorkspaceFiles(folder, config);
  const uris = foundFiles.uris;
  const modules: ModuleNode[] = [];
  const importRecords: ModuleImportRecord[] = [];
  const unreadableFiles: string[] = [...foundFiles.unreadableFiles];
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

  const result = {
    modules,
    importRecords,
    totalPythonFiles: modules.length,
    totalClasses,
    totalFunctions,
    unreadableFiles,
    discoveredFileCount: uris.length,
    scannerStatus: foundFiles.scannerStatus,
    fallbackReason: foundFiles.fallbackReason
  };
  logInfo(
    `scan end: discoveredFiles=${result.discoveredFileCount}, pythonModules=${result.modules.length}, scannerStatus=${result.scannerStatus}${result.fallbackReason ? `, fallbackReason=${result.fallbackReason}` : ""}`
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
  scannerStatus: "findFiles" | "readDirectory fallback";
  fallbackReason?: string;
  unreadableFiles: string[];
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
          scannerStatus: "findFiles",
          unreadableFiles: []
        };
      }
    }
  }

  const findFilesUris = [...byPath.values()];
  const pythonFileCount = findFilesUris.filter((uri) => normalizeRelativePath(folder.uri, uri).endsWith(".py")).length;
  if (pythonFileCount > 0) {
    return {
      uris: findFilesUris,
      scannerStatus: "findFiles",
      unreadableFiles: []
    };
  }

  const fallbackReason = "vscode.workspace.findFiles returned zero Python files; using readDirectory recursion.";
  logInfo(`scanner fallback: ${fallbackReason}`);
  const fallback = await scanReadDirectoryTree(folder.uri, config, {
    readDirectory: async (location) => {
      const entries = await vscode.workspace.fs.readDirectory(location);
      return entries.map(([name, fileType]): DirectoryEntryLike => ({
        name,
        kind: mapFileType(fileType)
      }));
    },
    joinPath: (location, segment) => vscode.Uri.joinPath(location, segment),
    relativePath: (root, location) => normalizeRelativePath(root, location)
  });

  const merged = new Map(byPath);
  for (const uri of fallback.files) {
    const relativePath = normalizeRelativePath(folder.uri, uri);
    if (!isWatchedScanPath(relativePath) || shouldExcludePath(relativePath, config.excludeGlobs)) {
      continue;
    }
    merged.set(relativePath, uri);
    if (merged.size >= config.maxFilesToAnalyze) {
      break;
    }
  }

  return {
    uris: [...merged.values()],
    scannerStatus: "readDirectory fallback",
    fallbackReason,
    unreadableFiles: fallback.unreadablePaths
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

function mapFileType(fileType: vscode.FileType): DirectoryEntryLike["kind"] {
  if ((fileType & vscode.FileType.Directory) === vscode.FileType.Directory) {
    return "directory";
  }
  if ((fileType & vscode.FileType.File) === vscode.FileType.File) {
    return "file";
  }
  return "other";
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
