import { GraphViewModel } from "../webview/graphViewModel";

const layouts = new Map<string, GraphViewModel>();

export function getCachedLayout(view: GraphViewModel, layoutMode = "default"): GraphViewModel | undefined {
  const cached = layouts.get(getLayoutCacheKey(view, layoutMode));
  if (!cached) {
    return undefined;
  }

  const cachedNodesById = new Map(cached.nodes.map((node) => [node.id, node]));
  return {
    ...view,
    nodes: view.nodes.map((node) => {
      const cachedNode = cachedNodesById.get(node.id);
      return {
        ...node,
        x: cachedNode?.x,
        y: cachedNode?.y
      };
    }),
    edges: view.edges
  };
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
