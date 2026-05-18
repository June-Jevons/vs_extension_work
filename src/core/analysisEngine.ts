import * as vscode from "vscode";
import { createMockDashboardState } from "../mockData/mockDashboardState";
import { getGitStatus } from "../git/gitProvider";
import { buildDependencyGraph } from "../graph/dependencyGraph";
import { buildGraphDiff } from "../graph/graphDiff";
import { BaselineStore } from "../storage/baselineStore";
import { SnapshotStore } from "../storage/snapshotStore";
import { createWorkspaceKey } from "../storage/workspaceKey";
import {
  ChangedFile,
  DashboardMode,
  DashboardState,
  FeatureBlock,
  ImpactedFeature,
  ModuleNode,
  RiskLevel,
  ValidationStatus,
  WorkspaceSnapshot
} from "../webview/dashboardState";
import { buildFeatureBlocks, getFeatureDefinition, inferFeatureFromImports, mapFeatureForPath } from "./featureMapper";
import { buildRiskSummary, scoreChangedFileWithReason, scoreModuleRisk } from "./riskScorer";
import { scanWorkspace } from "./workspaceScanner";

export class LiveArchitectureStateManager implements vscode.Disposable {
  private readonly changeEmitter = new vscode.EventEmitter<DashboardState>();
  readonly onDidChangeState = this.changeEmitter.event;

  private state = createMockDashboardState();
  private refreshing: Promise<DashboardState> | undefined;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly snapshotStore: SnapshotStore,
    private readonly baselineStore: BaselineStore
  ) {}

  getState(): DashboardState {
    return this.state;
  }

  async refresh(requestedMode?: DashboardMode, selectedFeatureId?: string): Promise<DashboardState> {
    if (this.refreshing) {
      return this.refreshing;
    }

    this.refreshing = this.buildState(requestedMode, selectedFeatureId)
      .then((state) => {
        this.state = state;
        this.changeEmitter.fire(state);
        return state;
      })
      .finally(() => {
        this.refreshing = undefined;
      });

    return this.refreshing;
  }

  setMode(mode: DashboardMode, selectedFeatureId?: string): DashboardState {
    const current = this.state.isMockData
      ? createMockDashboardState(mode, selectedFeatureId ?? this.state.selectedFeatureId)
      : {
        ...this.state,
        mode,
        selectedFeatureId: selectedFeatureId ?? this.state.selectedFeatureId
      };
    this.state = current;
    this.changeEmitter.fire(current);
    return current;
  }

  async captureBaseline(): Promise<{ captured: boolean; baselineId?: string; wroteWorkspaceFiles: false }> {
    if (this.state.isMockData) {
      this.setMode("diffSinceBaseline");
      return {
        captured: false,
        wroteWorkspaceFiles: false
      };
    }

    const baseline = await this.baselineStore.saveBaseline(this.state.snapshot.workspaceKey, this.state.snapshot);
    this.state = {
      ...this.state,
      mode: "diffSinceBaseline",
      baselineDiff: buildGraphDiff(baseline.snapshot, this.state.snapshot)
    };
    this.changeEmitter.fire(this.state);

    return {
      captured: true,
      baselineId: baseline.id,
      wroteWorkspaceFiles: false
    };
  }

  async clearWorkspaceCache(): Promise<{ cleared: boolean; wroteWorkspaceFiles: false }> {
    if (this.state.isMockData) {
      this.state = createMockDashboardState(this.state.mode, this.state.selectedFeatureId);
      this.changeEmitter.fire(this.state);
      return {
        cleared: false,
        wroteWorkspaceFiles: false
      };
    }

    await this.snapshotStore.clearSnapshot(this.state.snapshot.workspaceKey);
    await this.baselineStore.clearBaseline(this.state.snapshot.workspaceKey);
    await this.refresh(this.state.mode, this.state.selectedFeatureId);

    return {
      cleared: true,
      wroteWorkspaceFiles: false
    };
  }

  dispose(): void {
    this.changeEmitter.dispose();
  }

  private async buildState(requestedMode?: DashboardMode, selectedFeatureId?: string): Promise<DashboardState> {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      return createMockDashboardState(requestedMode ?? this.state.mode, selectedFeatureId ?? this.state.selectedFeatureId);
    }

    const configuration = vscode.workspace.getConfiguration("liveArchitectureMap");
    const maxFilesToAnalyze = configuration.get<number>("maxFilesToAnalyze", 2000);
    const excludeGlobs = configuration.get<string[]>("excludeGlobs", []);
    const autoWatch = configuration.get<boolean>("autoWatch", true);
    const workspaceKey = createWorkspaceKey({
      name: folder.name,
      rootUri: folder.uri.toString()
    });

    const scan = await scanWorkspace(folder, {
      excludeGlobs,
      maxFilesToAnalyze
    });

    if (scan.modules.length === 0) {
      return createMockDashboardState(requestedMode ?? this.state.mode, selectedFeatureId ?? this.state.selectedFeatureId);
    }

    const graph = buildDependencyGraph(scan.modules, scan.importRecords);
    const modulesWithFeatures = applyFeatureInference(graph.modules, graph.dependencies);
    const modules = modulesWithFeatures.map((moduleNode) => {
      const risk = scoreModuleRisk(moduleNode.path, moduleNode.importedBy.length);
      return {
        ...moduleNode,
        riskLevel: risk.level
      };
    });
    const gitStatus = await getGitStatus(folder);
    const changedFiles = buildChangedFiles(gitStatus.changedFiles, modules);
    const dirty = changedFiles.length > 0;
    const featureBlocks = applyChangedFileCounts(buildFeatureBlocks(modules, graph.dependencies), changedFiles);
    const impactedFeatures = buildImpactedFeatures(featureBlocks, modules, changedFiles);
    const mode = requestedMode ?? getDefaultMode(configuration, dirty);
    const selected = selectedFeatureId ?? this.state.selectedFeatureId ?? impactedFeatures[0]?.featureId ?? featureBlocks[0]?.id;

    const snapshot: WorkspaceSnapshot = {
      workspaceKey,
      workspaceName: folder.name,
      rootUri: folder.uri.toString(),
      capturedAtIso: new Date().toISOString(),
      git: gitStatus.summary
        ? {
          ...gitStatus.summary,
          changedFileCount: changedFiles.length
        }
        : undefined,
      modules,
      dependencies: graph.dependencies,
      featureBlocks,
      changedFiles,
      impactedFeatures,
      risks: buildRiskSummary(changedFiles),
      health: {
        totalPythonFiles: scan.totalPythonFiles,
        totalModules: modules.length,
        totalClasses: scan.totalClasses,
        totalFunctions: scan.totalFunctions,
        circularDependencyCount: countMutualDependencies(graph.dependencies),
        highRiskModuleCount: modules.filter((moduleNode) => moduleNode.riskLevel === "high").length,
        orphanModuleCount: modules.filter((moduleNode) => moduleNode.isOrphan).length,
        estimatedTestCoverage: estimateCoverage(modules)
      },
      validations: buildValidationStatuses(scan.unreadableFiles)
    };

    await this.snapshotStore.saveSnapshot(snapshot);
    const baseline = this.baselineStore.getBaseline(workspaceKey);

    return {
      mode,
      workspace: {
        name: folder.name,
        rootUri: folder.uri.toString(),
        isDirty: dirty,
        lastUpdatedIso: snapshot.capturedAtIso,
        autoRefresh: autoWatch
      },
      snapshot,
      selectedFeatureId: selected,
      baselineDiff: baseline ? buildGraphDiff(baseline.snapshot, snapshot) : undefined,
      isMockData: false,
      isLoading: false
    };
  }
}

