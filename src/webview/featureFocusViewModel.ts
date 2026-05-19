import { DashboardState, DependencyEdge, FeatureBlock, ModuleNode } from "./dashboardState";
import { filterArchitectureVisibleDependencies, filterArchitectureVisibleFeatureBlocks, filterArchitectureVisibleModules } from "./architectureVisibility";
import { inferModuleRole, ModuleRoleAssignment, RuntimeModuleRole, roleLabel } from "./moduleRoleInference";
import { getSemanticFeatureDefinition } from "./semanticArchitectureModel";

export interface RuntimeRoleGroup {
  role: RuntimeModuleRole;
  label: string;
  confidence: "low" | "medium" | "high";
  modules: ModuleNode[];
  reasons: string[];
}

export interface FeatureFocusViewModel {
  activeFeature?: FeatureBlock;
  runtimeModules: ModuleNode[];
  roleGroups: RuntimeRoleGroup[];
  unclassifiedRuntimeModules: ModuleNode[];
  runtimeDependencies: DependencyEdge[];
}

export function buildFeatureFocusViewModel(
  state: DashboardState,
  activeFeatureId = state.selectedFeatureId
): FeatureFocusViewModel {
  const visibleModules = filterArchitectureVisibleModules(state.snapshot.modules);
  const visibleDependencies = filterArchitectureVisibleDependencies(state.snapshot.dependencies, visibleModules);
  const visibleFeatures = filterArchitectureVisibleFeatureBlocks(state.snapshot.featureBlocks, visibleModules);
  const activeFeature = visibleFeatures.find((feature) => feature.id === activeFeatureId)
    ?? visibleFeatures[0];
  const featureModuleIds = new Set(activeFeature?.moduleIds ?? []);
  const runtimeModules = visibleModules
    .filter((moduleNode) => featureModuleIds.has(moduleNode.id))
    .sort((left, right) => riskOrder(right.riskLevel) - riskOrder(left.riskLevel) || left.path.localeCompare(right.path));
  const definition = getSemanticFeatureDefinition(activeFeature?.id);
  const assignments = runtimeModules
    .map((moduleNode) => inferModuleRole(moduleNode, visibleDependencies, definition))
    .filter((assignment): assignment is ModuleRoleAssignment => Boolean(assignment));
  const assignmentsByModuleId = new Map(assignments.map((assignment) => [assignment.moduleId, assignment]));
  const grouped = new Map<RuntimeModuleRole, RuntimeRoleGroup>();

  for (const moduleNode of runtimeModules) {
    const assignment = assignmentsByModuleId.get(moduleNode.id);
    if (!assignment || assignment.role === "unclassified" || assignment.confidence === "low") {
      continue;
    }

    const group = grouped.get(assignment.role) ?? {
      role: assignment.role,
      label: roleLabel(assignment.role),
      confidence: assignment.confidence,
      modules: [],
      reasons: []
    };
    group.modules.push(moduleNode);
    if (!group.reasons.includes(assignment.reason)) {
      group.reasons.push(assignment.reason);
    }
    group.confidence = lowerConfidence(group.confidence, assignment.confidence);
    grouped.set(assignment.role, group);
  }

  const unclassifiedRuntimeModules = runtimeModules.filter((moduleNode) => {
    const assignment = assignmentsByModuleId.get(moduleNode.id);
    return !assignment || assignment.role === "unclassified" || assignment.confidence === "low";
  });
  const runtimeModuleIds = new Set(runtimeModules.map((moduleNode) => moduleNode.id));
  const runtimeDependencies = visibleDependencies.filter((dependency) => runtimeModuleIds.has(dependency.from) || runtimeModuleIds.has(dependency.to));

  return {
    activeFeature,
    runtimeModules,
    roleGroups: [...grouped.values()].sort((left, right) => roleOrder(left.role) - roleOrder(right.role)),
    unclassifiedRuntimeModules,
    runtimeDependencies
  };
}

function riskOrder(risk: ModuleNode["riskLevel"]): number {
  switch (risk) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
  }
}

function roleOrder(role: RuntimeModuleRole): number {
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
  const index = order.indexOf(role);
  return index === -1 ? order.length : index;
}

function lowerConfidence(
  left: "low" | "medium" | "high",
  right: "low" | "medium" | "high"
): "low" | "medium" | "high" {
  return confidenceRank(left) <= confidenceRank(right) ? left : right;
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
