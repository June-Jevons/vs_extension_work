import type { ELK, ElkNode } from "elkjs/lib/elk-api";
import { GraphViewModel } from "./graphViewModel";

let elk: Promise<ELK> | undefined;

export async function layoutGraphWithElk(view: GraphViewModel): Promise<GraphViewModel> {
  const elkGraph: ElkNode = {
    id: view.id,
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.spacing.nodeNode": "56",
      "elk.layered.spacing.nodeNodeBetweenLayers": "72",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX"
    },
    children: view.nodes.map((node) => ({
      id: node.id,
      width: node.width,
      height: node.height
    })),
    edges: view.edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target]
    }))
  };

  const laidOut = await (await getElk()).layout(elkGraph);
  const positions = new Map((laidOut.children ?? []).map((node) => [node.id, node]));

  return {
    ...view,
    nodes: view.nodes.map((node) => {
      const position = positions.get(node.id);
      if (!isFiniteNumber(position?.x) || !isFiniteNumber(position?.y)) {
        throw new Error(`ELK did not return a finite position for graph node ${node.id}.`);
      }
      return {
        ...node,
        x: position.x,
        y: position.y
      };
    })
  };
}

async function getElk(): Promise<ELK> {
  elk ??= import("elkjs/lib/elk.bundled.js").then((module) => new module.default());
  return elk;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
