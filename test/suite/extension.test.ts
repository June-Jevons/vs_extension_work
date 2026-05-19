import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { createMockDashboardState } from "../../src/mockData/mockDashboardState";
import { buildFeatureFocusViewModel } from "../../src/webview/featureFocusViewModel";
import { getGraphStatsForMode } from "../../src/webview/graphStats";
import { buildGraphViewForTarget, GraphViewTarget } from "../../src/webview/graphViewModel";
import {
  DashboardMode,
  DashboardState,
  DependencyEdge,
  FeatureBlock,
  ModuleNode,
  RiskItem,
  dashboardModes
} from "../../src/webview/dashboardState";
import { isExtensionToWebviewMessage, isWebviewToExtensionMessage } from "../../src/webview/messageProtocol";

const repositoryRoot = path.resolve(__dirname, "..", "..", "..");
const appSource = fs.readFileSync(path.join(repositoryRoot, "src", "webview-app", "App.tsx"), "utf8");

const requiredReactTestIds = [
  "dashboard-root",
  "workspace-diagnostics-panel",
  "current-change-area",
  "architecture-impact-graph",
  "changed-files-table",
  "dependency-graph",
  "validation-status-row",
  "whole-architecture-diagram",
  "architecture-overview-cards",
  "architecture-health-cards",
  "feature-selector",
  "runtime-flow-summary",
  "module-composition-panel",
  "internal-dependency-graph",
  "related-external-dependencies",
  "unclassified-runtime-modules",
  "baseline-selector",
  "baseline-summary-cards",
  "before-after-graph",
  "top-changes-table",
  "structural-timeline"
];

for (const testId of requiredReactTestIds) {
  assert.ok(appSource.includes(`"${testId}"`), `React dashboard source is missing data-testid ${testId}`);
}
assert.ok(appSource.includes("dashboardModes.map"), "React dashboard should render mode tabs from the shared mode list");
assert.ok(appSource.includes("mode-${mode}"), "React dashboard should expose stable mode tab test ids");
assert.ok(appSource.includes("risk-card-${level}"), "React dashboard should expose stable risk card test ids");

const graphTargetsByMode: Record<DashboardMode, GraphViewTarget[]> = {
  liveChanges: ["liveImpact", "liveDependency"],
  wholeArchitecture: ["wholeArchitecture"],
  featureFocus: ["featureInternal"],
  diffSinceBaseline: ["baselineDiff"]
};

