export function getDashboardStyles(): string {
  return `
    :root {
      color-scheme: dark;
      --lam-bg: var(--vscode-editor-background, #0d1117);
      --lam-panel: color-mix(in srgb, var(--vscode-editor-background, #0d1117) 86%, #ffffff 8%);
      --lam-panel-strong: color-mix(in srgb, var(--vscode-editor-background, #0d1117) 75%, #ffffff 13%);
      --lam-border: color-mix(in srgb, var(--vscode-editor-foreground, #c9d1d9) 18%, transparent);
      --lam-border-strong: color-mix(in srgb, var(--vscode-focusBorder, #3d7dd8) 55%, transparent);
      --lam-text: var(--vscode-editor-foreground, #d4d4d4);
      --lam-muted: color-mix(in srgb, var(--lam-text) 62%, transparent);
      --lam-faint: color-mix(in srgb, var(--lam-text) 38%, transparent);
      --lam-blue: #4aa3ff;
      --lam-green: #62d26f;
      --lam-orange: #f3b44b;
      --lam-red: #ff6b6b;
      --lam-purple: #b48cff;
      --lam-radius: 6px;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-width: 780px;
      background: radial-gradient(circle at 50% -10%, rgba(74, 163, 255, 0.06), transparent 34%), var(--lam-bg);
      color: var(--lam-text);
      font: 12px/1.45 var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
      letter-spacing: 0;
    }

    button, select {
      font: inherit;
    }

    .dashboard-shell {
      min-height: 100vh;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .topbar {
      min-height: 38px;
      border: 1px solid var(--lam-border);
      background: rgba(255, 255, 255, 0.025);
      border-radius: var(--lam-radius);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 8px;
      gap: 10px;
    }

    .mode-tabs, .toolbar, .inline-controls, .path-row, .legend-row {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .mode-tab, .toolbar-button, .mini-button {
      color: var(--lam-text);
      background: transparent;
      border: 1px solid transparent;
      border-radius: 5px;
      padding: 5px 8px;
      cursor: pointer;
    }

    .mode-tab:hover, .toolbar-button:hover, .mini-button:hover {
      border-color: var(--lam-border);
      background: rgba(255, 255, 255, 0.06);
    }

    .mode-tab.active {
      background: color-mix(in srgb, var(--vscode-button-background, #0e639c) 55%, transparent);
      border-color: color-mix(in srgb, var(--vscode-focusBorder, #4aa3ff) 72%, transparent);
      color: var(--vscode-button-foreground, #ffffff);
    }

    .toolbar-button {
      padding: 5px 9px;
    }

    .mock-badge {
      color: #7fd1ff;
      border: 1px solid rgba(74, 163, 255, 0.45);
      background: rgba(74, 163, 255, 0.1);
      border-radius: 999px;
      padding: 2px 7px;
      white-space: nowrap;
    }

    .panel {
      border: 1px solid var(--lam-border);
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.018));
      border-radius: var(--lam-radius);
      overflow: hidden;
      min-width: 0;
    }

    .panel-header {
      padding: 10px 12px 4px;
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: flex-start;
    }

    .panel-title {
      font-size: 15px;
      font-weight: 650;
      margin: 0;
    }

    .panel-subtitle {
      margin: 2px 0 0;
      color: var(--lam-muted);
    }

    .panel-body {
      padding: 10px 12px 12px;
      min-width: 0;
    }

    .with-gap {
      margin-top: 10px;
    }

    .live-summary {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 320px;
      gap: 10px;
      min-height: 128px;
    }

    .current-path {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      margin-top: 12px;
      padding: 8px 11px;
      background: rgba(74, 163, 255, 0.1);
      border: 1px solid rgba(74, 163, 255, 0.16);
      border-radius: 5px;
      color: #71bcff;
      font-size: 13px;
    }

    .path-separator {
      color: var(--lam-faint);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      display: inline-block;
      border-radius: 999px;
      background: var(--lam-blue);
      box-shadow: 0 0 0 3px rgba(74, 163, 255, 0.1);
    }

    .risk-card-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      height: 100%;
      align-content: center;
    }

    .metric-card, .risk-card, .validation-card, .health-row, .external-card, .module-chip {
      border: 1px solid var(--lam-border);
      border-radius: var(--lam-radius);
      background: rgba(255, 255, 255, 0.035);
    }

    .risk-card {
      padding: 12px;
      min-height: 78px;
    }

    .risk-card .risk-label {
      display: block;
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 10px;
    }

    .risk-card .risk-value {
      font-size: 26px;
      font-weight: 500;
    }

    .tone-high, .risk-high {
      --tone: var(--lam-red);
    }

    .tone-medium, .risk-medium {
      --tone: var(--lam-orange);
    }

    .tone-low, .risk-low {
      --tone: var(--lam-green);
    }

    .tone-info {
      --tone: var(--lam-blue);
    }

    .tone-high, .tone-medium, .tone-low, .tone-info {
      border-color: color-mix(in srgb, var(--tone) 52%, transparent);
      background: color-mix(in srgb, var(--tone) 12%, transparent);
    }

    .tone-high .risk-label, .tone-high .metric-value, .tone-high .metric-detail,
    .risk-high, .status-deleted, .state-failed {
      color: var(--lam-red);
    }

    .tone-medium .risk-label, .tone-medium .metric-value, .tone-medium .metric-detail,
    .risk-medium, .status-modified, .state-running {
      color: var(--lam-orange);
    }

    .tone-low .risk-label, .tone-low .metric-value, .tone-low .metric-detail,
    .risk-low, .state-passed {
      color: var(--lam-green);
    }

    .tone-info .metric-value, .tone-info .metric-detail {
      color: var(--lam-blue);
    }

    .impact-panel {
      min-height: 315px;
    }

    .large-graph-panel {
      min-height: 450px;
    }

    .lower-grid {
      display: grid;
      grid-template-columns: minmax(420px, 1.2fr) minmax(420px, 1fr);
      gap: 10px;
    }

    .mode-grid {
      display: grid;
      grid-template-columns: 230px minmax(0, 1fr);
      gap: 10px;
      align-items: stretch;
    }

    .side-nav {
      min-height: 520px;
    }

    .side-group {
      padding: 10px 12px;
      border-bottom: 1px solid var(--lam-border);
    }

    .side-group-title {
      margin: 0 0 8px;
      color: var(--lam-muted);
      font-weight: 700;
      text-transform: uppercase;
      font-size: 11px;
    }

    .side-row, .test-row, .change-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      align-items: center;
      padding: 4px 0;
      color: var(--lam-text);
    }

    .side-row span:first-child, .test-row span:first-child, .change-row span:first-child {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .select-row {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      align-items: center;
      margin-bottom: 10px;
    }

    select {
      color: var(--lam-text);
      background: var(--vscode-dropdown-background, #252526);
      border: 1px solid var(--vscode-dropdown-border, var(--lam-border));
      border-radius: 4px;
      padding: 4px 8px;
      min-width: 170px;
    }

    .feature-grid, .diff-grid {
      display: grid;
      grid-template-columns: minmax(430px, 1.1fr) minmax(430px, 1fr);
      gap: 10px;
    }

    .feature-bottom-grid {
      display: grid;
      grid-template-columns: minmax(430px, 1fr) minmax(300px, 0.7fr);
      gap: 10px;
      margin-top: 10px;
    }

    .composition-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(92px, 1fr));
      gap: 10px;
      align-items: center;
      min-height: 240px;
    }

    .module-chip {
      padding: 9px;
      text-align: center;
      min-height: 40px;
      display: grid;
      place-items: center;
      color: var(--lam-text);
    }

    .module-chip.primary {
      color: var(--lam-green);
      border-color: rgba(98, 210, 111, 0.6);
      grid-column: 2 / span 2;
    }

    .external-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(120px, 1fr));
      gap: 10px;
    }

    .external-card {
      padding: 10px;
      min-height: 86px;
    }

    .external-card strong {
      display: block;
      margin-bottom: 7px;
    }

    .validation-grid {
      display: grid;
      grid-template-columns: repeat(6, minmax(130px, 1fr));
      gap: 10px;
    }

    .validation-card {
      padding: 12px;
      min-height: 86px;
    }

    .validation-label {
      font-weight: 650;
      margin-bottom: 10px;
    }

    .validation-detail, .metric-detail, .health-detail {
      color: var(--lam-muted);
      margin-top: 5px;
    }

    .metric-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(120px, 1fr));
      gap: 10px;
    }

    .diff-summary-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(120px, 1fr));
      gap: 10px;
    }

    .metric-card {
      padding: 13px;
      min-height: 86px;
    }

    .metric-label {
      color: var(--lam-muted);
      margin-bottom: 8px;
    }

    .metric-value {
      font-size: 28px;
      line-height: 1;
    }

    .metric-value.small {
      font-size: 18px;
    }

    .health-list {
      display: grid;
      gap: 7px;
    }

    .health-row {
      padding: 9px 10px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
      align-items: center;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    th, td {
      border-bottom: 1px solid var(--lam-border);
      padding: 7px 8px;
      text-align: left;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    th {
      color: var(--lam-muted);
      font-weight: 600;
      background: rgba(255, 255, 255, 0.03);
    }

    .col-file {
      width: 48%;
    }

    .col-status {
      width: 12%;
    }

    .col-feature {
      width: 25%;
    }

    .col-change {
      width: 15%;
    }

    .col-index {
      width: 8%;
    }

    .col-small {
      width: 18%;
    }

    td a, .linkish {
      color: #71bcff;
      text-decoration: none;
    }

    .status-legend {
      color: var(--lam-muted);
      padding-top: 8px;
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 28px;
      border-radius: 4px;
      border: 1px solid var(--lam-border);
      padding: 1px 6px;
      font-size: 11px;
      line-height: 18px;
    }

    .graph-wrap {
      position: relative;
      width: 100%;
      min-height: 210px;
    }

    .graph-wrap svg {
      display: block;
      width: 100%;
      height: auto;
      max-height: 420px;
      overflow: visible;
    }

    .graph-controls {
      position: absolute;
      top: 0;
      right: 0;
      display: flex;
      align-items: center;
      gap: 6px;
      z-index: 2;
    }

    .graph-controls select {
      min-width: 120px;
    }

    .mini-button {
      width: 26px;
      height: 24px;
      padding: 0;
      border-color: var(--lam-border);
      background: rgba(255, 255, 255, 0.04);
    }

    .node-rect {
      fill: rgba(255, 255, 255, 0.045);
      stroke: var(--lam-border);
      stroke-width: 1.4;
      rx: 6;
    }

    .node-circle {
      stroke-width: 2;
      fill: #202733;
    }

    .node-label {
      font-size: 13px;
      font-weight: 650;
      fill: var(--lam-text);
    }

    .node-subtitle, .node-detail, .edge-label {
      font-size: 11px;
      fill: color-mix(in srgb, var(--lam-text) 78%, transparent);
    }

    .graph-edge {
      stroke: color-mix(in srgb, var(--lam-text) 58%, transparent);
      stroke-width: 1.4;
      fill: none;
      marker-end: url(#arrow);
    }

    .graph-edge.dashed {
      stroke-dasharray: 5 5;
    }

    .graph-edge.added {
      stroke: var(--lam-green);
      stroke-width: 2;
    }

    .graph-edge.removed {
      stroke: var(--lam-red);
      stroke-width: 2;
      stroke-dasharray: 6 4;
    }

    .node-high .node-rect, .node-high.node-circle {
      stroke: var(--lam-red);
      fill: rgba(255, 107, 107, 0.14);
    }

    .node-medium .node-rect, .node-medium.node-circle {
      stroke: var(--lam-orange);
      fill: rgba(243, 180, 75, 0.13);
    }

    .node-low .node-rect, .node-low.node-circle {
      stroke: var(--lam-green);
      fill: rgba(98, 210, 111, 0.12);
    }

    .node-changed .node-rect {
      stroke-width: 2;
      filter: drop-shadow(0 0 8px rgba(255, 107, 107, 0.18));
    }

    .diff-graphs {
      display: grid;
      grid-template-columns: 1fr 56px 1fr;
      gap: 10px;
      align-items: center;
    }

    .diff-arrow {
      color: var(--lam-muted);
      font-size: 36px;
      text-align: center;
    }

    .timeline-svg {
      width: 100%;
      height: 180px;
      display: block;
    }

    .empty-state {
      min-height: 260px;
      display: grid;
      place-items: center;
      text-align: center;
      color: var(--lam-muted);
    }

    @media (max-width: 1200px) {
      .live-summary, .lower-grid, .mode-grid, .feature-grid, .feature-bottom-grid, .diff-grid {
        grid-template-columns: 1fr;
      }

      .side-nav {
        min-height: auto;
      }

      .validation-grid, .metric-grid, .diff-summary-grid, .external-grid {
        grid-template-columns: repeat(2, minmax(160px, 1fr));
      }
    }
  `;
}
