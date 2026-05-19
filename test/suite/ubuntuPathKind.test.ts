import * as assert from "assert";
import { describePathKind } from "../../src/core/pathKind";

assert.strictEqual(describePathKind("/home/jevons/ABB_ROS2"), "linux-native");
assert.strictEqual(describePathKind("/tmp/vscode-lam-dev-user-data"), "linux-native");
assert.strictEqual(describePathKind("\\\\wsl.localhost\\Ubuntu-22.04\\home\\jevons\\ABB_ROS2"), "unc-wsl");
assert.strictEqual(describePathKind("\\\\wsl$\\Ubuntu-22.04\\home\\jevons\\ABB_ROS2"), "unc-wsl");
assert.strictEqual(describePathKind("\\\\server\\share\\workspace"), "unc");
assert.strictEqual(describePathKind("C:\\Users\\Junekim\\Work\\vs_extension_work"), "windows-local");
assert.strictEqual(describePathKind(undefined), "unknown");

console.log("Ubuntu path kind checks passed.");
