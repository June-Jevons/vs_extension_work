import * as assert from "assert";
import { createMockDashboardState } from "../../src/mockData/mockDashboardState";
import { dashboardModes } from "../../src/webview/dashboardState";
import { buildGraphViewForTarget, GraphViewTarget } from "../../src/webview/graphViewModel";

const state = createMockDashboardState();

const targets: GraphViewTarget[] = [
  "liveImpact",
  "liveDependency",
  "wholeArchitecture",
  "featureInternal",
  "baselineDiff"
];

for (const target of targets) {
  const view = buildGraphViewForTarget(state, target);
  assert.ok(view.id.length > 0, `${target} should have an id`);
  assert.ok(view.title.length > 0, `${target} should have a title`);
  assert.ok(view.nodes.length > 0, `${target} should have nodes`);
  assert.ok(view.nodes.every((node) => node.width > 0 && node.height > 0), `${target} nodes should have stable dimensions`);

  const nodeIds = new Set(view.nodes.map((node) => node.id));
  assert.strictEqual(nodeIds.size, view.nodes.length, `${target} should not duplicate node ids`);
  for (const edge of view.edges) {
    assert.ok(nodeIds.has(edge.source), `${target} edge ${edge.id} should reference an existing source`);
    assert.ok(nodeIds.has(edge.target), `${target} edge ${edge.id} should reference an existing target`);
  }
}

for (const mode of dashboardModes) {
  const modeState = createMockDashboardState(mode);
  const target = mode === "liveChanges"
    ? "liveImpact"
    : mode === "wholeArchitecture"
      ? "wholeArchitecture"
      : mode === "featureFocus"
        ? "featureInternal"
        : "baselineDiff";
  const view = buildGraphViewForTarget(modeState, target);
  assert.ok(view.nodes.length > 0, `${mode} should produce graph nodes`);
}

console.log("Graph view model checks passed.");
