import { GraphModel } from "../webview/dashboardState";

export function countGraphNodes(graph: GraphModel): number {
  return graph.nodes.length;
}
