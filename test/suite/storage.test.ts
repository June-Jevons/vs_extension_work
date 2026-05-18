import * as assert from "assert";
import { createWorkspaceKey, isExtensionManagedStoragePath, normalizeWorkspaceRoot } from "../../src/storage/workspaceKey";

const first = createWorkspaceKey({
  name: "ABB_ROS2",
  rootUri: "file://wsl.localhost/Ubuntu-22.04/home/jevons/ABB_ROS2"
});
const second = createWorkspaceKey({
  name: "ABB_ROS2",
  rootUri: "file://wsl.localhost/Ubuntu-22.04/home/jevons/ABB_ROS2/"
});

assert.strictEqual(first, second);
assert.ok(first.startsWith("workspace:"));

const workspace = "\\\\wsl.localhost\\Ubuntu-22.04\\home\\jevons\\ABB_ROS2";
assert.strictEqual(
  isExtensionManagedStoragePath("C:\\Users\\Junekim\\AppData\\Roaming\\Code\\User\\globalStorage\\local-tools.live-architecture-map", workspace),
  true
);
assert.strictEqual(
  isExtensionManagedStoragePath("\\\\wsl.localhost\\Ubuntu-22.04\\home\\jevons\\ABB_ROS2\\.vscode", workspace),
  false
);
assert.strictEqual(normalizeWorkspaceRoot("C:\\Temp\\Lam\\"), "c:/temp/lam");
