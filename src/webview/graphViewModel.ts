import {
  DashboardState,
  DependencyEdge,
  FeatureBlock,
  ModuleNode,
  RiskLevel
} from "./dashboardState";

export type GraphViewTarget =
  | "liveImpact"
  | "liveDependency"
  | "wholeArchitecture"
  | "featureInternal"
  | "baselineDiff";

export type GraphNodeKind = "feature" | "module" | "summary";

export interface GraphViewModel {
  id: string;
  title: string;
  description: string;
  target: GraphViewTarget;
  nodes: GraphViewNode[];
  edges: GraphViewEdge[];
}

export interface GraphViewNode {
  id: string;
  label: string;
  detail: string;
  kind: GraphNodeKind;
  width: number;
  height: number;
  riskLevel?: RiskLevel;
  moduleCount?: number;
  changedFileCount?: number;
  x?: number;
  y?: number;
}

export interface GraphViewEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  kind: DependencyEdge["kind"] | "feature" | "diff";
}

export function buildGraphViewForTarget(
  state: DashboardState,
  target: GraphViewTarget,
  selectedFeatureId = state.selectedFeatureId
): GraphViewModel {
  switch (target) {
    case "liveImpact":
      return buildLiveImpactGraph(state);
    case "liveDependency":
      return buildLiveDependencyGraph(state);
    case "wholeArchitecture":
      return buildFeatureArchitectureGraph(state);
    case "featureInternal":
      return buildFeatureInternalGraph(state, selectedFeatureId);
    case "baselineDiff":
      return buildBaselineDiffGraph(state);
  }
}

function buildLiveImpactGraph(state: DashboardState): GraphViewModel {
  const impactedIds = new Set(state.snapshot.impactedFeatures.map((feature) => feature.featureId));
  for (const file of state.snapshot.changedFiles) {
    if (file.featureId) {
      impactedIds.add(file.featureId);
    }
  }

  const features = state.snapshot.featureBlocks.filter((feature) => impactedIds.has(feature.id));
  const nodes = features.map(featureToNode);
  const edges = buildFeatureEdges(state.snapshot.dependencies, state.snapshot.modules, new Set(features.map((feature) => feature.id)));

  return ensureNonEmpty({
    id: "live-impact",
    title: "Architecture Impact Graph",
    description: "Changed and impacted feature blocks linked by workspace imports.",
    target: "liveImpact",
    nodes,
    edges
  });
}

function buildLiveDependencyGraph(state: DashboardState): GraphViewModel {
  const changedModuleIds = new Set(state.snapshot.changedFiles.map((file) => file.moduleId).filter(isDefined));
  const visibleModuleIds = new Set(changedModuleIds);

  for (const edge of state.snapshot.dependencies) {
    if (changedModuleIds.has(edge.from)) {
      visibleModuleIds.add(edge.to);
    }
    if (changedModuleIds.has(edge.to)) {
      visibleModuleIds.add(edge.from);
    }
  }

  const modules = limitModules(state.snapshot.modules.filter((moduleNode) => visibleModuleIds.has(moduleNode.id)), 36);
  const moduleIds = new Set(modules.map((moduleNode) => moduleNode.id));
  const nodes = modules.map(moduleToNode);
  const edges = state.snapshot.dependencies
    .filter((edge) => moduleIds.has(edge.from) && moduleIds.has(edge.to))
    .map(dependencyToEdge);

  return ensureNonEmpty({
    id: "live-dependency",
    title: "Dependency Graph",
    description: "Changed modules and their nearest local dependency neighbors.",
    target: "liveDependency",
    nodes,
    edges
  });
}

function buildFeatureArchitectureGraph(state: DashboardState): GraphViewModel {
  const featureIds = new Set(state.snapshot.featureBlocks.map((feature) => feature.id));
  return ensureNonEmpty({
    id: "whole-architecture",
    title: "Whole Architecture",
    description: "Feature-level architecture graph aggregated from local imports.",
    target: "wholeArchitecture",
    nodes: state.snapshot.featureBlocks.map(featureToNode),
    edges: buildFeatureEdges(state.snapshot.dependencies, state.snapshot.modules, featureIds)
  });
}

