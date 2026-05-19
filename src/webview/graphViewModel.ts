import {
  ArchitectureFactEntity,
  ArchitectureRelationKind,
  DashboardState,
  DependencyEdge,
  FeatureBlock,
  ModuleNode,
  RiskLevel
} from "./dashboardState";
import {
  filterArchitectureVisibleDependencies,
  filterArchitectureVisibleFeatureBlocks,
  filterArchitectureVisibleModules,
  isArchitectureVisibleDependency,
  isArchitectureVisibleModule
} from "./architectureVisibility";
import { inferModuleRole, ModuleRoleAssignment, RuntimeModuleRole, roleLabel } from "./moduleRoleInference";
import {
  getSemanticFeatureDefinition,
  SemanticFeatureDefinition,
  SemanticFlowRole,
  SemanticFlowStep
} from "./semanticArchitectureModel";

export type GraphViewTarget =
  | "liveImpact"
  | "liveDependency"
  | "wholeArchitecture"
  | "featureInternal"
  | "baselineDiff";

export type GraphNodeKind =
  | "system"
  | "feature"
  | "layer"
  | "package"
  | "launch"
  | "node"
  | "topic"
  | "entrypoint"
  | "orchestrator"
  | "service"
  | "adapter"
  | "config"
  | "data"
  | "action"
  | "module"
  | "summary";

export type GraphSemanticEdgeKind =
  | "starts"
  | "calls"
  | "uses"
  | "configures"
  | "publishes"
  | "subscribes"
  | "validates"
  | "contains"
  | "flows"
  | "imports"
  | "launches"
  | "callsService"
  | "offersService"
  | "usesAction"
  | "usesConfig"
  | "commandFlow";

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
  role?: string;
  layer?: string;
  moduleIds?: string[];
  badges?: string[];
  primaryPaths?: string[];
  x?: number;
  y?: number;
}

export interface GraphViewEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  kind: DependencyEdge["kind"] | "feature" | "diff" | "architecture";
  semanticKind?: GraphSemanticEdgeKind;
  confidence?: "low" | "medium" | "high";
}

interface VisibleArchitectureState {
  modules: ModuleNode[];
  dependencies: DependencyEdge[];
  featureBlocks: FeatureBlock[];
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
      return buildWholeArchitectureSemanticGraph(state);
    case "featureInternal":
      return buildFeatureFocusSemanticGraph(state, selectedFeatureId);
    case "baselineDiff":
      return buildBaselineDiffGraph(state);
  }
}

export function buildWholeArchitectureSemanticGraph(state: DashboardState): GraphViewModel {
  const visible = getVisibleArchitectureState(state);
  const workspaceName = state.snapshot.workspaceName || state.workspace.name;
  const systemNode: GraphViewNode = {
    id: "system:workspace",
    label: "Workspace / System",
    detail: `${workspaceName}: ${visible.modules.length} runtime modules across ${visible.featureBlocks.length} feature blocks`,
    kind: "system",
    width: 320,
    height: 140,
    moduleCount: visible.modules.length,
    changedFileCount: visible.featureBlocks.reduce((total, feature) => total + countVisibleChangedFiles(state, feature), 0),
    role: "Workspace runtime architecture"
  };

  const nodes: GraphViewNode[] = [systemNode];
  const edges: GraphViewEdge[] = [];
  const layers = new Map<string, FeatureBlock[]>();

  for (const feature of visible.featureBlocks) {
    const definition = getSemanticFeatureDefinition(feature.id);
    const layer = definition?.layer ?? "Runtime / Other";
    const layerFeatures = layers.get(layer) ?? [];
    layerFeatures.push(feature);
    layers.set(layer, layerFeatures);
  }

  for (const [layer, features] of [...layers.entries()].sort((left, right) => layerRank(left[0]) - layerRank(right[0]) || left[0].localeCompare(right[0]))) {
    const layerId = layerNodeId(layer);
    const layerModuleIds = new Set(features.flatMap((feature) => feature.moduleIds));
    nodes.push({
      id: layerId,
      label: layer,
      detail: `${features.length} feature blocks, ${layerModuleIds.size} runtime modules`,
      kind: "layer",
      width: 280,
      height: 116,
      layer,
      moduleCount: layerModuleIds.size,
      role: "Runtime layer"
    });
    edges.push(edge("contains", "system:workspace", layerId, "contains", "feature", "high"));

    for (const feature of features.sort((left, right) => left.label.localeCompare(right.label))) {
      const definition = getSemanticFeatureDefinition(feature.id);
      const featureModules = modulesForFeature(feature, visible.modules);
      const featureNodeId = featureNodeIdFor(feature.id);
      nodes.push(featureToSemanticNode(feature, featureModules, state, definition, layer));
      edges.push(edge("contains", layerId, featureNodeId, "contains", "feature", "high"));

      for (const summaryNode of buildRuntimeRoleSummaryNodes(feature, featureModules, visible.dependencies, definition)) {
        nodes.push(summaryNode);
        edges.push(edge("contains", featureNodeId, summaryNode.id, "contains", "feature", summaryNode.badges?.includes("low confidence") ? "low" : "medium"));
      }
    }
  }

  addSemanticArchitectureEdges(edges, visible);
  addImportInferredFeatureEdges(edges, visible);
  addArchitectureFactGraph(nodes, edges, state);

  return ensureNonEmpty(pruneDanglingEdges({
    id: "whole-architecture",
    title: "Whole Architecture",
    description: "Semantic runtime architecture organized by system, layers, feature blocks, and module roles.",
    target: "wholeArchitecture",
    nodes,
    edges
  }));
}

