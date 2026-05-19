import { BaselineDiff, DependencyEdge, FeatureBlock, ModuleNode, RiskItem, WorkspaceSnapshot } from "../webview/dashboardState";
import { filterArchitectureVisibleDependencies, filterArchitectureVisibleFeatureBlocks, filterArchitectureVisibleModules } from "../webview/architectureVisibility";

export function buildGraphDiff(baseline: WorkspaceSnapshot, current: WorkspaceSnapshot): BaselineDiff {
  const baselineRuntimeModules = filterArchitectureVisibleModules(baseline.modules);
  const currentRuntimeModules = filterArchitectureVisibleModules(current.modules);
  const baselineRuntimeEdges = filterArchitectureVisibleDependencies(baseline.dependencies, baselineRuntimeModules);
  const currentRuntimeEdges = filterArchitectureVisibleDependencies(current.dependencies, currentRuntimeModules);
  const currentRuntimeFeatures = filterArchitectureVisibleFeatureBlocks(current.featureBlocks, currentRuntimeModules);
  const baselineModules = new Map(baselineRuntimeModules.map((moduleNode) => [moduleNode.id, moduleNode]));
  const currentModules = new Map(currentRuntimeModules.map((moduleNode) => [moduleNode.id, moduleNode]));
  const baselineEdges = new Map(baselineRuntimeEdges.map((edge) => [edgeKey(edge), edge]));
  const currentEdges = new Map(currentRuntimeEdges.map((edge) => [edgeKey(edge), edge]));

  const addedModules = currentRuntimeModules.filter((moduleNode) => !baselineModules.has(moduleNode.id));
  const removedModules = baselineRuntimeModules.filter((moduleNode) => !currentModules.has(moduleNode.id));
  const changedModules = currentRuntimeModules.filter((moduleNode) => {
    const before = baselineModules.get(moduleNode.id);
    return before !== undefined && moduleSignature(before) !== moduleSignature(moduleNode);
  });

  const addedEdges = currentRuntimeEdges.filter((edge) => !baselineEdges.has(edgeKey(edge)));
  const removedEdges = baselineRuntimeEdges.filter((edge) => !currentEdges.has(edgeKey(edge)));
  const changedFeatureIds = new Set(
    [...addedModules, ...removedModules, ...changedModules]
      .map((moduleNode) => moduleNode.featureId)
      .filter((featureId): featureId is string => typeof featureId === "string")
  );
  const changedFeatures = currentRuntimeFeatures.filter((feature) => changedFeatureIds.has(feature.id));

  return {
    baselineCapturedAtIso: baseline.capturedAtIso,
    currentCapturedAtIso: current.capturedAtIso,
    addedModules,
    removedModules,
    changedModules,
    addedEdges,
    removedEdges,
    changedFeatures,
    riskChanges: buildRiskChanges(changedFeatures, addedEdges, removedEdges)
  };
}

function edgeKey(edge: DependencyEdge): string {
  return `${edge.from}->${edge.to}:${edge.kind}`;
}

function moduleSignature(moduleNode: ModuleNode): string {
  return JSON.stringify({
    imports: moduleNode.imports,
    importedBy: moduleNode.importedBy,
    riskLevel: moduleNode.riskLevel,
    isEntryPoint: moduleNode.isEntryPoint,
    isTest: moduleNode.isTest,
    isOrphan: moduleNode.isOrphan
  });
}

function buildRiskChanges(
  changedFeatures: FeatureBlock[],
  addedEdges: DependencyEdge[],
  removedEdges: DependencyEdge[]
): RiskItem[] {
  if (changedFeatures.length === 0 && addedEdges.length === 0 && removedEdges.length === 0) {
    return [];
  }

  return [
    {
      id: "structural-change",
      label: "Structural dependency change",
      level: addedEdges.length + removedEdges.length > 10 ? "high" : "medium",
      count: addedEdges.length + removedEdges.length,
      detail: `${changedFeatures.length} feature blocks changed since baseline.`
    }
  ];
}
