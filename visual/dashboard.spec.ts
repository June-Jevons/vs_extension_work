import { expect, test } from "@playwright/test";
import * as fs from "fs";
import * as http from "http";
import * as path from "path";

interface VisualTarget {
  name: string;
  html: string;
  screenshot: string;
  requiredTestIds: string[];
}

const repoRoot = path.resolve(__dirname, "..");
const uiRoot = path.join(repoRoot, "artifacts", "ui");
const reportPath = path.join(repoRoot, "artifacts", "validation-report.md");
let staticServer: http.Server | undefined;
let staticOrigin = "";

const commonTestIds = [
  "dashboard-root",
  "workspace-diagnostics-panel",
  "mode-liveChanges",
  "mode-wholeArchitecture",
  "mode-featureFocus",
  "mode-diffSinceBaseline"
];

const visualTargets: VisualTarget[] = [
  {
    name: "live changes",
    html: "live-changes.html",
    screenshot: "live-changes.png",
    requiredTestIds: [
      ...commonTestIds,
      "current-change-area",
      "risk-card-high",
      "risk-card-medium",
      "risk-card-low",
      "architecture-impact-graph",
      "changed-files-table",
      "dependency-graph",
      "validation-status-row"
    ]
  },
  {
    name: "whole architecture",
    html: "whole-architecture.html",
    screenshot: "whole-architecture.png",
    requiredTestIds: [
      ...commonTestIds,
      "whole-architecture-diagram",
      "architecture-overview-cards",
      "architecture-health-cards"
    ]
  },
  {
    name: "feature focus",
    html: "feature-focus.html",
    screenshot: "feature-focus.png",
    requiredTestIds: [
      ...commonTestIds,
      "feature-selector",
      "runtime-flow-summary",
      "module-composition-panel",
      "internal-dependency-graph",
      "related-external-dependencies",
      "unclassified-runtime-modules"
    ]
  },
  {
    name: "diff since baseline",
    html: "diff-since-baseline.html",
    screenshot: "diff-since-baseline.png",
    requiredTestIds: [
      ...commonTestIds,
      "baseline-selector",
      "baseline-summary-cards",
      "before-after-graph",
      "top-changes-table",
      "structural-timeline"
    ]
  }
];

for (const target of visualTargets) {
  test(`${target.name} standalone dashboard renders required panels`, async ({ page }) => {
    const htmlPath = path.join(uiRoot, target.html);
    expect(fs.existsSync(htmlPath), `${target.html} must exist; run npm run visual:render first`).toBe(true);

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`${staticOrigin}/artifacts/ui/${target.html}`);

    for (const testId of target.requiredTestIds) {
      const locator = page.getByTestId(testId);
      await expect(locator, `${testId} should be present`).toHaveCount(1);
      const box = await locator.boundingBox();
      expect(box, `${testId} should have a bounding box`).not.toBeNull();
      expect(box?.width ?? 0, `${testId} should have non-zero width`).toBeGreaterThan(0);
      expect(box?.height ?? 0, `${testId} should have non-zero height`).toBeGreaterThan(0);
    }

    const overflow = await page.evaluate(() => ({
      bodyScrollWidth: document.body.scrollWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth
    }));
    expect(Math.max(overflow.bodyScrollWidth, overflow.documentScrollWidth)).toBeLessThanOrEqual(overflow.viewportWidth);

    const bodyText = (await page.locator("body").innerText()).trim();
    expect(bodyText.startsWith("#")).toBe(false);
    expect(bodyText.startsWith("{")).toBe(false);
    expect(bodyText.startsWith("[")).toBe(false);
    await expect(page.locator("pre")).toHaveCount(0);
    await expect(page.getByTestId("related-tests")).toHaveCount(0);
    await expect(page.getByText("Related Tests", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Estimated Test Coverage", { exact: true })).toHaveCount(0);

    await expect(page.getByTestId("graph-layout-error")).toHaveCount(0);
    await expect(page.getByTestId("graph-layout-loading")).toHaveCount(0, { timeout: 10000 });
    await expect(page.locator("svg.graph-svg"), "legacy SVG graph stage should not be used by React standalone render").toHaveCount(0);

    const graphCanvases = page.getByTestId("react-flow-canvas");
    const graphCount = await graphCanvases.count();
    expect(graphCount, "React Flow canvases should be rendered").toBeGreaterThan(0);
    for (let index = 0; index < graphCount; index += 1) {
      const canvas = graphCanvases.nth(index);
      await expect(canvas.locator(".react-flow__viewport"), `React Flow viewport ${index} should be visible`).toBeVisible();
      const graphBox = await canvas.boundingBox();
      expect(graphBox, `React Flow canvas ${index} should have a bounding box`).not.toBeNull();
      expect(graphBox?.width ?? 0).toBeGreaterThan(320);
      expect(graphBox?.height ?? 0).toBeGreaterThan(320);
      expect(await canvas.locator(".react-flow__node").count(), `React Flow canvas ${index} should have visible nodes`).toBeGreaterThan(0);
      expect(await canvas.locator(".react-flow__edge").count(), `React Flow canvas ${index} should have visible edges`).toBeGreaterThan(0);

      const viewport = canvas.locator(".react-flow__viewport");
      const initialTransform = await viewport.getAttribute("style");
      await canvas.locator(".react-flow__controls-button").first().click();
      await expect.poll(async () => viewport.getAttribute("style"), {
        message: `React Flow canvas ${index} zoom control should change viewport transform`
      }).not.toBe(initialTransform);
    }

    await page.screenshot({
      path: path.join(uiRoot, target.screenshot),
      fullPage: true
    });
  });
}

test.beforeAll(async () => {
  const started = await startStaticServer(repoRoot);
  staticServer = started.server;
  staticOrigin = started.origin;
});

test.afterAll(() => {
  const screenshots = visualTargets.map((target) => `- artifacts/ui/${target.screenshot}`).join("\n");
  fs.appendFileSync(
    reportPath,
    `
## Playwright Visual Test Run

Result: passed.

Graph renderer: React Flow + ELK.

Completed: ${new Date().toISOString()}

Generated screenshots:

${screenshots}
`,
    "utf8"
  );
  staticServer?.close();
});

function startStaticServer(root: string): Promise<{ server: http.Server; origin: string }> {
  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
    const decodedPath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, "");
    const filePath = path.resolve(root, decodedPath || "index.html");
    if (!filePath.startsWith(root) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    response.writeHead(200, {
      "content-type": contentType(filePath)
    });
    fs.createReadStream(filePath).pipe(response);
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Static server did not provide a TCP address."));
        return;
      }
      resolve({
        server,
        origin: `http://127.0.0.1:${address.port}`
      });
    });
  });
}

function contentType(filePath: string): string {
  switch (path.extname(filePath)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    default:
      return "application/octet-stream";
  }
}