function addArchitectureFactGraph(nodes: GraphViewNode[], edges: GraphViewEdge[], state: DashboardState): void {
  const facts = state.snapshot.architectureFacts;
  if (facts.entities.length === 0) {
    return;
  }

  const factEntities = selectArchitectureFactEntities(facts.entities);
  if (factEntities.length === 0) {
    return;
  }

  const layerId = "layer:ros-runtime-facts";
  if (!nodes.some((node) => node.id === layerId)) {
    nodes.push({
      id: layerId,
      label: "ROS Runtime Facts",
      detail: `${factEntities.length} package, launch, node, topic, service, action, and config facts`,
      kind: "layer",
      width: 300,
      height: 122,
      role: "Evidence-based ROS2 runtime graph",
      moduleCount: factEntities.length,
      badges: ["facts"]
    });
    edges.push(edge("contains", "system:workspace", layerId, "contains", "feature", "high"));
  }

  const entityIds = new Set<string>();
  for (const entity of factEntities) {
    const graphNode = architectureEntityToNode(entity);
    entityIds.add(entity.id);
    nodes.push(graphNode);
    edges.push(edge("contains", layerId, graphNode.id, "contains", "architecture", entity.confidence));
  }

  for (const relation of facts.relations) {
    if (!entityIds.has(relation.source) || !entityIds.has(relation.target)) {
      continue;
    }
    edges.push({
      id: `architecture:${relation.id}`,
      source: architectureNodeId(relation.source),
      target: architectureNodeId(relation.target),
      label: relation.kind,
      kind: "architecture",
      semanticKind: relationKindToSemanticKind(relation.kind),
      confidence: relation.confidence
    });
  }
}

function selectArchitectureFactEntities(entities: readonly ArchitectureFactEntity[]): ArchitectureFactEntity[] {
  const packages = entities.filter((entity) => entity.kind === "package").slice(0, 24);
  const runtimeFacts = entities.filter((entity) => entity.kind !== "package" && entity.kind !== "module").slice(0, 96);
  return [...packages, ...runtimeFacts];
}

function architectureEntityToNode(entity: ArchitectureFactEntity): GraphViewNode {
  return {
    id: architectureNodeId(entity.id),
    label: entity.label,
    detail: entity.detail,
    kind: architectureEntityKindToNodeKind(entity.kind),
    width: entity.kind === "launch" ? 340 : entity.kind === "package" ? 260 : 300,
    height: entity.kind === "launch" ? 176 : entity.kind === "package" || entity.kind === "config" ? 150 : 138,
    role: entity.kind,
    layer: "ROS Runtime Facts",
    moduleCount: 1,
    badges: [entity.confidence, entity.kind],
    primaryPaths: entity.path ? [entity.path] : undefined
  };
}

