import { DashboardState } from "./dashboardState";
import { renderDashboardShell } from "./renderers";
import { dashboardStyles } from "./styles";

export function renderStandaloneDashboardHtml(state: DashboardState): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">
  <title>Live Architecture Map - ${state.mode}</title>
  <style>${dashboardStyles}</style>
</head>
<body>
  ${renderDashboardShell(state)}
</body>
</html>`;
}
