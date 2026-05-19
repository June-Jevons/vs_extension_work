import * as assert from "assert";
import { FileAnalysisCache } from "../../src/core/fileAnalysisCache";
import { ModuleNode } from "../../src/webview/dashboardState";

const cache = new FileAnalysisCache();
const metadata = {
  workspaceKey: "workspace:test",
  relativePath: "src/app/main.py",
  mtimeMs: 100,
  size: 42
};

cache.beginRun();
assert.strictEqual(cache.get(metadata), undefined);
cache.set(metadata, {
  module: moduleNode("app/main", "src/app/main.py"),
  imports: [{ module: "app.config", statement: "import app.config", line: 1 }],
  totalClasses: 1,
  totalFunctions: 2
});

const hit = cache.get(metadata);
assert.strictEqual(hit?.module.id, "app/main");
assert.strictEqual(hit?.imports.length, 1);
assert.deepStrictEqual(cache.snapshotStats(), {
  hitCount: 1,
  missCount: 1,
  invalidatedCount: 0,
  deletedCount: 0,
  entryCount: 1
});

const stale = cache.get({ ...metadata, mtimeMs: 101 });
assert.strictEqual(stale, undefined);
assert.strictEqual(cache.snapshotStats().invalidatedCount, 1);
cache.set({ ...metadata, mtimeMs: 101 }, {
  module: moduleNode("app/main", "src/app/main.py"),
  imports: [],
  totalClasses: 0,
  totalFunctions: 1
});
cache.reconcileWorkspace("workspace:test", new Set());
assert.strictEqual(cache.snapshotStats().entryCount, 0);
assert.ok(cache.snapshotStats().deletedCount > 0);

console.log("File analysis cache checks passed.");

function moduleNode(id: string, path: string): ModuleNode {
  return {
    id,
    name: id.split("/").at(-1) ?? id,
    path,
    language: "python",
    packageName: id.replaceAll("/", "."),
    imports: [],
    importedBy: [],
    isEntryPoint: false,
    isTest: false,
    isOrphan: false,
    riskLevel: "low"
  };
}