function applyFeatureInference(modules: ModuleNode[], dependencies: readonly { from: string; to: string }[]): ModuleNode[] {
  const modulesById = new Map(modules.map((moduleNode) => [moduleNode.id, moduleNode]));
  const linkedModules = modules.map((moduleNode) => ({
    ...moduleNode,
    imports: dependencies.filter((edge) => edge.from === moduleNode.id).map((edge) => edge.to),
    importedBy: dependencies.filter((edge) => edge.to === moduleNode.id).map((edge) => edge.from)
  }));
  const linkedById = new Map(linkedModules.map((moduleNode) => [moduleNode.id, moduleNode]));

  return linkedModules.map((moduleNode) => {
    const inferred = inferFeatureFromImports(moduleNode, linkedById);
    const original = modulesById.get(moduleNode.id);
    return {
      ...moduleNode,
      featureId: original?.featureId === "unmapped-unknown" ? inferred.id : original?.featureId ?? inferred.id
    };
  });
}

function buildChangedFiles(
  gitFiles: Array<Pick<ChangedFile, "path" | "status">>,
  modules: ModuleNode[]
): ChangedFile[] {
  const modulesByPath = new Map(modules.map((moduleNode) => [moduleNode.path, moduleNode]));
  return gitFiles.map((gitFile) => {
    const normalizedPath = gitFile.path.replaceAll("\\", "/");
    const moduleNode = modulesByPath.get(normalizedPath);
    const feature = moduleNode?.featureId ? getFeatureDefinition(moduleNode.featureId) : mapFeatureForPath(normalizedPath);
    const risk = scoreChangedFileWithReason(normalizedPath, moduleNode);

    return {
      path: normalizedPath,
      status: gitFile.status,
      featureId: feature.id,
      moduleId: moduleNode?.id,
      riskLevel: risk.level,
      reason: risk.reason,
      lastChangedIso: new Date().toISOString()
    };
  });
}

