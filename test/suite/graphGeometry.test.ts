import * as assert from "assert";
import { createMockDashboardState } from "../../src/mockData/mockDashboardState";
import { layoutGraphWithElk } from "../../src/webview/elkLayout";
import { buildGraphViewForTarget, GraphViewModel, GraphViewNode } from "../../src/webview/graphViewModel";

void run()
  .then(() => {
    console.log("Graph geometry checks passed.");
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });

async function run(): Promise<void> {
  const view = buildGraphViewForTarget(createMockDashboardState("wholeArchitecture"), "wholeArchitecture");
  const layout = await layoutGraphWithElk(view);

  for (const node of layout.nodes) {
    assert.ok(Number.isFinite(node.x), `node ${node.id} should have finite x`);
    assert.ok(Number.isFinite(node.y), `node ${node.id} should have finite y`);
  }
  assertNoNodeOverlap(layout);
  assertWholeArchitectureLayerColumns(layout);
  assert.strictEqual(
    edgeSegmentCrossesUnrelatedNode(
      { id: "source", label: "Source", detail: "", kind: "module", width: 40, height: 40, x: 0, y: 20 },
      { id: "target", label: "Target", detail: "", kind: "module", width: 40, height: 40, x: 160, y: 20 },
      [{ id: "middle", label: "Middle", detail: "", kind: "module", width: 60, height: 60, x: 70, y: 10 }]
    ),
    true,
    "geometry guard should catch a straight edge through an unrelated node"
  );
}

function assertWholeArchitectureLayerColumns(view: GraphViewModel): void {
  const nodesById = new Map(view.nodes.map((node) => [node.id, node]));
  const layerNodes = view.nodes.filter((node) => node.kind === "layer").sort((left, right) => (left.y ?? 0) - (right.y ?? 0));
  assert.ok(layerNodes.length > 0, "whole architecture should expose layer lanes");

  for (let index = 1; index < layerNodes.length; index += 1) {
    const previous = layerNodes[index - 1]!;
    const current = layerNodes[index]!;
    assert.ok((current.y ?? 0) > (previous.y ?? 0), `layer ${current.id} should be below ${previous.id}`);
  }

  for (const edge of view.edges.filter((candidate) => candidate.semanticKind === "contains")) {
    const source = nodesById.get(edge.source);
    const target = nodesById.get(edge.target);
    if (!source || !target) {
      continue;
    }
    if (source.kind === "layer" && target.kind === "feature") {
      assert.ok((target.x ?? 0) > (source.x ?? 0) + source.width, `feature ${target.id} should sit to the right of layer ${source.id}`);
    }
    if (source.kind === "feature" && target.kind !== "feature") {
      assert.ok((target.x ?? 0) > (source.x ?? 0) + source.width, `role ${target.id} should sit to the right of feature ${source.id}`);
    }
  }
}

function assertNoNodeOverlap(view: GraphViewModel): void {
  for (let leftIndex = 0; leftIndex < view.nodes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < view.nodes.length; rightIndex += 1) {
      const left = view.nodes[leftIndex]!;
      const right = view.nodes[rightIndex]!;
      assert.ok(!rectanglesOverlap(left, right), `nodes ${left.id} and ${right.id} should not overlap`);
    }
  }
}

function rectanglesOverlap(left: GraphViewNode, right: GraphViewNode): boolean {
  const leftX = left.x ?? 0;
  const leftY = left.y ?? 0;
  const rightX = right.x ?? 0;
  const rightY = right.y ?? 0;
  return leftX < rightX + right.width
    && leftX + left.width > rightX
    && leftY < rightY + right.height
    && leftY + left.height > rightY;
}

function edgeSegmentCrossesUnrelatedNode(
  source: GraphViewNode,
  target: GraphViewNode,
  unrelatedNodes: GraphViewNode[]
): boolean {
  const start = center(source);
  const end = center(target);
  return unrelatedNodes.some((node) => segmentIntersectsRect(start, end, node));
}

function center(node: GraphViewNode): { x: number; y: number } {
  return {
    x: (node.x ?? 0) + node.width / 2,
    y: (node.y ?? 0) + node.height / 2
  };
}

function segmentIntersectsRect(
  start: { x: number; y: number },
  end: { x: number; y: number },
  rect: GraphViewNode
): boolean {
  const x = rect.x ?? 0;
  const y = rect.y ?? 0;
  const left = x;
  const right = x + rect.width;
  const top = y;
  const bottom = y + rect.height;

  if (pointInsideRect(start, left, right, top, bottom) || pointInsideRect(end, left, right, top, bottom)) {
    return true;
  }

  return segmentsIntersect(start, end, { x: left, y: top }, { x: right, y: top })
    || segmentsIntersect(start, end, { x: right, y: top }, { x: right, y: bottom })
    || segmentsIntersect(start, end, { x: right, y: bottom }, { x: left, y: bottom })
    || segmentsIntersect(start, end, { x: left, y: bottom }, { x: left, y: top });
}

function pointInsideRect(point: { x: number; y: number }, left: number, right: number, top: number, bottom: number): boolean {
  return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom;
}

function segmentsIntersect(
  firstStart: { x: number; y: number },
  firstEnd: { x: number; y: number },
  secondStart: { x: number; y: number },
  secondEnd: { x: number; y: number }
): boolean {
  const d1 = direction(secondStart, secondEnd, firstStart);
  const d2 = direction(secondStart, secondEnd, firstEnd);
  const d3 = direction(firstStart, firstEnd, secondStart);
  const d4 = direction(firstStart, firstEnd, secondEnd);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0))
    && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

function direction(
  first: { x: number; y: number },
  second: { x: number; y: number },
  third: { x: number; y: number }
): number {
  return ((third.x - first.x) * (second.y - first.y)) - ((second.x - first.x) * (third.y - first.y));
}