function architectureNodeId(entityId: string): string {
  return `fact:${entityId}`;
}

function architectureEntityKindToNodeKind(kind: ArchitectureFactEntity["kind"]): GraphNodeKind {
  switch (kind) {
    case "package":
      return "package";
    case "launch":
      return "launch";
    case "node":
      return "node";
    case "topic":
      return "topic";
    case "action":
      return "action";
    case "service":
      return "service";
    case "config":
      return "config";
    case "module":
      return "module";
  }
}

function relationKindToSemanticKind(kind: ArchitectureRelationKind): GraphSemanticEdgeKind {
  switch (kind) {
    case "launches":
      return "launches";
    case "publishes":
      return "publishes";
    case "subscribes":
      return "subscribes";
    case "callsService":
      return "callsService";
    case "offersService":
      return "offersService";
    case "usesAction":
      return "usesAction";
    case "usesConfig":
      return "usesConfig";
    case "commandFlow":
      return "commandFlow";
    case "imports":
      return "imports";
  }
}

export function buildFeatureFocusSemanticGraph(
  state: DashboardState,
  selectedFeatureId = state.selectedFeatureId
): GraphViewModel {
  const visible = getVisibleArchitectureState(state);
  const feature = visible.featureBlocks.find((candidate) => candidate.id === selectedFeatureId)
    ?? visible.featureBlocks[0];
  const definition = getSemanticFeatureDefinition(feature?.id);

  if (!feature || !definition) {
    return ensureNonEmpty({
      id: `feature-semantic-${feature?.id ?? "none"}`,
      title: feature ? `${feature.label} Semantic Flow` : "Feature Semantic Flow",
      description: "Semantic model unavailable for the selected runtime feature.",
      target: "featureInternal",
      nodes: [
        {
          id: "semantic-model-unavailable",
          label: "Semantic model unavailable",
          detail: "No runtime semantic definition is available for this feature.",
          kind: "summary",
          width: 320,
          height: 128,
          role: "Diagnostic"
        }
      ],
      edges: []
    });
  }

  const featureModules = modulesForFeature(feature, visible.modules);
  const assignments = assignRoles(featureModules, visible.dependencies, definition);
  const usedModuleIds = new Set<string>();
  const nodes: GraphViewNode[] = [];
  const edges: GraphViewEdge[] = [];

  const inputNodeId = `feature:${feature.id}:input`;
  const outputNodeId = `feature:${feature.id}:output`;
  nodes.push({
    id: inputNodeId,
    label: definition.inputs[0] ?? "Feature Input",
    detail: definition.inputs.join(", ") || "Runtime input",
    kind: "entrypoint",
    width: 260,
    height: 128,
    role: "Input",
    moduleCount: 0,
    badges: ["semantic"]
  });

  let previousNodeId = inputNodeId;
  for (const flowStep of definition.flowSteps) {
    const matchedModules = featureModules.filter((moduleNode) => {
      const assignment = assignments.get(moduleNode.id);
      if (!assignment || assignment.role === "unclassified") {
        return false;
      }
      return moduleMatchesFlowStep(moduleNode, assignment, flowStep);
    });
    for (const moduleNode of matchedModules) {
      usedModuleIds.add(moduleNode.id);
    }

    const confidence = stepConfidence(matchedModules, assignments);
    const stepNodeId = `feature:${feature.id}:step:${flowStep.id}`;
    nodes.push({
      id: stepNodeId,
      label: flowStep.label,
      detail: stepDetail(flowStep, matchedModules),
      kind: flowRoleToNodeKind(flowStep.role),
      width: 300,
      height: 158,
      role: flowStep.role,
      layer: definition.layer,
      moduleCount: matchedModules.length,
      moduleIds: matchedModules.map((moduleNode) => moduleNode.id),
      badges: [confidence === "low" ? "inferred" : "semantic", `${matchedModules.length} modules`],
      primaryPaths: matchedModules.slice(0, 3).map((moduleNode) => moduleNode.path)
    });
    edges.push(edge("flows", previousNodeId, stepNodeId, "flows", "feature", confidence));
    previousNodeId = stepNodeId;
  }

  const unclassifiedModules = featureModules.filter((moduleNode) => {
    const assignment = assignments.get(moduleNode.id);
    return !usedModuleIds.has(moduleNode.id) || assignment?.role === "unclassified" || assignment?.confidence === "low";
  });
  if (unclassifiedModules.length > 0) {
    const unclassifiedNodeId = `feature:${feature.id}:supporting-unclassified`;
    nodes.push({
      id: unclassifiedNodeId,
      label: "Supporting / Unclassified Runtime Modules",
      detail: describeModules(unclassifiedModules),
      kind: "summary",
      width: 320,
      height: 148,
      role: "Unclassified runtime support",
      moduleCount: unclassifiedModules.length,
      moduleIds: unclassifiedModules.map((moduleNode) => moduleNode.id),
      badges: ["low confidence"],
      primaryPaths: unclassifiedModules.slice(0, 3).map((moduleNode) => moduleNode.path)
    });
    edges.push(edge("contains", previousNodeId, unclassifiedNodeId, "contains", "feature", "low"));
    previousNodeId = unclassifiedNodeId;
  }

  nodes.push({
    id: outputNodeId,
    label: definition.outputs[0] ?? "Feature Output",
    detail: definition.outputs.join(", ") || "Runtime output",
    kind: "data",
    width: 270,
    height: 128,
    role: "Output",
    moduleCount: 0,
    badges: ["semantic"]
  });
  edges.push(edge("publishes", previousNodeId, outputNodeId, "publishes", "feature", "high"));

  return ensureNonEmpty(pruneDanglingEdges({
    id: `feature-semantic-${feature.id}`,
    title: `${feature.label} Semantic Flow`,
    description: definition.role,
    target: "featureInternal",
    nodes,
    edges
  }));
}

