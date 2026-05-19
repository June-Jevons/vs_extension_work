import * as assert from "assert";
import { createMockDashboardState } from "../../src/mockData/mockDashboardState";
import { DashboardMode, DashboardState, ModuleNode } from "../../src/webview/dashboardState";
import { isExtensionToWebviewMessage, isWebviewToExtensionMessage } from "../../src/webview/messageProtocol";
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
assert.ok(isWebviewToExtensionMessage({ type: "selectionState", active: true }));
assert.ok(!isWebviewToExtensionMessage({ type: "setMode", mode: "scanner" }));
assert.ok(!isWebviewToExtensionMessage({ type: "selectFeature", featureId: "" }));
assert.ok(isExtensionToWebviewMessage({ type: "state", state: createMockDashboardState() }));
assert.ok(isExtensionToWebviewMessage({ type: "error", message: "Bundle missing." }));
assert.ok(isExtensionToWebviewMessage({ type: "loading", message: "Refreshing." }));
assert.ok(!isExtensionToWebviewMessage({ type: "state", state: undefined }));
assert.ok(!isExtensionToWebviewMessage({ type: "error", message: "" }));

const liveState = createRealDashboardState("wholeArchitecture");
const liveHtml = renderDashboardShell(liveState);
assert.ok(!liveHtml.includes("Mock validation state"), "dashboard should not contain the retired static subtitle");
assert.ok(liveHtml.includes("Live workspace data"), "live state should identify live workspace data");
assert.ok(liveHtml.includes("<strong>Mock data:</strong>false"), "live diagnostics should explicitly report Mock data: false");
assert.ok(!/\bmock\b(?! data:<\/strong>false)/i.test(liveHtml), "live dashboard HTML should only contain mock wording in the explicit Mock data: false field");
assert.ok(!liveHtml.includes("Unmapped / Unknown"), "live dashboard should use Unclassified Modules wording");
for (const sampleNode of ["runtime-config", "operator-launcher", "tests-config-scanner", "launcher-subprocess-env", "ros-launch-runtime"]) {
  assert.ok(!liveHtml.includes(sampleNode), `live real-state render should not leak mock sample node ${sampleNode}`);
}
for (const retiredMetric of ["Main GUI", "ROS2 Nodes", "CLI Tools", "Launch Files"]) {
  assert.ok(!liveHtml.includes(retiredMetric), `live real-state render should not include hardcoded metric ${retiredMetric}`);
}
assert.ok(liveHtml.includes("<strong>Python files:</strong>"), "diagnostics should use clear Python files label");
assert.ok(liveHtml.includes("<strong>Changed files:</strong>"), "diagnostics should use clear Changed files label");
assert.ok(liveHtml.includes("<strong>Git status source:</strong>"), "diagnostics should use clear Git status source label");
assert.ok(liveHtml.includes("<strong>Path type:</strong>"), "diagnostics should use clear Path type label");
assert.ok(liveHtml.includes("<strong>Top unclassified paths:</strong>"), "diagnostics should include top unclassified paths");
assert.ok(liveHtml.includes("src/misc/legacy_loader.py"), "small unclassified module sets should show real module paths");
const liveChangesHtml = renderDashboardShell(createRealDashboardState("liveChanges"));
assert.ok(liveChangesHtml.includes("Motion module changed."), "changed files table should render real changed-file reasons");

const featureFocusHtml = renderDashboardShell(createRealDashboardState("featureFocus", "motion-planning"));
const compositionPanel = extractTestId(featureFocusHtml, "module-composition-panel");
const relatedTestsPanel = extractTestId(featureFocusHtml, "related-tests");
assert.ok(compositionPanel.includes("box_motion"), "Motion Planning runtime composition should include runtime motion modules");
assert.ok(!compositionPanel.includes("test_motion_program"), "Motion Planning runtime composition must not include test modules");
assert.ok(!compositionPanel.includes("test_box_motion_auto_generate"), "Motion Planning runtime composition must not include related tests");
assert.ok(relatedTestsPanel.includes("tests/test_motion_program.py"), "Motion Planning related tests should include motion test by import/path relationship");
assert.ok(relatedTestsPanel.includes("tests/test_box_motion_auto_generate.py"), "box motion test should appear as a related test");
assert.ok(!relatedTestsPanel.includes("tests/test_config_loader.py"), "unrelated tests should not be selected globally");

console.log("Unit renderer and message protocol checks passed.");

