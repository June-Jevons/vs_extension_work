import type { ELK, ElkNode } from "elkjs/lib/elk-api";
import { GraphViewModel, GraphViewNode } from "./graphViewModel";

let elk: Promise<ELK> | undefined;

export type GraphLayoutMode =
  | "layerColumns"
  | "layerRows"
  | "dependencyFlow"
  | "topDown"
  | "compact";

export interface GraphLayoutModeOption {
  id: GraphLayoutMode;
  label: string;
  detail: string;
}

export const graphLayoutModeOptions: GraphLayoutModeOption[] = [
  {
    id: "layerColumns",
    label: "Layer Columns",
    detail: "System on the left, semantic layers arranged horizontally."
  },
  {
    id: "layerRows",
    label: "Layer Rows",
    detail: "Semantic layers stacked vertically with features and roles to the right."
  },
  {
    id: "dependencyFlow",
    label: "Dependency Flow",
    detail: "ELK layered left-to-right flow using semantic and import edges."
  },
  {
    id: "topDown",
    label: "Top Down",
    detail: "ELK layered top-to-bottom flow."
  },
  {
    id: "compact",
    label: "Compact",
    detail: "Dense ELK left-to-right flow for larger graphs."
  }
];

export function getDefaultGraphLayoutMode(view: GraphViewModel): GraphLayoutMode {
  return supportsWholeArchitectureLayerLayout(view) ? "layerColumns" : "dependencyFlow";
}

export function getAvailableGraphLayoutModeOptions(view: GraphViewModel): GraphLayoutModeOption[] {
  if (supportsWholeArchitectureLayerLayout(view)) {
    return graphLayoutModeOptions;
  }
  return graphLayoutModeOptions.filter((option) => option.id !== "layerColumns" && option.id !== "layerRows");
}

export async function layoutGraphWithElk(
  view: GraphViewModel,
  layoutMode: GraphLayoutMode = getDefaultGraphLayoutMode(view)
): Promise<GraphViewModel> {
  if (supportsWholeArchitectureLayerLayout(view)) {
    if (layoutMode === "layerColumns") {
      return layoutWholeArchitectureLayerColumns(view);
    }
    if (layoutMode === "layerRows") {
      return layoutWholeArchitectureLayerRows(view);
    }
  }

  const elkGraph: ElkNode = {
    id: view.id,
    layoutOptions: elkLayoutOptions(layoutMode),
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

function supportsWholeArchitectureLayerLayout(view: GraphViewModel): boolean {
  return (view.target === "wholeArchitecture" || view.target === "liveImpact")
    && view.nodes.some((node) => node.kind === "layer");
}

function elkLayoutOptions(layoutMode: GraphLayoutMode): Record<string, string> {
  const compact = layoutMode === "compact";
  return {
    "elk.algorithm": "layered",
    "elk.direction": layoutMode === "topDown" ? "DOWN" : "RIGHT",
    "elk.spacing.nodeNode": compact ? "34" : "56",
    "elk.layered.spacing.nodeNodeBetweenLayers": compact ? "46" : "72",
    "elk.edgeRouting": "ORTHOGONAL",
    "elk.layered.nodePlacement.strategy": compact ? "SIMPLE" : "NETWORK_SIMPLEX"
  };
}

function layoutWholeArchitectureLayerColumns(view: GraphViewModel): GraphViewModel {
  const nodesById = new Map(view.nodes.map((node) => [node.id, node]));
  const containsEdges = view.edges.filter((edge) => edge.semanticKind === "contains");
  const layerNodes = view.nodes.filter((node) => node.kind === "layer");
  const systemNode = view.nodes.find((node) => node.kind === "system");
  const positioned = new Map<string, { x: number; y: number }>();

  const top = 48;
  const left = 42;
  const systemGap = 96;
  const columnGap = 64;
  const columnPad = 16;
  const layerToFeatureGap = 28;
  const featureGap = 32;
  const roleGap = 16;
  const roleIndent = 24;

  const layerGroups = layerNodes.map((layerNode) => {
    const features = containsEdges
      .filter((edge) => edge.source === layerNode.id)
      .map((edge) => nodesById.get(edge.target))
      .filter((node): node is GraphViewNode => node?.kind === "feature");
    const featureGroups = features.map((feature) => {
      const roleNodes = containsEdges
        .filter((edge) => edge.source === feature.id)
        .map((edge) => nodesById.get(edge.target))
        .filter((node): node is GraphViewNode => Boolean(node));
      const roleHeight = stackedHeight(roleNodes, roleGap);
      const height = feature.height + (roleNodes.length > 0 ? roleGap + roleHeight : 0);
      const width = Math.max(feature.width, ...roleNodes.map((node) => node.width + roleIndent), 0);
      return {
        feature,
        roleNodes,
        height,
        width
      };
    });
    const contentHeight = layerNode.height
      + layerToFeatureGap
      + stackedHeight(featureGroups.map((group) => ({
        ...group.feature,
        height: group.height
      })), featureGap);
    const contentWidth = Math.max(layerNode.width, ...featureGroups.map((group) => group.width), 0);
    return {
      layerNode,
      featureGroups,
      width: contentWidth + columnPad * 2,
      height: contentHeight
    };
  });

  const maxColumnHeight = Math.max(...layerGroups.map((group) => group.height), systemNode?.height ?? 0, 0);
  let cursorX = left;

  if (systemNode) {
    positioned.set(systemNode.id, {
      x: cursorX,
      y: top + Math.max((maxColumnHeight - systemNode.height) / 2, 0)
    });
    cursorX += systemNode.width + systemGap;
  }

  for (const group of layerGroups) {
    const layerX = cursorX + (group.width - group.layerNode.width) / 2;
    positioned.set(group.layerNode.id, {
      x: layerX,
      y: top
    });

    let cursorY = top + group.layerNode.height + layerToFeatureGap;
    for (const featureGroup of group.featureGroups) {
      const featureX = cursorX + (group.width - featureGroup.width) / 2;
      positioned.set(featureGroup.feature.id, {
        x: featureX,
        y: cursorY
      });

      let roleY = cursorY + featureGroup.feature.height + roleGap;
      for (const roleNode of featureGroup.roleNodes) {
        positioned.set(roleNode.id, {
          x: featureX + roleIndent,
          y: roleY
        });
        roleY += roleNode.height + roleGap;
      }

      cursorY += featureGroup.height + featureGap;
    }

    cursorX += group.width + columnGap;
  }

  positionOverflowNodes(view, positioned, cursorX + columnGap, top, roleGap);
  return applyPositions(view, positioned, "Layer column architecture layout");
}

function layoutWholeArchitectureLayerRows(view: GraphViewModel): GraphViewModel {
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

  positionOverflowNodes(view, positioned, column.overflow, top, roleGap);

  return applyPositions(view, positioned, "Layer row architecture layout");
}

function positionOverflowNodes(
  view: GraphViewModel,
  positioned: Map<string, { x: number; y: number }>,
  x: number,
  top: number,
  gap: number
): void {
  let overflowY = top;
  for (const node of view.nodes) {
    if (positioned.has(node.id)) {
      continue;
    }
    positioned.set(node.id, {
      x,
      y: overflowY
    });
    overflowY += node.height + gap;
  }
}

function applyPositions(
  view: GraphViewModel,
  positioned: ReadonlyMap<string, { x: number; y: number }>,
  layoutName: string
): GraphViewModel {
  return {
    ...view,
    nodes: view.nodes.map((node) => {
      const position = positioned.get(node.id);
      if (!position) {
        throw new Error(`${layoutName} did not position graph node ${node.id}.`);
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
