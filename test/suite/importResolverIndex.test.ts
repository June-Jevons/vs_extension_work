import * as assert from "assert";
import { buildImportResolverIndex, resolveLocalImportWithIndex } from "../../src/graph/importResolverIndex";

const index = buildImportResolverIndex([
  "app/main",
  "app/config",
  "app/motion/planner",
  "tests/test_planner"
], [
  { from: "tests/test_planner", to: "app/motion/planner" }
]);

assert.strictEqual(resolveLocalImportWithIndex("app.config", index), "app/config");
assert.strictEqual(resolveLocalImportWithIndex("motion.planner", index), "app/motion/planner");
assert.strictEqual(resolveLocalImportWithIndex({ module: ".config", statement: "from . import config", line: 1, importedName: undefined }, index, "app/main"), "app/config");
assert.deepStrictEqual(index.reverseDependencyIndex.get("app/motion/planner"), ["tests/test_planner"]);
assert.deepStrictEqual(index.topLevelPackageIndex.get("app"), ["app/config", "app/main", "app/motion/planner"]);

console.log("Import resolver index checks passed.");