function createRealDashboardState(mode: DashboardMode, selectedFeatureId = "motion-planning"): DashboardState {
  const capturedAtIso = "2026-05-19T02:00:00+08:00";
  const modules: ModuleNode[] = [
    moduleNode("src/motion/box_motion", "box_motion", "src/motion/box_motion.py", "motion-planning", ["src/safety/collision_guard"], ["src/gui/motion_panel", "tests/test_motion_program"], false),
    moduleNode("src/safety/collision_guard", "collision_guard", "src/safety/collision_guard.py", "safety-layer", [], ["src/motion/box_motion"], false),
    moduleNode("src/gui/motion_panel", "motion_panel", "src/gui/motion_panel.py", "gui-layer", ["src/motion/box_motion"], [], false),
    moduleNode("src/config/runtime_config", "runtime_config", "src/config/runtime_config.py", "config-system", [], [], false),
    moduleNode("tests/test_motion_program", "test_motion_program", "tests/test_motion_program.py", "tests", ["src/motion/box_motion"], [], true),
    moduleNode("tests/test_box_motion_auto_generate", "test_box_motion_auto_generate", "tests/test_box_motion_auto_generate.py", "tests", [], [], true),
    moduleNode("tests/test_config_loader", "test_config_loader", "tests/test_config_loader.py", "tests", ["src/config/runtime_config"], [], true),
    moduleNode("src/misc/legacy_loader", "legacy_loader", "src/misc/legacy_loader.py", "unmapped-unknown", [], [], false)
  ];
  const dependencies = [
    { from: "src/motion/box_motion", to: "src/safety/collision_guard", kind: "import" as const, confidence: "high" as const },
    { from: "src/gui/motion_panel", to: "src/motion/box_motion", kind: "import" as const, confidence: "high" as const },
    { from: "tests/test_motion_program", to: "src/motion/box_motion", kind: "test" as const, confidence: "high" as const },
    { from: "tests/test_config_loader", to: "src/config/runtime_config", kind: "test" as const, confidence: "high" as const }
  ];
  const featureBlocks = [
    featureBlock("motion-planning", "Motion Planning", ["src/motion/box_motion"], 1, 1),
    featureBlock("safety-layer", "Safety Layer", ["src/safety/collision_guard"], 1, 0),
    featureBlock("gui-layer", "GUI Layer", ["src/gui/motion_panel"], 0, 1),
    featureBlock("config-system", "Config System", ["src/config/runtime_config"], 1, 0),
    featureBlock("tests", "Tests", ["tests/test_motion_program", "tests/test_box_motion_auto_generate", "tests/test_config_loader"], 0, 2),
    featureBlock("unmapped-unknown", "Unclassified Modules", ["src/misc/legacy_loader"], 0, 0, "1 unclassified module. Sample: src/misc/legacy_loader.py")
  ];

  return {
    mode,
    workspace: {
      name: "RealFixture",
      rootUri: "file:///real-fixture",
      isDirty: true,
      lastUpdatedIso: capturedAtIso,
      autoRefresh: true
    },
    snapshot: {
      workspaceKey: "workspace:real-fixture",
      workspaceName: "RealFixture",
      rootUri: "file:///real-fixture",
      capturedAtIso,
      git: {
        branch: "main",
        changedFileCount: 1,
        ahead: 0,
        behind: 0
      },
      modules,
      dependencies,
      featureBlocks,
      changedFiles: [
        {
          path: "src/motion/box_motion.py",
          status: "modified",
          featureId: "motion-planning",
          moduleId: "src/motion/box_motion",
          riskLevel: "high",
          reason: "Motion module changed.",
          lastChangedIso: capturedAtIso
        }
      ],
      impactedFeatures: [
        {
          featureId: "motion-planning",
          label: "Motion Planning",
          moduleCount: 1,
          changedFileCount: 1,
          riskLevel: "high",
          reason: "Feature contains changed files."
        },
        {
          featureId: "safety-layer",
          label: "Safety Layer",
          moduleCount: 1,
          changedFileCount: 0,
          riskLevel: "medium",
          reason: "Connected through imports."
        }
      ],
      risks: [
        {
          id: "high",
          label: "High",
          level: "high",
          count: 1,
          detail: "Motion module changed."
        }
      ],
      health: {
        totalPythonFiles: modules.length,
        totalModules: modules.length,
        totalClasses: 0,
        totalFunctions: 0,
        circularDependencyCount: 0,
        highRiskModuleCount: 1,
        orphanModuleCount: 1,
        estimatedTestCoverage: 60
      },
      validations: []
    },
    selectedFeatureId,
    diagnostics: {
      rootUri: "file:///real-fixture",
      workspaceFsPath: "/tmp/real-fixture",
      pathKind: "linux-native",
      stateSource: "real",
      pythonFileCount: modules.length,
      moduleCount: modules.length,
      dependencyCount: dependencies.length,
      graphNodeCount: featureBlocks.length,
      graphEdgeCount: 4,
      unmappedModuleCount: 1,
      unclassifiedModulePaths: ["src/misc/legacy_loader.py"],
      unclassifiedReasonCounts: [{ reason: "no-strong-import-neighbor-inference", count: 1 }],
      testModuleCount: 3,
      runtimeModuleCount: 5,
      parsedImportStatementCount: 4,
      resolvedLocalEdgeCount: 4,
      unresolvedImportCount: 0,
      changedFileCount: 1,
      gitBranch: "main",
      gitStatusSource: "CLI fallback",
      scannerStatus: "findFiles",
      discoveredFileCount: modules.length,
      lastUpdatedIso: capturedAtIso
    },
    isMockData: false,
    isLoading: false
  };
}

function moduleNode(
  id: string,
  name: string,
  path: string,
  featureId: string,
  imports: string[],
  importedBy: string[],
  isTest: boolean
): ModuleNode {
  return {
    id,
    name,
    path,
    language: "python",
    packageName: id.replaceAll("/", "."),
    featureId,
    imports,
    importedBy,
    isEntryPoint: false,
    isTest,
    isOrphan: importedBy.length === 0,
    riskLevel: isTest ? "low" : "medium"
  };
}

function featureBlock(
  id: string,
  label: string,
  moduleIds: string[],
  incomingEdges: number,
  outgoingEdges: number,
  description = `${label} fixture feature.`
): DashboardState["snapshot"]["featureBlocks"][number] {
  return {
    id,
    label,
    description,
    pathPatterns: [],
    moduleIds,
    incomingEdges,
    outgoingEdges,
    changedFileCount: 0,
    riskLevel: id === "motion-planning" ? "high" : "medium"
  };
}

function extractTestId(html: string, testId: string): string {
  const marker = `data-testid="${testId}"`;
  const start = html.indexOf(marker);
  assert.ok(start >= 0, `${testId} should exist`);
  const nextSection = html.indexOf("data-testid=", start + marker.length);
  return html.slice(start, nextSection > start ? nextSection : undefined);
}
