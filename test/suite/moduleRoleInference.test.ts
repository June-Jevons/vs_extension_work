import * as assert from "assert";
import { DependencyEdge, ModuleNode } from "../../src/webview/dashboardState";
import { inferModuleRole } from "../../src/webview/moduleRoleInference";
import { getSemanticFeatureDefinition } from "../../src/webview/semanticArchitectureModel";

const dependencies: DependencyEdge[] = [];
const semanticDefinition = getSemanticFeatureDefinition("motion-planning");

assert.strictEqual(inferModuleRole(moduleNode("tests/test_motion", "test_motion", "tests/test_motion.py", true), dependencies, semanticDefinition), undefined);
assert.strictEqual(inferModuleRole(moduleNode("src/main", "main", "src/main.py"), dependencies, semanticDefinition)?.role, "entrypoint");
assert.strictEqual(inferModuleRole(moduleNode("src/config/settings", "settings", "src/config/settings.py"), dependencies, semanticDefinition)?.role, "config");
assert.strictEqual(inferModuleRole(moduleNode("src/robot/rws_client", "rws_client", "src/robot/rws_client.py"), dependencies, semanticDefinition)?.role, "adapter");
assert.strictEqual(inferModuleRole(moduleNode("src/safety/collision_guard", "collision_guard", "src/safety/collision_guard.py"), dependencies, semanticDefinition)?.role, "safety");
assert.strictEqual(inferModuleRole(moduleNode("src/motion/movej_builder", "movej_builder", "src/motion/movej_builder.py"), dependencies, semanticDefinition)?.role, "motion-builder");
assert.strictEqual(inferModuleRole(moduleNode("src/task/job_runner", "job_runner", "src/task/job_runner.py"), dependencies, semanticDefinition)?.role, "orchestrator");
assert.strictEqual(inferModuleRole(moduleNode("src/gui/motion_panel", "motion_panel", "src/gui/motion_panel.py"), dependencies, semanticDefinition)?.role, "gui");
assert.strictEqual(inferModuleRole(moduleNode("src/common/transform_math", "transform_math", "src/common/transform_math.py"), dependencies, semanticDefinition)?.role, "utility");

const unknown = inferModuleRole(moduleNode("src/misc/legacy", "legacy", "src/misc/legacy.py"), dependencies, semanticDefinition);
assert.strictEqual(unknown?.role, "unclassified");
assert.strictEqual(unknown?.confidence, "low");

console.log("Module role inference checks passed.");

function moduleNode(
  id: string,
  name: string,
  modulePath: string,
  isTest = false
): ModuleNode {
  return {
    id,
    name,
    path: modulePath,
    language: "python",
    imports: [],
    importedBy: [],
    isEntryPoint: false,
    isTest,
    isOrphan: false,
    riskLevel: "low"
  };
}