function buildLiveImpactGraph(state: DashboardState): GraphViewModel {
  const visible = getVisibleArchitectureState(state);
  const visibleModuleIds = new Set(visible.modules.map((moduleNode) => moduleNode.id));
  const visibleFeatureIds = new Set(visible.featureBlocks.map((feature) => feature.id));
  const impactedIds = new Set(state.snapshot.impactedFeatures
    .map((feature) => feature.featureId)
    .filter((featureId) => visibleFeatureIds.has(featureId)));
  for (const file of state.snapshot.changedFiles) {
    if (file.featureId && visibleFeatureIds.has(file.featureId) && (!file.moduleId || visibleModuleIds.has(file.moduleId))) {
      impactedIds.add(file.featureId);
    }
  }

  const features = visible.featureBlocks.filter((feature) => impactedIds.has(feature.id));
  const featureIds = new Set(features.map((feature) => feature.id));
  const nodes = features.map(featureToNode);
  const edges = buildFeatureEdges(visible.dependencies, visible.modules, featureIds);

  return ensureNonEmpty(pruneDanglingEdges({
    id: "live-impact",
    title: "Architecture Impact Graph",
    description: "Changed and impacted runtime feature blocks linked by workspace imports.",
    target: "liveImpact",
    nodes,
    edges
  }));
}

