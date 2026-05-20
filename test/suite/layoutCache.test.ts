import * as assert from "assert";
import { GraphViewModel, GraphViewNode } from "../../src/webview/graphViewModel";
import { getCachedLayout, storeCachedLayout } from "../../src/webview-app/layoutCache";

const node: GraphViewNode = {
  id: "feature:live-cache-test",
  label: "Old label",
  detail: "Old detail",
  kind: "feature",
  width: 220,
  height: 120,
  riskLevel: "low"
};

const laidOut: GraphViewModel = {
  id: "live-cache-test",
  title: "Live Cache Test",
  description: "Cache should preserve positions only.",
  target: "liveImpact",
  nodes: [
    {
      ...node,
      x: 144,
      y: 233,
      emphasis: "changed"
    }
  ],
  edges: []
};

storeCachedLayout(laidOut, "layered");

const current: GraphViewModel = {
  ...laidOut,
  nodes: [
    {
      ...node,
      label: "New label",
      detail: "New detail",
      changedFileCount: 2,
      emphasis: "active"
    }
  ]
};

const cached = getCachedLayout(current, "layered");
assert.ok(cached, "Layout cache should return a cached graph for matching topology");
assert.strictEqual(cached.nodes[0]?.x, 144);
assert.strictEqual(cached.nodes[0]?.y, 233);
assert.strictEqual(cached.nodes[0]?.label, "New label");
assert.strictEqual(cached.nodes[0]?.detail, "New detail");
assert.strictEqual(cached.nodes[0]?.changedFileCount, 2);
assert.strictEqual(cached.nodes[0]?.emphasis, "active");

console.log("Layout cache refresh checks passed.");
