import { ModuleImportRecord } from "../graph/dependencyGraph";
import { ParsedImport } from "../graph/importParser";
import { ModuleNode } from "../webview/dashboardState";

export const FILE_ANALYSIS_CACHE_SCHEMA_VERSION = "file-analysis-cache:v1";

export interface FileAnalysisMetadata {
  workspaceKey: string;
  relativePath: string;
  mtimeMs: number;
  size: number;
  contentHash?: string;
}

export interface FileAnalysisValue {
  module: ModuleNode;
  imports: ParsedImport[];
  totalClasses: number;
  totalFunctions: number;
}

export interface FileAnalysisCacheStats {
  hitCount: number;
  missCount: number;
  invalidatedCount: number;
  deletedCount: number;
  entryCount: number;
}

interface FileAnalysisCacheEntry {
  schemaVersion: string;
  cacheKey: string;
  workspaceKey: string;
  relativePath: string;
  value: FileAnalysisValue;
}

export class FileAnalysisCache {
  private readonly entries = new Map<string, FileAnalysisCacheEntry>();
  private stats: Omit<FileAnalysisCacheStats, "entryCount"> = {
    hitCount: 0,
    missCount: 0,
    invalidatedCount: 0,
    deletedCount: 0
  };

  beginRun(): void {
    this.stats = {
      hitCount: 0,
      missCount: 0,
      invalidatedCount: 0,
      deletedCount: 0
    };
  }

  get(metadata: FileAnalysisMetadata): FileAnalysisValue | undefined {
    const entryId = getEntryId(metadata.workspaceKey, metadata.relativePath);
    const entry = this.entries.get(entryId);
    if (!entry) {
      this.stats.missCount += 1;
      return undefined;
    }
    if (entry.schemaVersion !== FILE_ANALYSIS_CACHE_SCHEMA_VERSION || entry.cacheKey !== getCacheKey(metadata)) {
      this.entries.delete(entryId);
      this.stats.invalidatedCount += 1;
      this.stats.missCount += 1;
      return undefined;
    }
    this.stats.hitCount += 1;
    return cloneValue(entry.value);
  }

  set(metadata: FileAnalysisMetadata, value: FileAnalysisValue): void {
    this.entries.set(getEntryId(metadata.workspaceKey, metadata.relativePath), {
      schemaVersion: FILE_ANALYSIS_CACHE_SCHEMA_VERSION,
      cacheKey: getCacheKey(metadata),
      workspaceKey: metadata.workspaceKey,
      relativePath: metadata.relativePath,
      value: cloneValue(value)
    });
  }

  delete(workspaceKey: string, relativePath: string): void {
    if (this.entries.delete(getEntryId(workspaceKey, relativePath))) {
      this.stats.deletedCount += 1;
    }
  }

  reconcileWorkspace(workspaceKey: string, existingRelativePaths: ReadonlySet<string>): void {
    for (const entry of [...this.entries.values()]) {
      if (entry.workspaceKey === workspaceKey && !existingRelativePaths.has(entry.relativePath)) {
        this.entries.delete(getEntryId(entry.workspaceKey, entry.relativePath));
        this.stats.deletedCount += 1;
      }
    }
  }

  clearWorkspace(workspaceKey: string): void {
    for (const entry of [...this.entries.values()]) {
      if (entry.workspaceKey === workspaceKey) {
        this.entries.delete(getEntryId(entry.workspaceKey, entry.relativePath));
        this.stats.deletedCount += 1;
      }
    }
  }

  snapshotStats(): FileAnalysisCacheStats {
    return {
      ...this.stats,
      entryCount: this.entries.size
    };
  }
}

export function toModuleImportRecord(value: FileAnalysisValue): ModuleImportRecord {
  return {
    moduleId: value.module.id,
    imports: value.imports
  };
}

function getEntryId(workspaceKey: string, relativePath: string): string {
  return `${workspaceKey}\0${relativePath}`;
}

function getCacheKey(metadata: FileAnalysisMetadata): string {
  return [
    FILE_ANALYSIS_CACHE_SCHEMA_VERSION,
    metadata.workspaceKey,
    metadata.relativePath,
    metadata.mtimeMs,
    metadata.size,
    metadata.contentHash ?? ""
  ].join("\0");
}

function cloneValue(value: FileAnalysisValue): FileAnalysisValue {
  return {
    module: {
      ...value.module,
      imports: [...value.module.imports],
      importedBy: [...value.module.importedBy]
    },
    imports: value.imports.map((parsedImport) => ({ ...parsedImport })),
    totalClasses: value.totalClasses,
    totalFunctions: value.totalFunctions
  };
}
