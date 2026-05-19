import * as assert from "assert";
import { createMockDashboardState } from "../../src/mockData/mockDashboardState";
import { dashboardModes, DashboardState, DependencyEdge, FeatureBlock, ModuleNode } from "../../src/webview/dashboardState";
import { buildGraphViewForTarget, GraphViewModel, GraphViewTarget } from "../../src/webview/graphViewModel";

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
  assertGraphContract(view, target);
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

const whole = buildGraphViewForTarget(state, "wholeArchitecture");
assert.ok(whole.nodes.some((node) => node.kind === "system"), "Whole Architecture graph should contain a system node");
assert.ok(whole.nodes.some((node) => node.kind === "layer"), "Whole Architecture graph should contain layer nodes");
assert.ok(whole.nodes.some((node) => node.kind === "feature"), "Whole Architecture graph should contain feature nodes");
assert.ok(whole.nodes.some((node) => node.kind === "launch"), "Whole Architecture graph should contain ROS launch facts");
assert.ok(whole.nodes.some((node) => node.kind === "topic"), "Whole Architecture graph should contain ROS topic facts");
assert.ok(whole.nodes.some((node) => node.kind === "config"), "Whole Architecture graph should contain config facts");
assert.ok(whole.edges.some((edge) => edge.semanticKind === "launches"), "Whole Architecture graph should render launches relations");
assert.ok(whole.edges.some((edge) => edge.semanticKind === "usesConfig"), "Whole Architecture graph should render config usage relations");
assert.ok(!whole.nodes.some((node) => node.label === "Tests"), "Whole Architecture graph should not contain a Tests feature block");

const motionFocus = buildGraphViewForTarget(state, "featureInternal", "motion-planning");
assert.ok(motionFocus.nodes.some((node) => /Motion Builder/i.test(node.label)), "Motion focus graph should contain a motion builder step");
assert.ok(motionFocus.nodes.some((node) => /Validation/i.test(node.label)), "Motion focus graph should contain a validation step");
assert.ok(motionFocus.nodes.some((node) => /Output/i.test(node.label)), "Motion focus graph should contain an output step");

const guiFocus = buildGraphViewForTarget(state, "featureInternal", "gui-layer");
assert.ok(guiFocus.nodes.some((node) => /Operator Entry/i.test(node.label)), "GUI focus graph should contain an entry step");
assert.ok(guiFocus.nodes.some((node) => /View/i.test(node.label)), "GUI focus graph should contain a view step");
assert.ok(guiFocus.nodes.some((node) => /Dispatch/i.test(node.label)), "GUI focus graph should contain a dispatch step");
assert.ok(guiFocus.nodes.some((node) => /Status/i.test(node.label)), "GUI focus graph should contain a status step");

const mixedState = createMixedRuntimeAndTestState();
const mixedWhole = buildGraphViewForTarget(mixedState, "wholeArchitecture");
assertGraphContract(mixedWhole, "mixed whole architecture");
assert.ok(mixedWhole.nodes.some((node) => /Unclassified Runtime Modules/i.test(node.label)), "Low-confidence runtime modules should be explicitly represented");
assert.ok(!JSON.stringify(mixedWhole).toLowerCase().includes("test"), "Whole Architecture graph should exclude test modules and edges");

const mixedFocus = buildGraphViewForTarget(mixedState, "featureInternal", "unmapped-unknown");
assertGraphContract(mixedFocus, "mixed feature focus");
assert.ok(mixedFocus.nodes.some((node) => /Unclassified Runtime Modules/i.test(node.label)), "Feature Focus should explicitly represent unclassified runtime modules");
assert.ok(!JSON.stringify(mixedFocus).toLowerCase().includes("test"), "Feature Focus graph should exclude test modules and edges");

console.log("Graph view model checks passed.");

function assertGraphContract(view: GraphViewModel, label: string): void {
  assert.ok(view.id.length > 0, `${label} should have an id`);
  assert.ok(view.title.length > 0, `${label} should have a title`);
  assert.ok(view.nodes.length > 0, `${label} should have nodes`);
  assert.ok(view.nodes.every((node) => node.width > 0 && node.height > 0), `${label} nodes should have stable dimensions`);
  assert.ok(view.nodes.every((node) => !node.id.toLowerCase().includes("test")), `${label} node ids should not expose tests`);
  assert.ok(view.nodes.every((node) => !node.label.toLowerCase().includes("test")), `${label} node labels should not expose tests`);
  assert.ok(view.edges.every((edge) => edge.kind !== "test"), `${label} edges should not expose test edge kind`);

  const nodeIds = new Set(view.nodes.map((node) => node.id));
  assert.strictEqual(nodeIds.size, view.nodes.length, `${label} should not duplicate node ids`);
  for (const edge of view.edges) {
    assert.ok(nodeIds.has(edge.source), `${label} edge ${edge.id} should reference an existing source`);
    assert.ok(nodeIds.has(edge.target), `${label} edge ${edge.id} should reference an existing target`);
  }
}

function createMixedRuntimeAndTestState(): DashboardState {
  const base = createMockDashboardState("featureFocus", "unmapped-unknown");
  const runtimeUnknown = moduleNode("src/misc/runtime_probe", "runtime_probe", "src/misc/runtime_probe.py", "unmapped-unknown", [], [], false);
  const hiddenTest = moduleNode("tests/test_runtime_probe", "test_runtime_probe", "tests/test_runtime_probe.py", "tests", ["src/misc/runtime_probe"], [], true);
  const unknownFeature: FeatureBlock = {
    id: "unmapped-unknown",
    label: "Unclassified Modules",
    description: "Runtime modules that need explicit classification.",
    pathPatterns: [],
    moduleIds: [runtimeUnknown.id, hiddenTest.id],
    incomingEdges: 0,
    outgoingEdges: 0,
    changedFileCount: 0,
    riskLevel: "medium"
  };
  const hiddenTestFeature: FeatureBlock = {
    id: "tests",
    label: "Tests",
    description: "Hidden fixture test feature.",
    pathPatterns: [],
    moduleIds: [hiddenTest.id],
    incomingEdges: 0,
    outgoingEdges: 1,
    changedFileCount: 0,
    riskLevel: "low"
  };
  const dependencies: DependencyEdge[] = [
    ...base.snapshot.dependencies,
    {
      from: hiddenTest.id,
      to: runtimeUnknown.id,
      kind: "test",
      confidence: "high"
    }
  ];

  return {
    ...base,
    selectedFeatureId: "unmapped-unknown",
    snapshot: {
      ...base.snapshot,
      modules: [...base.snapshot.modules, runtimeUnknown, hiddenTest],
      dependencies,
      featureBlocks: [...base.snapshot.featureBlocks, unknownFeature, hiddenTestFeature]
    }
  };
}

function moduleNode(
  id: string,
  name: string,
  modulePath: string,
  featureId: string,
  imports: string[],
  importedBy: string[],
  isTest: boolean
): ModuleNode {
  return {
    id,
    name,
    path: modulePath,
    language: "python",
    featureId,
    imports,
    importedBy,
    isEntryPoint: false,
    isTest,
    isOrphan: importedBy.length === 0,
    riskLevel: "low"
  };
}
