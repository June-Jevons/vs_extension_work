import * as assert from "assert";
import { createMockDashboardState } from "../../src/mockData/mockDashboardState";
import { dashboardModes } from "../../src/webview/dashboardState";

for (const mode of dashboardModes) {
  const state = createMockDashboardState(mode);
  assert.strictEqual(state.mode, mode);
  assert.strictEqual(state.isMockData, true);
  assert.ok(state.ui.changedFiles.length >= 6);
  assert.ok(state.ui.featureBlocks.length >= 8);
  assert.ok(state.ui.liveImpactGraph.nodes.length >= 5);
}

const featureState = createMockDashboardState("featureFocus", "motion-planning");
assert.strictEqual(featureState.selectedFeatureId, "motion-planning");
assert.ok(featureState.ui.featureDetail.relatedTests.length >= 4);

const diffState = createMockDashboardState("diffSinceBaseline");
assert.ok(diffState.baselineDiff);
assert.strictEqual(diffState.ui.diffSummaryCards.length, 5);

console.log("Mock dashboard state tests passed.");
