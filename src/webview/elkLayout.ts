import type { ELK, ElkNode } from "elkjs/lib/elk-api";
import { GraphViewModel, GraphViewNode } from "./graphViewModel";

let elk: Promise<ELK> | undefined;

export async function layoutGraphWithElk(view: GraphViewModel): Promise<GraphViewModel> {
  if (view.target === "wholeArchitecture" && view.nodes.some((node) => node.kind === "layer")) {
    return layoutWholeArchitectureByLayer(view);
  }

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

function layoutWholeArchitectureByLayer(view: GraphViewModel): GraphViewModel {
  const nodesById = new Map(view.nodes.map((node) => [node.id, node]));
  const containsEdges = view.edges.filter((edge) => edge.semanticKind === "contains");
  const layerNodes = view.nodes.filter((node) => node.kind === "layer");
  const systemNode = view.nodes.find((node) => node.kind === "system");
  const positioned = new Map<string, { x: number; y: number }>();

  const column = {
    system: 40,
    layer: 420,
    feature: 760,
    role: 1140,
    overflow: 1500
  };
  const top = 48;
  const laneGap = 54;
  const featureGap = 34;
  const roleGap = 18;
  let cursorY = top;

  for (const layerNode of layerNodes) {
    const features = containsEdges
      .filter((edge) => edge.source === layerNode.id)
      .map((edge) => nodesById.get(edge.target))
      .filter((node): node is GraphViewNode => node?.kind === "feature");
    const featureGroups = features.length > 0
      ? features.map((feature) => ({
        feature,
        roleNodes: containsEdges
          .filter((edge) => edge.source === feature.id)
          .map((edge) => nodesById.get(edge.target))
          .filter((node): node is GraphViewNode => Boolean(node))
      }))
      : [];
    const groupHeights = featureGroups.map((group) => Math.max(
      group.feature.height,
      stackedHeight(group.roleNodes, roleGap)
    ));
    const contentHeight = groupHeights.reduce((total, height) => total + height, 0)
      + Math.max(groupHeights.length - 1, 0) * featureGap;
    const laneHeight = Math.max(layerNode.height, contentHeight);

    positioned.set(layerNode.id, {
      x: column.layer,
      y: cursorY + (laneHeight - layerNode.height) / 2
    });

    let groupY = cursorY;
    for (let index = 0; index < featureGroups.length; index += 1) {
      const group = featureGroups[index]!;
      const groupHeight = groupHeights[index] ?? group.feature.height;
      positioned.set(group.feature.id, {
        x: column.feature,
        y: groupY + (groupHeight - group.feature.height) / 2
      });

      let roleY = groupY + Math.max((groupHeight - stackedHeight(group.roleNodes, roleGap)) / 2, 0);
      for (const roleNode of group.roleNodes) {
        positioned.set(roleNode.id, {
          x: column.role,
          y: roleY
        });
        roleY += roleNode.height + roleGap;
      }

      groupY += groupHeight + featureGap;
    }

    cursorY += laneHeight + laneGap;
  }

  const diagramBottom = Math.max(cursorY - laneGap, top + (systemNode?.height ?? 0));
  if (systemNode) {
    positioned.set(systemNode.id, {
      x: column.system,
      y: top + Math.max((diagramBottom - top - systemNode.height) / 2, 0)
    });
  }

  let overflowY = top;
  for (const node of view.nodes) {
    if (positioned.has(node.id)) {
      continue;
    }
    positioned.set(node.id, {
      x: column.overflow,
      y: overflowY
    });
    overflowY += node.height + roleGap;
  }

  return {
    ...view,
    nodes: view.nodes.map((node) => {
      const position = positioned.get(node.id);
      if (!position) {
        throw new Error(`Layered architecture layout did not position graph node ${node.id}.`);
      }
      return {
        ...node,
        x: position.x,
        y: position.y
      };
    })
  };
}

function stackedHeight(nodes: GraphViewNode[], gap: number): number {
  if (nodes.length === 0) {
    return 0;
  }
  return nodes.reduce((total, node) => total + node.height, 0) + (nodes.length - 1) * gap;
}

async function getElk(): Promise<ELK> {
  elk ??= import("elkjs/lib/elk.bundled.js").then((module) => new module.default());
  return elk;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
