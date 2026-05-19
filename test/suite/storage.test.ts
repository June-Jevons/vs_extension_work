import * as assert from "assert";
import { createWorkspaceKey, isExtensionManagedStoragePath, normalizeWorkspaceRoot } from "../../src/storage/workspaceKey";

const first = createWorkspaceKey({
  name: "ABB_ROS2",
  rootUri: "file:///home/jevons/ABB_ROS2"
});
const second = createWorkspaceKey({
  name: "ABB_ROS2",
  rootUri: "file:///home/jevons/ABB_ROS2/"
});

assert.strictEqual(first, second);
assert.ok(first.startsWith("workspace:"));

const workspace = "/home/jevons/ABB_ROS2";
assert.strictEqual(
  isExtensionManagedStoragePath("/home/jevons/.config/Code/User/globalStorage/local-tools.live-architecture-map", workspace),
  true
);
assert.strictEqual(
  isExtensionManagedStoragePath("/home/jevons/ABB_ROS2/.vscode", workspace),
  false
);
assert.strictEqual(normalizeWorkspaceRoot("/home/jevons/ABB_ROS2/"), "/home/jevons/abb_ros2");