function buildLiveDependencyGraph(state: DashboardState): GraphViewModel {
  const visible = getVisibleArchitectureState(state);
  const visibleModuleIds = new Set(visible.modules.map((moduleNode) => moduleNode.id));
  const changedModuleIds = new Set(state.snapshot.changedFiles
    .map((file) => file.moduleId)
    .filter((moduleId): moduleId is string => typeof moduleId === "string" && visibleModuleIds.has(moduleId)));
  const graphModuleIds = new Set(changedModuleIds);

  for (const edge of visible.dependencies) {
    if (changedModuleIds.has(edge.from)) {
      graphModuleIds.add(edge.to);
    }
    if (changedModuleIds.has(edge.to)) {
      graphModuleIds.add(edge.from);
    }
  }

  const modules = limitModules(visible.modules.filter((moduleNode) => graphModuleIds.has(moduleNode.id)), 36);
  const moduleIds = new Set(modules.map((moduleNode) => moduleNode.id));
  const nodes = modules.map(moduleToNode);
  const edges = visible.dependencies
    .filter((edge) => moduleIds.has(edge.from) && moduleIds.has(edge.to))
    .map(dependencyToEdge);

  return ensureNonEmpty(pruneDanglingEdges({
    id: "live-dependency",
    title: "Dependency Graph",
    description: "Changed runtime modules and their nearest local dependency neighbors.",
    target: "liveDependency",
    nodes,
    edges
  }));
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

  const visibleCurrentModules = new Map(filterArchitectureVisibleModules(state.snapshot.modules).map((moduleNode) => [moduleNode.id, moduleNode]));
  const changedModules = new Map<string, GraphViewNode>();
  for (const moduleNode of [...diff.addedModules, ...diff.changedModules, ...diff.removedModules]) {
    if (isArchitectureVisibleModule(moduleNode) && (visibleCurrentModules.has(moduleNode.id) || diff.removedModules.includes(moduleNode))) {
      changedModules.set(moduleNode.id, moduleToNode(moduleNode));
    }
  }
  for (const feature of diff.changedFeatures) {
    if (feature.id !== "tests") {
      changedModules.set(`feature:${feature.id}`, featureToNode(feature));
    }
  }

  const visibleIds = new Set(changedModules.keys());
  const edges = [
    ...diff.addedEdges,
    ...diff.removedEdges
  ]
    .filter((edge) => edge.kind !== "test" && visibleIds.has(edge.from) && visibleIds.has(edge.to))
    .map((edge) => ({
      ...dependencyToEdge(edge),
      id: `diff:${edge.from}->${edge.to}`,
      kind: "diff" as const
    }));

  return ensureNonEmpty(pruneDanglingEdges({
    id: "baseline-diff",
    title: "Before After Graph",
    description: "Runtime modules and feature blocks that changed since the captured baseline.",
    target: "baselineDiff",
    nodes: [...changedModules.values()],
    edges
  }));
}

function featureToNode(feature: FeatureBlock): GraphViewNode {
  return {
    id: feature.id,
    label: feature.label,
    detail: `${feature.moduleIds.length} modules, ${feature.changedFileCount} changed`,
    kind: "feature",
    width: 220,
    height: 118,
    riskLevel: feature.riskLevel,
    moduleCount: feature.moduleIds.length,
    changedFileCount: feature.changedFileCount,
    moduleIds: feature.moduleIds
  };
}

function featureToSemanticNode(
  feature: FeatureBlock,
  featureModules: ModuleNode[],
  state: DashboardState,
  definition: SemanticFeatureDefinition | undefined,
  layer: string
): GraphViewNode {
  const changedFileCount = countVisibleChangedFiles(state, feature);
  const inputsOutputs = definition
    ? `Inputs: ${definition.inputs.slice(0, 2).join(", ")}. Outputs: ${definition.outputs.slice(0, 2).join(", ")}.`
    : feature.description;
  return {
    id: featureNodeIdFor(feature.id),
    label: feature.label,
    detail: `${featureModules.length} runtime modules, ${changedFileCount} changed. ${inputsOutputs}`,
    kind: "feature",
    width: 320,
    height: 154,
    riskLevel: feature.riskLevel,
    moduleCount: featureModules.length,
    changedFileCount,
    role: definition?.role ?? feature.description,
    layer,
    moduleIds: featureModules.map((moduleNode) => moduleNode.id),
    badges: [feature.riskLevel, definition ? "semantic" : "inferred"]
  };
}

function moduleToNode(moduleNode: ModuleNode): GraphViewNode {
  return {
    id: moduleNode.id,
    label: moduleNode.name,
    detail: moduleNode.path,
    kind: "module",
    width: 260,
    height: 112,
    riskLevel: moduleNode.riskLevel,
    moduleCount: 1,
    changedFileCount: 0,
    moduleIds: [moduleNode.id],
    primaryPaths: [moduleNode.path]
  };
}

function dependencyToEdge(edgeValue: DependencyEdge): GraphViewEdge {
  return {
    id: `${edgeValue.kind}:${edgeValue.from}->${edgeValue.to}`,
    source: edgeValue.from,
    target: edgeValue.to,
    label: edgeValue.kind,
    kind: edgeValue.kind,
    semanticKind: edgeValue.kind === "import" ? "imports" : edgeValue.kind === "config" ? "configures" : "flows",
    confidence: edgeValue.confidence
  };
}

