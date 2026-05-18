import * as assert from "assert";
import { buildGraphDiff } from "../../src/graph/graphDiff";
import { WorkspaceSnapshot } from "../../src/webview/dashboardState";

const baseline = snapshot("2024-05-15T00:00:00.000Z", ["a"], []);
const current = snapshot("2024-05-20T00:00:00.000Z", ["a", "b"], [{ from: "b", to: "a", kind: "import", confidence: "high" }]);
const diff = buildGraphDiff(baseline, current);

assert.strictEqual(diff.addedModules.length, 1);
assert.strictEqual(diff.addedModules[0]?.id, "b");
assert.strictEqual(diff.addedEdges.length, 1);
assert.strictEqual(diff.removedModules.length, 0);

function snapshot(
  capturedAtIso: string,
  moduleIds: string[],
  dependencies: WorkspaceSnapshot["dependencies"]
): WorkspaceSnapshot {
  return {
    workspaceKey: "workspace:test",
    workspaceName: "Test",
    rootUri: "file:///test",
    capturedAtIso,
    modules: moduleIds.map((id) => ({
      id,
      name: id,
      path: `${id}.py`,
      language: "python",
      featureId: "unmapped-unknown",
      imports: [],
      importedBy: [],
      isEntryPoint: false,
      isTest: false,
      isOrphan: true,
      riskLevel: "low"
    })),
    dependencies,
    featureBlocks: [
      {
        id: "unmapped-unknown",
        label: "Unclassified Modules",
        description: "Unclassified fixture module.",
        pathPatterns: [],
        moduleIds,
        incomingEdges: 0,
        outgoingEdges: 0,
        changedFileCount: 0,
        riskLevel: "low"
      }
    ],
    changedFiles: [],
    impactedFeatures: [],
    risks: [],
    health: {
      totalPythonFiles: moduleIds.length,
      totalModules: moduleIds.length,
      totalClasses: 0,
      totalFunctions: 0,
      circularDependencyCount: 0,
      highRiskModuleCount: 0,
      orphanModuleCount: moduleIds.length,
      estimatedTestCoverage: 0
    },
    validations: []
  };
}
