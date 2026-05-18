export type RiskLevel = "low" | "medium" | "high";
export type FileStatus = "modified" | "added" | "deleted" | "renamed" | "untracked" | "unknown";
export type ValidationState = "passed" | "running" | "failed" | "unknown" | "notRun";

export interface GitSummary {
  branch?: string;
  commit?: string;
  hasChanges: boolean;
}

export interface ModuleNode {
  id: string;
  name: string;
  path: string;
  language: "python" | "typescript" | "json" | "markdown" | "other";
  packageName?: string;
  featureId?: string;
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
  status: FileStatus;
  featureId?: string;
  moduleId?: string;
  riskLevel: RiskLevel;
  reason: string;
  lastChangedIso?: string;
}

export interface ImpactedFeature {
  featureId: string;
  label: string;
  riskLevel: RiskLevel;
  reason: string;
  changedFileCount: number;
  impactedModuleCount: number;
}

export interface RiskItem {
  id: string;
  label: string;
  level: RiskLevel;
  reason: string;
}

export interface ArchitectureHealth {
  circularDependencyCount: number;
  highRiskModuleCount: number;
  orphanModuleCount: number;
  estimatedCoveragePercent: number;
}

export interface ValidationStatus {
  id: string;
  label: string;
  state: ValidationState;
  detail: string;
  durationMs?: number;
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
