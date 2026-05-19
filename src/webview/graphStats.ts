import { DashboardState } from "./dashboardState";
import { buildGraphViewForTarget } from "./graphViewModel";

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

  const nodes = views.reduce((total, view) => total + view.nodes.length, 0);
  const edges = views.reduce((total, view) => total + view.edges.length, 0);
  return {
    nodes,
    edges,
    summary: views.map((view) => `${view.id}:${view.nodes.length}/${view.edges.length}`).join(",")
  };
}
