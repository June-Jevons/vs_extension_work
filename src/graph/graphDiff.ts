import { BaselineDiff, DependencyEdge, FeatureBlock, ModuleNode, RiskItem, WorkspaceSnapshot } from "../webview/dashboardState";

export function buildGraphDiff(baseline: WorkspaceSnapshot, current: WorkspaceSnapshot): BaselineDiff {
  const baselineModules = new Map(baseline.modules.map((moduleNode) => [moduleNode.id, moduleNode]));
  const currentModules = new Map(current.modules.map((moduleNode) => [moduleNode.id, moduleNode]));
  const baselineEdges = new Map(baseline.dependencies.map((edge) => [edgeKey(edge), edge]));
  const currentEdges = new Map(current.dependencies.map((edge) => [edgeKey(edge), edge]));

  const addedModules = current.modules.filter((moduleNode) => !baselineModules.has(moduleNode.id));
  const removedModules = baseline.modules.filter((moduleNode) => !currentModules.has(moduleNode.id));
  const changedModules = current.modules.filter((moduleNode) => {
    const before = baselineModules.get(moduleNode.id);
    return before !== undefined && moduleSignature(before) !== moduleSignature(moduleNode);
  });

  const addedEdges = current.dependencies.filter((edge) => !baselineEdges.has(edgeKey(edge)));
  const removedEdges = baseline.dependencies.filter((edge) => !currentEdges.has(edgeKey(edge)));
  const changedFeatureIds = new Set(
    [...addedModules, ...removedModules, ...changedModules]
      .map((moduleNode) => moduleNode.featureId)
      .filter((featureId): featureId is string => typeof featureId === "string")
  );
  const changedFeatures = current.featureBlocks.filter((feature) => changedFeatureIds.has(feature.id));

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
