import * as assert from "assert";
import { decideWorkspaceIndexRefresh, WorkspaceIndex } from "../../src/core/workspaceIndex";

const index = new WorkspaceIndex();
assert.strictEqual(index.size, 0);
assert.strictEqual(decideWorkspaceIndexRefresh({
  hasExistingIndex: false,
  changedPaths: [],
  maxIncrementalPaths: 2
}).reason, "first workspace open");

index.updateFromFullScan(["src/app/main.py", "src/app/config.py"]);
index.applyChanges(["src/app/robot_io.py"], ["src/app/config.py"]);
assert.strictEqual(index.has("src/app/main.py"), true);
assert.strictEqual(index.has("src/app/config.py"), false);
assert.strictEqual(index.has("src/app/robot_io.py"), true);

assert.deepStrictEqual(decideWorkspaceIndexRefresh({
  hasExistingIndex: true,
  changedPaths: ["src/app/main.py"],
  maxIncrementalPaths: 2
}), {
  fullRebuild: false,
  reason: "watcher incremental update"
});
assert.strictEqual(decideWorkspaceIndexRefresh({
  hasExistingIndex: true,
  changedPaths: ["a.py", "b.py", "c.py"],
  maxIncrementalPaths: 2
}).reason, "too many changed paths in one batch");

console.log("Workspace index checks passed.");
