import { GraphModel } from "../webview/dashboardState";

export function graphViewBox(graph: GraphModel): string {
  return `0 0 ${graph.width} ${graph.height}`;
}
