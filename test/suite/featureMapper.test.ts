import * as assert from "assert";
import {
  buildFeatureBlocks,
  classifyFeatureForPath,
  inferFeatureFromImports,
  inferFeatureFromImportsDetailed,
  inferRuntimeFeatureForTestPath,
  mapFeatureForPath
} from "../../src/core/featureMapper";
import { ModuleNode } from "../../src/webview/dashboardState";

assert.strictEqual(mapFeatureForPath("src/gui/main_gui.py").id, "gui-layer");
assert.strictEqual(mapFeatureForPath("src/abb_motion/path_generator.py").id, "motion-planning");
assert.strictEqual(mapFeatureForPath("tests/config/test_runtime_config.py").id, "tests");
assert.strictEqual(mapFeatureForPath("tests/test_motion_program.py").id, "tests");
assert.strictEqual(inferRuntimeFeatureForTestPath("tests/test_motion_program.py")?.id, "motion-planning");
assert.strictEqual(inferRuntimeFeatureForTestPath("tests/test_box_motion_auto_generate.py")?.id, "motion-planning");
assert.strictEqual(mapFeatureForPath("notes/unknown.py").id, "unmapped-unknown");
assert.strictEqual(mapFeatureForPath("src/abb_config/settings.yaml").id, "config-system");
assert.strictEqual(mapFeatureForPath("src/abb_ros_bridge/runtime_node.py").id, "ros-bridge-runtime");
assert.strictEqual(mapFeatureForPath("src/operator_panel/views/motion_tab.py").id, "gui-layer");
assert.strictEqual(mapFeatureForPath("src/abb_operator_app/main.py").id, "gui-layer");
assert.strictEqual(mapFeatureForPath("src/abb_controller/rapid_client.py").id, "robot-io-layer");
assert.strictEqual(mapFeatureForPath("src/abb_gripper/control.py").id, "robot-io-layer");
assert.strictEqual(mapFeatureForPath("src/task_runner/job_sequence.py").id, "task-runner");
assert.strictEqual(mapFeatureForPath("src/common/transform_math.py").id, "utils-common");
assert.strictEqual(mapFeatureForPath("src/abb_boxes/geometry.py").id, "motion-planning");
assert.strictEqual(mapFeatureForPath("src/abb_platform/mesh.py").id, "ros-bridge-runtime");
assert.strictEqual(mapFeatureForPath("docs/architecture.md").id, "docs");
assert.strictEqual(mapFeatureForPath("src/abb_common/paths.py").id, "utils-common");
assert.strictEqual(classifyFeatureForPath("src/misc/legacy_loader.py").reason.category, "no-path-pattern-match");

const modules: ModuleNode[] = [
  moduleNode("a", "src/unknown/a.py", "unmapped-unknown", ["b"], []),
  moduleNode("b", "src/safety/zone.py", "safety-layer", [], ["a"]),
  moduleNode("c", "src/unknown/c.py", "unmapped-unknown", [], []),
  moduleNode("test-motion", "tests/test_motion_program.py", "motion-planning", ["runtime-motion"], [], true),
  moduleNode("runtime-motion", "src/motion/box_motion.py", "motion-planning", [], ["test-motion"])
];
const inferred = inferFeatureFromImports(modules[0]!, new Map(modules.map((item) => [item.id, item])));
assert.strictEqual(inferred.id, "safety-layer");
const weakInference = inferFeatureFromImportsDetailed(modules[2]!, new Map(modules.map((item) => [item.id, item])));
assert.strictEqual(weakInference.feature.id, "unmapped-unknown");
assert.strictEqual(weakInference.reason.category, "no-strong-import-neighbor-inference");

const blocks = buildFeatureBlocks(modules, [{ from: "a", to: "b", kind: "import", confidence: "high" }]);
assert.ok(!blocks.some((block) => block.id === "tests"), "test paths should remain internal and never produce a user-facing feature block");
assert.ok(blocks.some((block) => block.id === "safety-layer"));
const motionBlock = blocks.find((block) => block.id === "motion-planning");
assert.ok(motionBlock, "motion planning block should exist");
assert.ok(motionBlock.moduleIds.includes("runtime-motion"), "runtime motion module should be in Motion Planning");
assert.ok(!motionBlock.moduleIds.includes("test-motion"), "test modules must not be primary Motion Planning runtime modules");
const unknownBlocks = blocks.filter((block) => block.id === "unmapped-unknown");
assert.strictEqual(unknownBlocks.length, 1, "unclassified modules should share one internal feature block before graph rendering");
assert.strictEqual(unknownBlocks[0]?.label, "Unclassified Modules");
assert.ok(unknownBlocks[0]?.description.includes("src/unknown/c.py"), "unclassified block should include real module samples");

function moduleNode(
  id: string,
  path: string,
  featureId: string,
  imports: string[],
  importedBy: string[],
  isTest = false
): ModuleNode {
  return {
    id,
    name: id,
    path,
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
