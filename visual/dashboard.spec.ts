import { expect, test } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { pathToFileURL } from "url";

interface VisualTarget {
  name: string;
  html: string;
  screenshot: string;
  requiredTestIds: string[];
}

const repoRoot = path.resolve(__dirname, "..");
const uiRoot = path.join(repoRoot, "artifacts", "ui");
const reportPath = path.join(repoRoot, "artifacts", "validation-report.md");

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
      "module-composition-panel",
      "internal-dependency-graph",
      "related-external-dependencies",
      "related-tests"
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
    await page.goto(pathToFileURL(htmlPath).toString());

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

    const graphSvgs = page.locator("svg.graph-svg");
    await expect(graphSvgs.first(), "at least one graph SVG should be visible").toBeVisible();
    const graphCount = await graphSvgs.count();
    expect(graphCount).toBeGreaterThan(0);
    for (let index = 0; index < graphCount; index += 1) {
      const graphBox = await graphSvgs.nth(index).boundingBox();
      expect(graphBox, `graph SVG ${index} should have a bounding box`).not.toBeNull();
      expect(graphBox?.width ?? 0).toBeGreaterThan(120);
      expect(graphBox?.height ?? 0).toBeGreaterThan(120);
    }

    const graphPanels = page.locator("[data-graph-panel]");
    const graphPanelCount = await graphPanels.count();
    expect(graphPanelCount, "graph panels with visible controls should exist").toBeGreaterThan(0);
    for (let index = 0; index < graphPanelCount; index += 1) {
      const panel = graphPanels.nth(index);
      const svg = panel.locator("svg.graph-svg").first();
      await expect(svg, `graph panel ${index} should contain an SVG`).toBeVisible();
      const initialViewBox = await svg.getAttribute("viewBox");
      await panel.locator("[data-graph-action='zoom-in']").first().click();
      const zoomedInViewBox = await svg.getAttribute("viewBox");
      expect(zoomedInViewBox, `graph panel ${index} zoom in should change viewBox`).not.toBe(initialViewBox);
      await panel.locator("[data-graph-action='zoom-out']").first().click();
      const zoomedOutViewBox = await svg.getAttribute("viewBox");
      expect(zoomedOutViewBox, `graph panel ${index} zoom out should change viewBox`).not.toBe(zoomedInViewBox);
      await panel.locator("[data-graph-action='reset']").first().click();
      await expect(svg, `graph panel ${index} reset should restore fit viewBox`).toHaveAttribute("viewBox", initialViewBox ?? "");
    }

    await page.screenshot({
      path: path.join(uiRoot, target.screenshot),
      fullPage: true
    });
  });
}

test.afterAll(() => {
  const screenshots = visualTargets.map((target) => `- artifacts/ui/${target.screenshot}`).join("\n");
  fs.appendFileSync(
    reportPath,
    `
## Playwright Visual Test Run

Result: passed.

Completed: ${new Date().toISOString()}

Generated screenshots:

${screenshots}
`,
    "utf8"
  );
});