function buildFeatureEdges(
  dependencies: DependencyEdge[],
  modules: ModuleNode[],
  featureIds: Set<string>
): GraphViewEdge[] {
  const modulesById = new Map(modules.map((moduleNode) => [moduleNode.id, moduleNode]));
  const moduleFeatureById = new Map(modules.map((moduleNode) => [moduleNode.id, moduleNode.featureId]));
  const byKey = new Map<string, GraphViewEdge>();

  for (const dependency of dependencies) {
    if (!isArchitectureVisibleDependency(dependency, modulesById)) {
      continue;
    }
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
      kind: "feature",
      semanticKind: "imports",
      confidence: dependency.confidence === "high" ? "medium" : dependency.confidence
    });
  }

  return [...byKey.values()].sort((left, right) => left.id.localeCompare(right.id));
}

function buildRuntimeRoleSummaryNodes(
  feature: FeatureBlock,
  modules: ModuleNode[],
  dependencies: DependencyEdge[],
  definition: SemanticFeatureDefinition | undefined
): GraphViewNode[] {
  const grouped = new Map<RuntimeModuleRole, { assignment: ModuleRoleAssignment; modules: ModuleNode[] }>();
  for (const moduleNode of modules) {
    const assignment = inferModuleRole(moduleNode, dependencies, definition);
    if (!assignment) {
      continue;
    }
    const group = grouped.get(assignment.role) ?? {
      assignment,
      modules: []
    };
    group.modules.push(moduleNode);
    if (confidenceRank(assignment.confidence) < confidenceRank(group.assignment.confidence)) {
      group.assignment = assignment;
    }
    grouped.set(assignment.role, group);
  }

  return [...grouped.entries()]
    .sort((left, right) => runtimeRoleRank(left[0]) - runtimeRoleRank(right[0]) || left[0].localeCompare(right[0]))
    .slice(0, 4)
    .map(([role, group]) => {
      const nodeKind = runtimeRoleToNodeKind(role);
      return {
        id: `role:${feature.id}:${role}`,
        label: roleLabel(role),
        detail: describeModules(group.modules),
        kind: nodeKind,
        width: role === "unclassified" ? 320 : 280,
        height: 128,
        riskLevel: highestRisk(group.modules.map((moduleNode) => moduleNode.riskLevel)),
        moduleCount: group.modules.length,
        role: roleLabel(role),
        moduleIds: group.modules.map((moduleNode) => moduleNode.id),
        primaryPaths: group.modules.slice(0, 3).map((moduleNode) => moduleNode.path),
        badges: [group.assignment.confidence === "low" ? "low confidence" : group.assignment.confidence]
      };
    });
}

function addSemanticArchitectureEdges(edges: GraphViewEdge[], visible: VisibleArchitectureState): void {
  const featureIds = new Set(visible.featureBlocks.map((feature) => feature.id));
  const semanticEdges: Array<[string, string, GraphSemanticEdgeKind, "low" | "medium" | "high"]> = [
    ["gui-layer", "task-runner", "calls", "high"],
    ["task-runner", "motion-planning", "uses", "high"],
    ["motion-planning", "safety-layer", "validates", "high"],
    ["motion-planning", "robot-io-layer", "publishes", "high"],
    ["robot-io-layer", "ros-bridge-runtime", "flows", "medium"],
    ["ros-bridge-runtime", "robot-io-layer", "uses", "medium"],
    ["robot-io-layer", "config-system", "uses", "medium"]
  ];

  for (const feature of visible.featureBlocks) {
    if (feature.id !== "config-system" && featureIds.has("config-system")) {
      semanticEdges.push([feature.id, "config-system", "configures", "medium"]);
    }
    if (feature.id !== "utils-common" && featureIds.has("utils-common")) {
      semanticEdges.push([feature.id, "utils-common", "uses", "medium"]);
    }
  }

  for (const [sourceFeature, targetFeature, semanticKind, confidence] of semanticEdges) {
    if (!featureIds.has(sourceFeature) || !featureIds.has(targetFeature) || sourceFeature === targetFeature) {
      continue;
    }
    edges.push(edge(semanticKind, featureNodeIdFor(sourceFeature), featureNodeIdFor(targetFeature), semanticKind, "feature", confidence));
  }
}