for (const mode of dashboardModes) {
  const state = createMockDashboardState(mode);
  const graphStats = getGraphStatsForMode(state);
  assert.ok(graphStats.nodes > 0, `${mode} should expose graph nodes for React Flow`);

  for (const target of graphTargetsByMode[mode]) {
    const view = buildGraphViewForTarget(state, target, state.selectedFeatureId);
    assert.strictEqual(view.target, target);
    assert.ok(view.nodes.length > 0, `${mode}/${target} should include nodes`);
    for (const node of view.nodes) {
      assert.strictEqual(Number.isFinite(node.width), true, `${node.id} should have a finite width`);
      assert.strictEqual(Number.isFinite(node.height), true, `${node.id} should have a finite height`);
    }
  }
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

const liveState = createRealDashboardState("featureFocus", "motion-planning");
assert.strictEqual(liveState.isMockData, false);
assert.strictEqual(liveState.diagnostics.stateSource, "real");
assert.strictEqual(liveState.diagnostics.pathKind, "linux-native");
assert.strictEqual(liveState.diagnostics.gitStatusSource, "unavailable");
assert.strictEqual(liveState.diagnostics.scannerStatus, "vscodeFindFiles");

const focusView = buildFeatureFocusViewModel(liveState, "motion-planning");
assert.deepStrictEqual(focusView.runtimeModules.map((moduleNode) => moduleNode.id), ["src/motion/box_motion"]);
assert.ok(focusView.roleGroups.length > 0, "Feature focus should group runtime modules by inferred role");
assert.ok(focusView.runtimeModules.every((moduleNode) => !moduleNode.isTest), "Feature focus should only expose runtime modules");

const focusGraph = buildGraphViewForTarget(liveState, "featureInternal", "motion-planning");
assert.ok(focusGraph.nodes.some((node) => /Motion Builder|Validation|Output/.test(node.label)));
assert.ok(!JSON.stringify(focusGraph).toLowerCase().includes("test"), "Feature internal graph should keep inspected workspace tests out of runtime composition");

for (const sampleNode of ["runtime-config", "operator-launcher", "tests-config-scanner", "launcher-subprocess-env", "ros-launch-runtime"]) {
  assert.ok(!JSON.stringify(liveState).includes(sampleNode), `live real-state fixture should not leak mock sample node ${sampleNode}`);
}

console.log("React dashboard contract and message protocol checks passed.");

function createRealDashboardState(mode: DashboardMode, selectedFeatureId = "motion-planning"): DashboardState {
  const capturedAtIso = "2026-05-19T02:00:00+08:00";
  const modules: ModuleNode[] = [
    moduleNode("src/motion/box_motion", "box_motion", "src/motion/box_motion.py", "motion-planning", ["src/safety/collision_guard"], ["src/gui/motion_panel", "tests/test_motion_program", "tests/test_box_motion_auto_generate"], false, "high"),
    moduleNode("src/safety/collision_guard", "collision_guard", "src/safety/collision_guard.py", "safety-layer", [], ["src/motion/box_motion"], false, "medium"),
    moduleNode("src/gui/motion_panel", "motion_panel", "src/gui/motion_panel.py", "gui-layer", ["src/motion/box_motion"], [], false, "medium"),
    moduleNode("src/misc/legacy_loader", "legacy_loader", "src/misc/legacy_loader.py", "unmapped-unknown", [], [], false, "low")
  ];
  const dependencies: DependencyEdge[] = [
    edge("src/motion/box_motion", "src/safety/collision_guard"),
    edge("src/gui/motion_panel", "src/motion/box_motion")
  ];
  const featureBlocks: FeatureBlock[] = [
    featureBlock("motion-planning", "Motion Planning", ["src/motion/box_motion"], 1, 1),
    featureBlock("safety-layer", "Safety Layer", ["src/safety/collision_guard"], 1, 0),
    featureBlock("gui-layer", "GUI Layer", ["src/gui/motion_panel"], 0, 1),
    featureBlock("unmapped-unknown", "Unclassified Modules", ["src/misc/legacy_loader"], 0, 0)
  ];
  const risks: RiskItem[] = [
    {
      id: "high",
      label: "High",
      level: "high",
      count: 1,
      detail: "Motion module changed."
    }
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
      git: undefined,
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
        }
      ],
      risks,
      health: {
        totalPythonFiles: modules.length,
        totalModules: modules.length,
        totalClasses: 0,
        totalFunctions: 0,
        circularDependencyCount: 0,
        highRiskModuleCount: 1,
        orphanModuleCount: 1,
        estimatedTestCoverage: 0
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
      testModuleCount: 0,
      runtimeModuleCount: 4,
      parsedImportStatementCount: dependencies.length,
      resolvedLocalEdgeCount: dependencies.length,
      unresolvedImportCount: 0,
      changedFileCount: 1,
      gitBranch: "unknown",
      gitStatusSource: "unavailable",
      scannerStatus: "vscodeFindFiles",
      discoveredFileCount: modules.length,
      analysisTimings: [],
      cache: {
        hitCount: 0,
        missCount: 0,
        invalidatedCount: 0,
        deletedCount: 0,
        entryCount: 0
      },
      incremental: false,
      changedPathCount: 0,
      workspaceIndexReason: "fixture full scan",
      lastUpdatedIso: capturedAtIso
    },
    isMockData: false,
    isLoading: false
  };
}

function moduleNode(
  id: string,
  name: string,
  modulePath: string,
  featureId: string,
  imports: string[],
  importedBy: string[],
  isTest: boolean,
  riskLevel: ModuleNode["riskLevel"]
): ModuleNode {
  return {
    id,
    name,
    path: modulePath,
    language: "python",
    packageName: id.replaceAll("/", "."),
    featureId,
    imports,
    importedBy,
    isEntryPoint: false,
    isTest,
    isOrphan: importedBy.length === 0,
    riskLevel
  };
}

function featureBlock(
  id: string,
  label: string,
  moduleIds: string[],
  incomingEdges: number,
  outgoingEdges: number
): FeatureBlock {
  return {
    id,
    label,
    description: `${label} fixture feature.`,
    pathPatterns: [],
    moduleIds,
    incomingEdges,
    outgoingEdges,
    changedFileCount: id === "motion-planning" ? 1 : 0,
    riskLevel: id === "motion-planning" ? "high" : "medium"
  };
}

function edge(
  from: string,
  to: string,
  kind: DependencyEdge["kind"] = "import"
): DependencyEdge {
  return {
    from,
    to,
    kind,
    confidence: "high"
  };
}
