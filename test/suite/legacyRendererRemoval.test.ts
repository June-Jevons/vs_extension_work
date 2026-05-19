import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";

const repositoryRoot = path.resolve(__dirname, "..", "..", "..");
const liveSourceFiles = [
  path.join(repositoryRoot, "src", "webview", "dashboardPanel.ts"),
  path.join(repositoryRoot, "src", "webview", "html.ts"),
  path.join(repositoryRoot, "src", "webview", "standaloneHtml.ts")
];

assert.strictEqual(
  fs.existsSync(path.join(repositoryRoot, "src", "webview", "renderers.ts")),
  false,
  "legacy webview renderer module should be removed from the live source tree"
);

for (const filePath of liveSourceFiles) {
  const source = fs.readFileSync(filePath, "utf8");
  assert.ok(!source.includes("renderDashboardShell"), `${path.basename(filePath)} must not call the retired dashboard shell renderer`);
  assert.ok(!source.includes("graph-svg"), `${path.basename(filePath)} must not reference the retired SVG graph stage`);
}

console.log("Legacy renderer removal checks passed.");