function addImportInferredFeatureEdges(edges: GraphViewEdge[], visible: VisibleArchitectureState): void {
  const existing = new Set(edges.map((edgeValue) => `${edgeValue.source}->${edgeValue.target}`));
  const featureIds = new Set(visible.featureBlocks.map((feature) => feature.id));
  for (const edgeValue of buildFeatureEdges(visible.dependencies, visible.modules, featureIds)) {
    const source = featureNodeIdFor(edgeValue.source);
    const target = featureNodeIdFor(edgeValue.target);
    const key = `${source}->${target}`;
    if (existing.has(key)) {
      continue;
    }
    existing.add(key);
    edges.push({
      ...edgeValue,
      id: `inferred:${edgeValue.source}->${edgeValue.target}`,
      source,
      target,
      label: "imports",
      semanticKind: "imports",
      confidence: edgeValue.confidence ?? "low"
    });
  }
}

function getVisibleArchitectureState(state: DashboardState): VisibleArchitectureState {
  const modules = filterArchitectureVisibleModules(state.snapshot.modules);
  const dependencies = filterArchitectureVisibleDependencies(state.snapshot.dependencies, modules);
  const featureBlocks = filterArchitectureVisibleFeatureBlocks(state.snapshot.featureBlocks, modules);
  return {
    modules,
    dependencies,
    featureBlocks
  };
}

function modulesForFeature(feature: FeatureBlock, modules: ModuleNode[]): ModuleNode[] {
  const moduleIds = new Set(feature.moduleIds);
  return modules
    .filter((moduleNode) => moduleIds.has(moduleNode.id))
    .sort((left, right) => riskOrder(right.riskLevel) - riskOrder(left.riskLevel) || left.path.localeCompare(right.path));
}

function assignRoles(
  modules: ModuleNode[],
  dependencies: DependencyEdge[],
  definition: SemanticFeatureDefinition | undefined
): Map<string, ModuleRoleAssignment> {
  return new Map(modules
    .map((moduleNode) => inferModuleRole(moduleNode, dependencies, definition))
    .filter((assignment): assignment is ModuleRoleAssignment => Boolean(assignment))
    .map((assignment) => [assignment.moduleId, assignment]));
}

function moduleMatchesFlowStep(
  moduleNode: ModuleNode,
  assignment: ModuleRoleAssignment,
  flowStep: SemanticFlowStep
): boolean {
  const searchable = `${moduleNode.path} ${moduleNode.name} ${moduleNode.imports.join(" ")}`.replaceAll("\\", "/").toLowerCase();
  const hints = [...flowStep.pathHints, ...flowStep.importHints].map((hint) => hint.toLowerCase());
  if (hints.some((hint) => searchable.includes(hint))) {
    return true;
  }
  return runtimeRoleMatchesFlowRole(assignment.role, flowStep.role);
}

function runtimeRoleMatchesFlowRole(role: RuntimeModuleRole, flowRole: SemanticFlowRole): boolean {
  switch (flowRole) {
    case "entrypoint":
      return role === "entrypoint" || role === "gui";
    case "orchestrator":
      return role === "orchestrator" || role === "motion-builder";
    case "service":
      return role === "service" || role === "motion-builder" || role === "utility" || role === "gui";
    case "adapter":
      return role === "adapter";
    case "config":
      return role === "config";
    case "data":
      return role === "data" || role === "utility" || role === "config";
    case "safety":
      return role === "safety";
    case "output":
      return role === "adapter" || role === "data" || role === "service";
  }
}

function stepConfidence(
  modules: ModuleNode[],
  assignments: ReadonlyMap<string, ModuleRoleAssignment>
): "low" | "medium" | "high" {
  if (modules.length === 0) {
    return "low";
  }
  const ranks = modules.map((moduleNode) => confidenceRank(assignments.get(moduleNode.id)?.confidence ?? "low"));
  const minRank = Math.min(...ranks);
  return minRank >= 3 ? "high" : minRank >= 2 ? "medium" : "low";
}

