import * as assert from "assert";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { getDashboardWebviewHtml } from "../../src/webview/html";
import { findViteEntry, getWebviewAssetUris, getWebviewBundleStatus } from "../../src/webview/webviewAssets";

class FakeUri {
  constructor(
    readonly fsPath: string,
    readonly path: string
  ) {}

  toString(): string {
    return `file://${this.path}`;
  }

  with(change: { path: string }): FakeUri {
    return new FakeUri(path.join("/", change.path), change.path);
  }
}

const webview = {
  cspSource: "vscode-webview:",
  asWebviewUri(uri: FakeUri): FakeUri {
    return new FakeUri(uri.fsPath, `/webview${uri.path}`);
  }
};

const entry = findViteEntry({
  "src/webview-app/main.tsx": {
    file: "assets/main-test.js",
    css: ["assets/main-test.css"],
    isEntry: true
  }
});
assert.strictEqual(entry?.file, "assets/main-test.js");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "lam-webview-assets-"));
fs.mkdirSync(path.join(tempRoot, "media", "webview", ".vite"), { recursive: true });
fs.writeFileSync(
  path.join(tempRoot, "media", "webview", ".vite", "manifest.json"),
  JSON.stringify({
    "src/webview-app/main.tsx": {
      file: "assets/main-test.js",
      css: ["assets/main-test.css"],
      isEntry: true
    }
  }),
  "utf8"
);
fs.mkdirSync(path.join(tempRoot, "media", "webview", "assets"), { recursive: true });
fs.writeFileSync(path.join(tempRoot, "media", "webview", "assets", "main-test.js"), "console.log('ok');", "utf8");
fs.writeFileSync(path.join(tempRoot, "media", "webview", "assets", "main-test.css"), "body{}", "utf8");

const assets = getWebviewAssetUris(webview, new FakeUri(tempRoot, tempRoot));
assert.strictEqual(assets.kind, "available");
if (assets.kind === "available") {
  assert.ok(assets.scriptUri.includes("assets/main-test.js"));
  assert.strictEqual(assets.styleUris.length, 1);
}
const bundleStatus = getWebviewBundleStatus(tempRoot);
assert.strictEqual(bundleStatus.kind, "available");

const missingRoot = fs.mkdtempSync(path.join(os.tmpdir(), "lam-webview-missing-"));
const missingHtml = getDashboardWebviewHtml(
  webview as unknown as Parameters<typeof getDashboardWebviewHtml>[0],
  new FakeUri(missingRoot, missingRoot) as unknown as Parameters<typeof getDashboardWebviewHtml>[1],
  "nonce-test"
);
assert.ok(missingHtml.includes("data-testid=\"webview-bundle-error\""));
assert.ok(missingHtml.includes("React webview bundle is unavailable."));
assert.ok(!missingHtml.includes("graph-svg"));
assert.ok(!missingHtml.includes("renderDashboardShell"));

console.log("Webview asset checks passed.");
