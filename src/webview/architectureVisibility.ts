import { DependencyEdge, FeatureBlock, ModuleNode } from "./dashboardState";

export function isArchitectureVisibleModule(moduleNode: ModuleNode): boolean {
  return !moduleNode.isTest && moduleNode.featureId !== "tests";
}

export function isArchitectureVisibleDependency(
  edge: DependencyEdge,
  modulesById: ReadonlyMap<string, ModuleNode>
): boolean {
  if (edge.kind === "test") {
    return false;
  }

  const from = modulesById.get(edge.from);
  const to = modulesById.get(edge.to);

  return Boolean(from && to && isArchitectureVisibleModule(from) && isArchitectureVisibleModule(to));
}

export function filterArchitectureVisibleModules(modules: readonly ModuleNode[]): ModuleNode[] {
  return modules.filter(isArchitectureVisibleModule);
}

export function filterArchitectureVisibleDependencies(
  dependencies: readonly DependencyEdge[],
  modules: readonly ModuleNode[]
): DependencyEdge[] {
  const modulesById = new Map(modules.map((moduleNode) => [moduleNode.id, moduleNode]));
  return dependencies.filter((edge) => isArchitectureVisibleDependency(edge, modulesById));
}

export function filterArchitectureVisibleFeatureBlocks(
  featureBlocks: readonly FeatureBlock[],
  modules: readonly ModuleNode[]
): FeatureBlock[] {
  const visibleModuleIds = new Set(filterArchitectureVisibleModules(modules).map((moduleNode) => moduleNode.id));
  return featureBlocks
    .filter((feature) => feature.id !== "tests")
    .map((feature) => ({
      ...feature,
      moduleIds: feature.moduleIds.filter((moduleId) => visibleModuleIds.has(moduleId))
    }))
    .filter((feature) => feature.moduleIds.length > 0);
}
