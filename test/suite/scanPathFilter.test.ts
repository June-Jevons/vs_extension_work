import * as assert from "assert";
import { isWatchedScanPath, shouldExcludePath } from "../../src/core/scanPathFilter";

assert.strictEqual(isWatchedScanPath("src/robot/controller.py"), true);
assert.strictEqual(isWatchedScanPath("src/robot/config.yaml"), true);
assert.strictEqual(isWatchedScanPath("package.xml"), true);
assert.strictEqual(isWatchedScanPath("src/robot/controller.pyc"), false);

assert.strictEqual(shouldExcludePath("build/generated.py", ["**/build/**"]), true);
assert.strictEqual(shouldExcludePath("src/__pycache__/mod.py", ["**/__pycache__/**"]), true);
assert.strictEqual(shouldExcludePath("src/robot/controller.py", ["**/build/**"]), false);

console.log("Scan path filter checks passed.");
