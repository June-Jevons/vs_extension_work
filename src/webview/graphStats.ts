import { DashboardState } from "./dashboardState";
import { buildGraphViewForTarget, GraphViewModel, GraphViewNode } from "./graphViewModel";

export interface GraphStats {
  nodes: number;
  edges: number;
  summary: string;
}

export function getGraphStatsForMode(state: DashboardState): GraphStats {
  const views = state.mode === "liveChanges"
    ? [
      buildGraphViewForTarget(state, "liveImpact"),
      buildGraphViewForTarget(state, "liveDependency")
    ]
    : [
      buildGraphViewForTarget(
        state,
        state.mode === "wholeArchitecture"
          ? "wholeArchitecture"
          : state.mode === "featureFocus"
            ? "featureInternal"
            : "baselineDiff",
        state.selectedFeatureId
      )
    ];

  const visibleViews = views.map(getDefaultVisibleGraphView);
  const nodes = visibleViews.reduce((total, view) => total + view.nodes.length, 0);
  const edges = visibleViews.reduce((total, view) => total + view.edges.length, 0);
  return {
    nodes,
    edges,
    summary: visibleViews.map((view) => `${view.id}:${view.nodes.length}/${view.edges.length}`).join(",")
  };
}

function getDefaultVisibleGraphView(view: GraphViewModel): GraphViewModel {
  const nodesByExpansionKey = new Map(view.nodes
    .filter((node) => node.expansionKey)
    .map((node) => [node.expansionKey!, node]));
  const nodes = view.nodes.filter((node) => isDefaultVisibleGraphNode(node, nodesByExpansionKey));
  const nodeIds = new Set(nodes.map((node) => node.id));
  return {
    ...view,
    nodes,
    edges: view.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
  };
}

function isDefaultVisibleGraphNode(
  node: GraphViewNode,
  _nodesByExpansionKey: ReadonlyMap<string, GraphViewNode>
): boolean {
  if (!node.expansionParentKey) {
    return node.defaultVisible !== false;
  }
  return false;
}