function buildFeatureInternalGraph(state: DashboardState, selectedFeatureId: string | undefined): GraphViewModel {
  const feature = state.snapshot.featureBlocks.find((candidate) => candidate.id === selectedFeatureId)
    ?? state.snapshot.featureBlocks[0];
  const moduleIds = new Set(feature?.moduleIds ?? []);
  const modules = limitModules(state.snapshot.modules.filter((moduleNode) => moduleIds.has(moduleNode.id)), 42);
  const visibleIds = new Set(modules.map((moduleNode) => moduleNode.id));

  return ensureNonEmpty({
    id: `feature-internal-${feature?.id ?? "none"}`,
    title: feature ? `${feature.label} Dependencies` : "Feature Dependencies",
    description: feature?.description ?? "No selected feature is available.",
    target: "featureInternal",
    nodes: modules.map(moduleToNode),
    edges: state.snapshot.dependencies
      .filter((edge) => visibleIds.has(edge.from) && visibleIds.has(edge.to))
      .map(dependencyToEdge)
  });
}

function buildBaselineDiffGraph(state: DashboardState): GraphViewModel {
  const diff = state.baselineDiff;
  if (!diff) {
    return ensureNonEmpty({
      id: "baseline-diff-empty",
      title: "Before After Graph",
      description: "Capture a baseline to compare structural changes.",
      target: "baselineDiff",
      nodes: [],
      edges: []
    });
  }

  const changedModules = new Map<string, GraphViewNode>();
  for (const moduleNode of [...diff.addedModules, ...diff.changedModules, ...diff.removedModules]) {
    changedModules.set(moduleNode.id, moduleToNode(moduleNode));
  }
  for (const feature of diff.changedFeatures) {
    changedModules.set(`feature:${feature.id}`, featureToNode(feature));
  }

  const visibleIds = new Set(changedModules.keys());
  const edges = [
    ...diff.addedEdges,
    ...diff.removedEdges
  ]
    .filter((edge) => visibleIds.has(edge.from) && visibleIds.has(edge.to))
    .map((edge) => ({
      ...dependencyToEdge(edge),
      id: `diff:${edge.from}->${edge.to}`,
      kind: "diff" as const
    }));

  return ensureNonEmpty({
    id: "baseline-diff",
    title: "Before After Graph",
    description: "Modules and feature blocks that changed since the captured baseline.",
    target: "baselineDiff",
    nodes: [...changedModules.values()],
    edges
  });
}

function featureToNode(feature: FeatureBlock): GraphViewNode {
  return {
    id: feature.id,
    label: feature.label,
    detail: `${feature.moduleIds.length} modules, ${feature.changedFileCount} changed`,
    kind: "feature",
    width: 220,
    height: 96,
    riskLevel: feature.riskLevel,
    moduleCount: feature.moduleIds.length,
    changedFileCount: feature.changedFileCount
  };
}

function moduleToNode(moduleNode: ModuleNode): GraphViewNode {
  return {
    id: moduleNode.id,
    label: moduleNode.name,
    detail: moduleNode.path,
    kind: "module",
    width: 230,
    height: 88,
    riskLevel: moduleNode.riskLevel,
    moduleCount: 1,
    changedFileCount: 0
  };
}

function dependencyToEdge(edge: DependencyEdge): GraphViewEdge {
  return {
    id: `${edge.kind}:${edge.from}->${edge.to}`,
    source: edge.from,
    target: edge.to,
    label: edge.kind,
    kind: edge.kind
  };
}

function buildFeatureEdges(
  dependencies: DependencyEdge[],
  modules: ModuleNode[],
  featureIds: Set<string>
): GraphViewEdge[] {
  const moduleFeatureById = new Map(modules.map((moduleNode) => [moduleNode.id, moduleNode.featureId]));
  const byKey = new Map<string, GraphViewEdge>();

  for (const dependency of dependencies) {
    const source = moduleFeatureById.get(dependency.from);
    const target = moduleFeatureById.get(dependency.to);
    if (!source || !target || source === target || !featureIds.has(source) || !featureIds.has(target)) {
      continue;
    }
    const key = `${source}->${target}`;
    byKey.set(key, {
      id: `feature:${key}`,
      source,
      target,
      label: "imports",
      kind: "feature"
    });
  }

  return [...byKey.values()].sort((left, right) => left.id.localeCompare(right.id));
}

function ensureNonEmpty(view: GraphViewModel): GraphViewModel {
  if (view.nodes.length > 0) {
    return view;
  }
  return {
    ...view,
    nodes: [
      {
        id: `${view.id}:empty`,
        label: "No graph data",
        detail: view.description,
        kind: "summary",
        width: 240,
        height: 92
      }
    ],
    edges: []
  };
}

function limitModules(modules: ModuleNode[], limit: number): ModuleNode[] {
  return modules
    .slice()
    .sort((left, right) => riskOrder(right.riskLevel) - riskOrder(left.riskLevel) || left.path.localeCompare(right.path))
    .slice(0, limit);
}

function riskOrder(risk: RiskLevel): number {
  switch (risk) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
  }
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}
