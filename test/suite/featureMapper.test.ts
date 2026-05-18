import * as assert from "assert";
import {
  buildFeatureBlocks,
  inferFeatureFromImports,
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

const modules: ModuleNode[] = [
  moduleNode("a", "src/unknown/a.py", "unmapped-unknown", ["b"], []),
  moduleNode("b", "src/safety/zone.py", "safety-layer", [], ["a"]),
  moduleNode("c", "src/unknown/c.py", "unmapped-unknown", [], []),
  moduleNode("test-motion", "tests/test_motion_program.py", "motion-planning", ["runtime-motion"], [], true),
  moduleNode("runtime-motion", "src/motion/box_motion.py", "motion-planning", [], ["test-motion"])
];
const inferred = inferFeatureFromImports(modules[0]!, new Map(modules.map((item) => [item.id, item])));
assert.strictEqual(inferred.id, "safety-layer");

const blocks = buildFeatureBlocks(modules, [{ from: "a", to: "b", kind: "import", confidence: "high" }]);
assert.ok(blocks.some((block) => block.id === "safety-layer"));
const motionBlock = blocks.find((block) => block.id === "motion-planning");
assert.ok(motionBlock, "motion planning block should exist");
assert.ok(motionBlock.moduleIds.includes("runtime-motion"), "runtime motion module should be in Motion Planning");
assert.ok(!motionBlock.moduleIds.includes("test-motion"), "test modules must not be primary Motion Planning runtime modules");
const unknownBlocks = blocks.filter((block) => block.id === "unmapped-unknown");
assert.strictEqual(unknownBlocks.length, 1, "unmapped modules should be grouped into one block");
assert.ok(unknownBlocks[0]?.description.includes("src/unknown/c.py"), "unmapped block should include real module samples");

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
