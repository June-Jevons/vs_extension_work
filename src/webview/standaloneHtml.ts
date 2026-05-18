import { DashboardState } from "./dashboardState";
import { renderDashboardShell } from "./renderers";
import { dashboardStyles } from "./styles";

export function renderStandaloneDashboardHtml(state: DashboardState): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:">
  <title>Live Architecture Map - ${state.mode}</title>
  <style>${dashboardStyles}</style>
</head>
<body>
  ${renderDashboardShell(state)}
  <script>
    document.addEventListener("click", (event) => {
      const control = event.target.closest("[data-graph-action]");
      if (!control) {
        return;
      }
      const panel = control.closest("[data-graph-panel]");
      const svg = panel ? panel.querySelector("svg.graph-svg") : undefined;
      if (!svg) {
        return;
      }
      const fitViewBox = svg.getAttribute("data-fit-viewbox") || svg.getAttribute("viewBox");
      const current = parseViewBox(svg.getAttribute("viewBox") || fitViewBox);
      if (!current || !fitViewBox) {
        return;
      }
      const action = control.getAttribute("data-graph-action");
      if (action === "reset") {
        svg.setAttribute("viewBox", fitViewBox);
        svg.dataset.zoom = "1";
        return;
      }
      const factor = action === "zoom-in" ? 0.8 : action === "zoom-out" ? 1.25 : 1;
      const width = current.width * factor;
      const height = current.height * factor;
      const centerX = current.x + current.width / 2;
      const centerY = current.y + current.height / 2;
      svg.setAttribute("viewBox", [
        (centerX - width / 2).toFixed(2),
        (centerY - height / 2).toFixed(2),
        width.toFixed(2),
        height.toFixed(2)
      ].join(" "));
      svg.dataset.zoom = String(Number(svg.dataset.zoom || "1") / factor);
    });

    function parseViewBox(value) {
      if (!value) {
        return undefined;
      }
      const parts = value.trim().split(/\\s+/).map(Number);
      if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
        return undefined;
      }
      return {
        x: parts[0],
        y: parts[1],
        width: parts[2],
        height: parts[3]
      };
    }
  </script>
</body>
</html>`;
}