function applyChangedFileCounts(featureBlocks: FeatureBlock[], changedFiles: ChangedFile[]): FeatureBlock[] {
  return featureBlocks.map((feature) => {
    const featureChanges = changedFiles.filter((file) => file.featureId === feature.id);
    return {
      ...feature,
      changedFileCount: featureChanges.length,
      riskLevel: highestRisk(feature.riskLevel, featureChanges.map((file) => file.riskLevel))
    };
  });
}

function buildImpactedFeatures(
  featureBlocks: FeatureBlock[],
  modules: ModuleNode[],
  changedFiles: ChangedFile[]
): ImpactedFeature[] {
  const changedFeatureIds = new Set(changedFiles.map((file) => file.featureId).filter((featureId): featureId is string => Boolean(featureId)));
  const impactedFeatureIds = new Set(changedFeatureIds);
  const modulesById = new Map(modules.map((moduleNode) => [moduleNode.id, moduleNode]));

  for (const file of changedFiles) {
    const moduleNode = file.moduleId ? modulesById.get(file.moduleId) : undefined;
    if (!moduleNode) {
      continue;
    }
    for (const linkedModuleId of [...moduleNode.imports, ...moduleNode.importedBy]) {
      const linkedModule = modulesById.get(linkedModuleId);
      if (linkedModule?.featureId) {
        impactedFeatureIds.add(linkedModule.featureId);
      }
    }
  }

  return featureBlocks
    .filter((feature) => impactedFeatureIds.has(feature.id))
    .map((feature) => ({
      featureId: feature.id,
      label: feature.label,
      moduleCount: feature.moduleIds.length,
      changedFileCount: changedFiles.filter((file) => file.featureId === feature.id).length,
      riskLevel: feature.riskLevel,
      reason: changedFeatureIds.has(feature.id)
        ? "Feature contains changed files."
        : "Feature is connected to a changed module through imports."
    }));
}

function buildValidationStatuses(unreadableFiles: string[]): ValidationStatus[] {
  return [
    {
      id: "syntax",
      label: "Python Syntax Check",
      state: "notRun",
      detail: "Phase 8 uses textual parsing only; Python code is not executed."
    },
    {
      id: "compile",
      label: "Compile Check",
      state: "unknown",
      detail: "Workspace compile checks are not executed by the scanner."
    },
    {
      id: "changed-tests",
      label: "Unit Tests (Changed)",
      state: "notRun",
      detail: "Test execution is intentionally not wired in Phase 10."
    },
    {
      id: "full-tests",
      label: "Full Test Suite",
      state: "notRun",
      detail: "Full tests are not executed by the extension."
    },
    {
      id: "config-scanner",
      label: "Config Scanner",
      state: unreadableFiles.length > 0 ? "unknown" : "passed",
      detail: unreadableFiles.length > 0
        ? `${unreadableFiles.length} files could not be read.`
        : "Read-only scanner completed without file read errors."
    },
    {
      id: "style-checks",
      label: "Code Style (ruff)",
      state: "notRun",
      detail: "Style checks are not executed by the extension."
    }
  ];
}

function getDefaultMode(configuration: vscode.WorkspaceConfiguration, dirty: boolean): DashboardMode {
  const key = dirty ? "defaultModeWhenDirty" : "defaultModeWhenClean";
  const fallback: DashboardMode = dirty ? "liveChanges" : "wholeArchitecture";
  const configured = configuration.get<string>(key, fallback);
  return configured === "liveChanges" || configured === "wholeArchitecture" ? configured : fallback;
}

function countMutualDependencies(dependencies: readonly { from: string; to: string }[]): number {
  const keys = new Set(dependencies.map((edge) => `${edge.from}->${edge.to}`));
  let count = 0;
  for (const edge of dependencies) {
    if (keys.has(`${edge.to}->${edge.from}`)) {
      count += 1;
    }
  }
  return Math.floor(count / 2);
}

function estimateCoverage(modules: ModuleNode[]): number {
  const testCount = modules.filter((moduleNode) => moduleNode.isTest).length;
  const runtimeCount = Math.max(modules.length - testCount, 1);
  return Math.min(95, Math.round((testCount / runtimeCount) * 100));
}

function highestRisk(current: RiskLevel, risks: RiskLevel[]): RiskLevel {
  if (risks.includes("high") || current === "high") {
    return "high";
  }
  if (risks.includes("medium") || current === "medium") {
    return "medium";
  }
  return "low";
}
