import { GraphViewModel } from "../webview/graphViewModel";

const layouts = new Map<string, GraphViewModel>();

export function getCachedLayout(view: GraphViewModel, layoutMode = "default"): GraphViewModel | undefined {
  return layouts.get(getLayoutCacheKey(view, layoutMode));
}

export function storeCachedLayout(view: GraphViewModel, layoutMode = "default"): void {
  layouts.set(getLayoutCacheKey(view, layoutMode), view);
}

export function getLayoutCacheKey(view: GraphViewModel, layoutMode = "default"): string {
  return JSON.stringify({
    id: view.id,
    layoutMode,
    nodes: view.nodes.map((node) => [node.id, node.width, node.height]),
    edges: view.edges.map((edge) => [edge.id, edge.source, edge.target])
  });
}
