import { DashboardState, FeatureBlock, ModuleNode } from "./dashboardState";

export interface FeatureFocusViewModel {
  activeFeature?: FeatureBlock;
  runtimeModules: ModuleNode[];
  relatedTests: ModuleNode[];
}

export function buildFeatureFocusViewModel(
  state: DashboardState,
  activeFeatureId = state.selectedFeatureId
): FeatureFocusViewModel {
  const activeFeature = state.snapshot.featureBlocks.find((feature) => feature.id === activeFeatureId)
    ?? state.snapshot.featureBlocks[0];
  const featureModuleIds = new Set(activeFeature?.moduleIds ?? []);
  const runtimeModules = state.snapshot.modules
    .filter((moduleNode) => featureModuleIds.has(moduleNode.id) && !moduleNode.isTest)
    .sort((left, right) => riskOrder(right.riskLevel) - riskOrder(left.riskLevel) || left.path.localeCompare(right.path));
  const relatedTestIds = new Set<string>();

  for (const moduleNode of state.snapshot.modules) {
    if (moduleNode.isTest && featureModuleIds.has(moduleNode.id)) {
      relatedTestIds.add(moduleNode.id);
    }
  }

  for (const dependency of state.snapshot.dependencies) {
    const from = state.snapshot.modules.find((moduleNode) => moduleNode.id === dependency.from);
    const to = state.snapshot.modules.find((moduleNode) => moduleNode.id === dependency.to);
    if (from?.isTest && featureModuleIds.has(dependency.to)) {
      relatedTestIds.add(from.id);
    }
    if (to?.isTest && featureModuleIds.has(dependency.from)) {
      relatedTestIds.add(to.id);
    }
  }

  const relatedTests = state.snapshot.modules
    .filter((moduleNode) => relatedTestIds.has(moduleNode.id))
    .sort((left, right) => left.path.localeCompare(right.path));

  return {
    activeFeature,
    runtimeModules,
    relatedTests
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
