"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderStandaloneDashboardHtml = renderStandaloneDashboardHtml;
const renderers_1 = require("./renderers");
const styles_1 = require("./styles");
function renderStandaloneDashboardHtml(state) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">
  <title>Live Architecture Map - ${state.mode}</title>
  <style>${styles_1.dashboardStyles}</style>
</head>
<body>
  ${(0, renderers_1.renderDashboardShell)(state)}
</body>
</html>`;
}
//# sourceMappingURL=standaloneHtml.js.map