function stepDetail(flowStep: SemanticFlowStep, modules: ModuleNode[]): string {
  const moduleText = modules.length > 0 ? describeModules(modules) : "No direct runtime module match yet.";
  return `${flowStep.description} ${moduleText}`;
}

function describeModules(modules: ModuleNode[]): string {
  if (modules.length === 0) {
    return "0 runtime modules";
  }
  const samples = modules.slice(0, 3).map((moduleNode) => moduleNode.name || moduleNode.path).join(", ");
  return `${modules.length} runtime module${modules.length === 1 ? "" : "s"}: ${samples}`;
}

function edge(
  semanticKind: GraphSemanticEdgeKind,
  source: string,
  target: string,
  label: string,
  kind: GraphViewEdge["kind"],
  confidence: "low" | "medium" | "high"
): GraphViewEdge {
  return {
    id: `${semanticKind}:${source}->${target}`,
    source,
    target,
    label,
    kind,
    semanticKind,
    confidence
  };
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
        width: 280,
        height: 118
      }
    ],
    edges: []
  };
}

function pruneDanglingEdges(view: GraphViewModel): GraphViewModel {
  const nodeIds = new Set(view.nodes.map((node) => node.id));
  return {
    ...view,
    edges: view.edges.filter((edgeValue) => nodeIds.has(edgeValue.source) && nodeIds.has(edgeValue.target))
  };
}

function limitModules(modules: ModuleNode[], limit: number): ModuleNode[] {
  return modules
    .sort((left, right) => riskOrder(right.riskLevel) - riskOrder(left.riskLevel) || left.path.localeCompare(right.path))
    .slice(0, limit);
}

function countVisibleChangedFiles(state: DashboardState, feature: FeatureBlock): number {
  const moduleIds = new Set(feature.moduleIds);
  return state.snapshot.changedFiles.filter((file) => file.featureId === feature.id && (!file.moduleId || moduleIds.has(file.moduleId))).length;
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

function highestRisk(risks: RiskLevel[]): RiskLevel | undefined {
  if (risks.includes("high")) {
    return "high";
  }
  if (risks.includes("medium")) {
    return "medium";
  }
  if (risks.includes("low")) {
    return "low";
  }
  return undefined;
}

function confidenceRank(confidence: "low" | "medium" | "high"): number {
  switch (confidence) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
  }
}

function runtimeRoleRank(role: RuntimeModuleRole): number {
  const order: RuntimeModuleRole[] = [
    "entrypoint",
    "gui",
    "orchestrator",
    "motion-builder",
    "service",
    "safety",
    "adapter",
    "config",
    "data",
    "utility",
    "unclassified"
  ];
  return order.indexOf(role);
}

function runtimeRoleToNodeKind(role: RuntimeModuleRole): GraphNodeKind {
  switch (role) {
    case "entrypoint":
    case "gui":
      return "entrypoint";
    case "orchestrator":
    case "motion-builder":
      return "orchestrator";
    case "adapter":
      return "adapter";
    case "config":
      return "config";
    case "data":
      return "data";
    case "service":
    case "safety":
    case "utility":
    case "unclassified":
      return "service";
  }
}

function flowRoleToNodeKind(role: SemanticFlowRole): GraphNodeKind {
  switch (role) {
    case "entrypoint":
      return "entrypoint";
    case "orchestrator":
      return "orchestrator";
    case "adapter":
      return "adapter";
    case "config":
      return "config";
    case "data":
    case "output":
      return "data";
    case "service":
    case "safety":
      return "service";
  }
}

function layerNodeId(layer: string): string {
  return `layer:${slug(layer)}`;
}

function featureNodeIdFor(featureId: string): string {
  return `feature:${featureId}`;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function layerRank(layer: string): number {
  const order = [
    "Interface / GUI",
    "Orchestration",
    "Planning",
    "Safety",
    "Robot I/O",
    "Runtime / ROS",
    "Config / Common",
    "Runtime / Other"
  ];
  const index = order.indexOf(layer);
  return index === -1 ? order.length : index;
}
