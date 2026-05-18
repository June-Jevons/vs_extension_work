import {
  BaselineDiff,
  ChangedFile,
  FeatureBlock,
  ImpactedFeature,
  RiskLevel,
  ValidationStatus,
  WorkspaceSnapshot
} from "../core/architectureModel";

export type DashboardMode =
  | "liveChanges"
  | "wholeArchitecture"
  | "featureFocus"
  | "diffSinceBaseline";

export interface WorkspaceSummary {
  name: string;
  rootUri: string;
  lastUpdatedLabel: string;
  autoRefresh: boolean;
  statusLabel: string;
}

export interface GraphNode {
  id: string;
  label: string;
  subtitle?: string;
  detailLines?: string[];
  x: number;
  y: number;
  width: number;
  height: number;
  riskLevel?: RiskLevel;
  changed?: boolean;
  muted?: boolean;
}

export interface GraphEdge {
  from: string;
  to: string;
  label?: string;
  kind?: "solid" | "dashed" | "added" | "removed";
}

export interface GraphModel {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width: number;
  height: number;
}

export interface MetricCard {
  label: string;
  value: string;
  tone?: RiskLevel | "info";
  detail?: string;
}

export interface HealthCard {
  label: string;
  value: string;
  tone: RiskLevel | "info";
  detail: string;
}

export interface FeatureDetail {
  selectedFeatureId: string;
  relatedModuleIds: string[];
  relatedExternalFeatures: string[];
  relatedTests: ChangedFile[];
}

export interface TimelinePoint {
  label: string;
  modules: number;
  dependencies: number;
  tests: number;
}

export interface DiffChangeRow {
  path: string;
  status: string;
  dependencyDelta: string;
}

export interface DashboardUiState {
  modeLabels: Record<DashboardMode, string>;
  currentChangePath: string[];
  liveImpactGraph: GraphModel;
  dependencyGraph: GraphModel;
  wholeArchitectureGraph: GraphModel;
  featureInternalGraph: GraphModel;
  baselineBeforeGraph: GraphModel;
  baselineAfterGraph: GraphModel;
  overviewCards: MetricCard[];
  healthCards: HealthCard[];
  diffSummaryCards: MetricCard[];
  featureDetail: FeatureDetail;
  suggestedTests: ChangedFile[];
  timeline: TimelinePoint[];
  topChanges: DiffChangeRow[];
  changedFiles: ChangedFile[];
  impactedFeatures: ImpactedFeature[];
  featureBlocks: FeatureBlock[];
}

export interface DashboardState {
  mode: DashboardMode;
  workspace: WorkspaceSummary;
  snapshot: WorkspaceSnapshot;
  selectedFeatureId?: string;
  baselineDiff?: BaselineDiff;
  isMockData: boolean;
  isLoading: boolean;
  error?: string;
  ui: DashboardUiState;
}

export const dashboardModes: DashboardMode[] = [
  "liveChanges",
  "wholeArchitecture",
  "featureFocus",
  "diffSinceBaseline"
];

export function isDashboardMode(value: unknown): value is DashboardMode {
  return typeof value === "string" && (dashboardModes as string[]).includes(value);
}
