import { GraphViewModel } from "../webview/graphViewModel";

const layouts = new Map<string, GraphViewModel>();

export function getCachedLayout(view: GraphViewModel): GraphViewModel | undefined {
  return layouts.get(getLayoutCacheKey(view));
}

export function storeCachedLayout(view: GraphViewModel): void {
  layouts.set(getLayoutCacheKey(view), view);
}

export function getLayoutCacheKey(view: GraphViewModel): string {
  return JSON.stringify({
    id: view.id,
    nodes: view.nodes.map((node) => [node.id, node.width, node.height]),
    edges: view.edges.map((edge) => [edge.id, edge.source, edge.target])
  });
}
