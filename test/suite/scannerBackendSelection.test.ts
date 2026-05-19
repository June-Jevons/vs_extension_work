import * as assert from "assert";
import { selectScannerBackend } from "../../src/core/scannerBackendSelection";

assert.strictEqual(selectScannerBackend("linux-native").backend, "vscodeFindFiles");
assert.strictEqual(selectScannerBackend("unc-wsl").backend, "vscodeFindFiles");
assert.ok(selectScannerBackend("linux-native").reason.includes("deterministic"));

console.log("Scanner backend selection checks passed.");
