export type RiskLevel = "low" | "medium" | "high";

export type ClassificationReasonCategory =
  | "path-pattern-match"
  | "import-neighbor-inference"
  | "no-path-pattern-match"
  | "no-strong-import-neighbor-inference"
  | "ambiguous-match";

export interface ClassificationReason {
  category: ClassificationReasonCategory;
  detail: string;
  confidence: "low" | "medium" | "high";
}

export type DashboardMode =
  | "liveChanges"
  | "wholeArchitecture"
  | "featureFocus"
  | "diffSinceBaseline";

export interface WorkspaceSummary {
  name: string;
  rootUri: string;
  isDirty: boolean;
  lastUpdatedIso: string;
  autoRefresh: boolean;
}

export interface GitSummary {
  branch: string;
  changedFileCount: number;
  ahead: number;
  behind: number;
}

export type GitStatusSource = "VS Code Git API" | "unavailable";

export type ScannerStatus =
  | "vscodeFindFiles"
  | "unavailable"
  | "error";

export interface AnalysisTimingEntry {
  phase: string;
  durationMs: number;
}

export interface FileAnalysisCacheSummary {
  hitCount: number;
  missCount: number;
  invalidatedCount: number;
  deletedCount: number;
  entryCount: number;
}

export interface WorkspaceDiagnostics {
  rootUri: string;
  workspaceFsPath?: string;
  pathKind: "linux-native" | "unc-wsl" | "unc" | "windows-local" | "unknown";
  stateSource: "real" | "mock" | "unavailable";
  fallbackReason?: string;
  pythonFileCount: number;
  moduleCount: number;
  dependencyCount: number;
  graphNodeCount: number;
  graphEdgeCount: number;
  unmappedModuleCount: number;
  unclassifiedModulePaths: string[];
  unclassifiedReasonCounts: Array<{ reason: ClassificationReasonCategory; count: number }>;
  testModuleCount: number;
  runtimeModuleCount: number;
  parsedImportStatementCount: number;
  resolvedLocalEdgeCount: number;
  unresolvedImportCount: number;
  changedFileCount: number;
  gitBranch: string;
  gitStatusSource: GitStatusSource;
  scannerStatus: ScannerStatus;
  discoveredFileCount: number;
  analysisTimings: AnalysisTimingEntry[];
  cache: FileAnalysisCacheSummary;
  incremental: boolean;
  changedPathCount: number;
  workspaceIndexReason: string;
  lastUpdatedIso: string;
  baselineCapturedAtIso?: string;
}

export interface WorkspaceSnapshot {
  workspaceKey: string;
  workspaceName: string;
  rootUri: string;
  capturedAtIso: string;
  git?: GitSummary;
  modules: ModuleNode[];
  dependencies: DependencyEdge[];
  featureBlocks: FeatureBlock[];
  changedFiles: ChangedFile[];
  impactedFeatures: ImpactedFeature[];
  risks: RiskItem[];
  health: ArchitectureHealth;
  validations: ValidationStatus[];
}

export interface ModuleNode {
  id: string;
  name: string;
  path: string;
  language: "python" | "typescript" | "json" | "markdown" | "other";
  packageName?: string;
  featureId?: string;
  classificationReason?: ClassificationReason;
  imports: string[];
  importedBy: string[];
  isEntryPoint: boolean;
  isTest: boolean;
  isOrphan: boolean;
  riskLevel: RiskLevel;
}

export interface DependencyEdge {
  from: string;
  to: string;
  kind: "import" | "config" | "test" | "entrypoint" | "unknown";
  confidence: "low" | "medium" | "high";
}

export interface FeatureBlock {
  id: string;
  label: string;
  description: string;
  pathPatterns: string[];
  moduleIds: string[];
  incomingEdges: number;
  outgoingEdges: number;
  changedFileCount: number;
  riskLevel: RiskLevel;
}

export interface ChangedFile {
  path: string;
  status: "modified" | "added" | "deleted" | "renamed" | "untracked" | "unknown";
  featureId?: string;
  moduleId?: string;
  riskLevel: RiskLevel;
  reason: string;
  lastChangedIso?: string;
}

export interface ImpactedFeature {
  featureId: string;
  label: string;
  moduleCount: number;
  changedFileCount: number;
  riskLevel: RiskLevel;
  reason: string;
}

export interface RiskItem {
  id: string;
  label: string;
  level: RiskLevel;
  count: number;
  detail: string;
}

export interface ArchitectureHealth {
  totalPythonFiles: number;
  totalModules: number;
  totalClasses: number;
  totalFunctions: number;
  circularDependencyCount: number;
  highRiskModuleCount: number;
  orphanModuleCount: number;
  estimatedTestCoverage: number;
}

export interface BaselineDiff {
  baselineCapturedAtIso: string;
  currentCapturedAtIso: string;
  addedModules: ModuleNode[];
  removedModules: ModuleNode[];
  changedModules: ModuleNode[];
  addedEdges: DependencyEdge[];
  removedEdges: DependencyEdge[];
  changedFeatures: FeatureBlock[];
  riskChanges: RiskItem[];
}

export interface ValidationStatus {
  id: string;
  label: string;
  state: "passed" | "running" | "failed" | "unknown" | "notRun";
  detail: string;
  durationMs?: number;
}

export interface DashboardState {
  mode: DashboardMode;
  workspace: WorkspaceSummary;
  snapshot: WorkspaceSnapshot;
  selectedFeatureId?: string;
  baselineDiff?: BaselineDiff;
  diagnostics: WorkspaceDiagnostics;
  isMockData: boolean;
  isLoading: boolean;
  error?: string;
}

export const dashboardModes: DashboardMode[] = [
  "liveChanges",
  "wholeArchitecture",
  "featureFocus",
  "diffSinceBaseline"
];

export function isDashboardMode(value: unknown): value is DashboardMode {
  return typeof value === "string" && dashboardModes.includes(value as DashboardMode);
}

export function getModeLabel(mode: DashboardMode): string {
  switch (mode) {
    case "liveChanges":
      return "Live Changes";
    case "wholeArchitecture":
      return "Whole Architecture";
    case "featureFocus":
      return "Feature Focus";
    case "diffSinceBaseline":
      return "Diff Since Baseline";
  }
}
