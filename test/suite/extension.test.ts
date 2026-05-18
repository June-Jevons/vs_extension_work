import * as assert from "assert";
import { createMockDashboardState } from "../../src/mockData/mockDashboardState";
import { DashboardMode } from "../../src/webview/dashboardState";
import { isWebviewToExtensionMessage } from "../../src/webview/messageProtocol";
import { renderDashboardShell } from "../../src/webview/renderers";

const commonTestIds = [
  "dashboard-root",
  "workspace-diagnostics-panel",
  "mode-liveChanges",
  "mode-wholeArchitecture",
  "mode-featureFocus",
  "mode-diffSinceBaseline"
];

const requiredByMode: Record<DashboardMode, string[]> = {
  liveChanges: [
    "current-change-area",
    "risk-card-high",
    "risk-card-medium",
    "risk-card-low",
    "architecture-impact-graph",
    "changed-files-table",
    "dependency-graph",
    "validation-status-row"
  ],
  wholeArchitecture: [
    "whole-architecture-diagram",
    "architecture-overview-cards",
    "architecture-health-cards"
  ],
  featureFocus: [
    "feature-selector",
    "module-composition-panel",
    "internal-dependency-graph",
    "related-external-dependencies",
    "related-tests"
  ],
  diffSinceBaseline: [
    "baseline-selector",
    "baseline-summary-cards",
    "before-after-graph",
    "top-changes-table",
    "structural-timeline"
  ]
};

for (const mode of Object.keys(requiredByMode) as DashboardMode[]) {
  const state = createMockDashboardState(mode);
  const html = renderDashboardShell(state);
  const requiredIds = [...commonTestIds, ...requiredByMode[mode]];

  for (const testId of requiredIds) {
    assert.ok(html.includes(`data-testid="${testId}"`), `${mode} is missing ${testId}`);
  }

  assert.ok(html.includes("<svg"), `${mode} should include graph SVG markup`);
  assert.ok(!html.trim().startsWith("#"), `${mode} should not render raw Markdown`);
  assert.ok(!html.trim().startsWith("{"), `${mode} should not render raw JSON`);
}

assert.ok(isWebviewToExtensionMessage({ type: "ready" }));
assert.ok(isWebviewToExtensionMessage({ type: "setMode", mode: "featureFocus" }));
assert.ok(isWebviewToExtensionMessage({ type: "selectFeature", featureId: "motion-planning" }));
assert.ok(isWebviewToExtensionMessage({ type: "configure" }));
assert.ok(isWebviewToExtensionMessage({ type: "focusTimeline", available: false }));
assert.ok(!isWebviewToExtensionMessage({ type: "setMode", mode: "scanner" }));
assert.ok(!isWebviewToExtensionMessage({ type: "selectFeature", featureId: "" }));

const liveState = createMockDashboardState("wholeArchitecture");
const liveHtml = renderDashboardShell({
  ...liveState,
  isMockData: false,
  diagnostics: {
    ...liveState.diagnostics,
    stateSource: "real",
    fallbackReason: undefined,
    gitStatusSource: "CLI fallback",
    scannerStatus: "findFiles"
  }
});
assert.ok(!liveHtml.includes("Mock validation state"), "dashboard should not contain the retired static subtitle");
assert.ok(liveHtml.includes("Live workspace data"), "live state should identify live workspace data");
assert.ok(!/\bmock\b/i.test(liveHtml), "live dashboard HTML should not contain mock wording");

console.log("Unit renderer and message protocol checks passed.");
