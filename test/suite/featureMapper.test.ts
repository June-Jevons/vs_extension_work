import * as assert from "assert";
import { buildFeatureBlocks, inferFeatureFromImports, mapFeatureForPath } from "../../src/core/featureMapper";
import { ModuleNode } from "../../src/webview/dashboardState";

assert.strictEqual(mapFeatureForPath("src/gui/main_gui.py").id, "gui-layer");
assert.strictEqual(mapFeatureForPath("src/abb_motion/path_generator.py").id, "motion-planning");
assert.strictEqual(mapFeatureForPath("tests/config/test_runtime_config.py").id, "tests");
assert.strictEqual(mapFeatureForPath("notes/unknown.py").id, "unmapped-unknown");

const modules: ModuleNode[] = [
  moduleNode("a", "src/unknown/a.py", "unmapped-unknown", ["b"], []),
  moduleNode("b", "src/safety/zone.py", "safety-layer", [], ["a"])
];
const inferred = inferFeatureFromImports(modules[0]!, new Map(modules.map((item) => [item.id, item])));
assert.strictEqual(inferred.id, "safety-layer");

const blocks = buildFeatureBlocks(modules, [{ from: "a", to: "b", kind: "import", confidence: "high" }]);
assert.ok(blocks.some((block) => block.id === "safety-layer"));

function moduleNode(
  id: string,
  path: string,
  featureId: string,
  imports: string[],
  importedBy: string[]
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
    isTest: false,
    isOrphan: importedBy.length === 0,
    riskLevel: "low"
  };
}
