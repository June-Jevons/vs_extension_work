import * as fs from "fs";
import * as path from "path";
import { DashboardState } from "./dashboardState";
import { findViteEntry } from "./webviewAssets";

const WEBVIEW_MANIFEST_PATH = path.resolve(process.cwd(), "media", "webview", ".vite", "manifest.json");

export function renderStandaloneDashboardHtml(state: DashboardState): string {
  const assets = readStandaloneAssets();
  if (!assets) {
    return renderStandaloneErrorHtml("React webview bundle is unavailable.", "Run npm run compile:webview before rendering visual snapshots.");
  }

  const styles = assets.css
    .map((href) => `  <link rel="stylesheet" href="${escapeAttribute(href)}">`)
    .join("\n");
  const serializedState = JSON.stringify(state).replace(/</g, "\\u003c");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self' file: data:; style-src 'self' 'unsafe-inline' file:; script-src 'self' 'unsafe-inline' file:; img-src 'self' data: file:; font-src 'self' file:;">
  <title>Live Architecture Map - ${state.mode}</title>
${styles}
</head>
<body>
  <div id="root">Loading Live Architecture Map...</div>
  <script>
    window.__LIVE_ARCHITECTURE_MAP_INITIAL_STATE__ = ${serializedState};
    window.acquireVsCodeApi = function () {
      return {
        postMessage: function (message) {
          if (!message || typeof message.type !== "string") {
            return;
          }
          if (message.type === "setMode") {
            window.__LIVE_ARCHITECTURE_MAP_INITIAL_STATE__ = {
              ...window.__LIVE_ARCHITECTURE_MAP_INITIAL_STATE__,
              mode: message.mode
            };
            window.postMessage({ type: "state", state: window.__LIVE_ARCHITECTURE_MAP_INITIAL_STATE__ }, "*");
          }
          if (message.type === "selectFeature") {
            window.__LIVE_ARCHITECTURE_MAP_INITIAL_STATE__ = {
              ...window.__LIVE_ARCHITECTURE_MAP_INITIAL_STATE__,
              mode: "featureFocus",
              selectedFeatureId: message.featureId
            };
            window.postMessage({ type: "state", state: window.__LIVE_ARCHITECTURE_MAP_INITIAL_STATE__ }, "*");
          }
        },
        getState: function () {
          return window.__LIVE_ARCHITECTURE_MAP_INITIAL_STATE__;
        },
        setState: function (state) {
          window.__LIVE_ARCHITECTURE_MAP_INITIAL_STATE__ = state;
        }
      };
    };
  </script>
  <script type="module" src="${escapeAttribute(assets.script)}"></script>
</body>
</html>`;
}

function readStandaloneAssets(): { script: string; css: string[] } | undefined {
  try {
    const manifest = JSON.parse(fs.readFileSync(WEBVIEW_MANIFEST_PATH, "utf8")) as Parameters<typeof findViteEntry>[0];
    const entry = findViteEntry(manifest);
    if (!entry?.file) {
      return undefined;
    }
    return {
      script: `../../media/webview/${entry.file}`,
      css: (entry.css ?? []).map((cssFile) => `../../media/webview/${cssFile}`)
    };
  } catch {
    return undefined;
  }
}

function renderStandaloneErrorHtml(message: string, detail: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Live Architecture Map</title>
</head>
<body>
  <main data-testid="webview-bundle-error">
    <h1>${escapeHtml(message)}</h1>
    <p>${escapeHtml(detail)}</p>
  </main>
</body>
</html>`;
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
