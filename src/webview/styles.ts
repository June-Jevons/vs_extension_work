export const dashboardStyles = `
:root {
  color-scheme: dark;
  --lam-bg: #0d1117;
  --lam-bg-soft: #111820;
  --lam-panel: #151b23;
  --lam-panel-strong: #1b2530;
  --lam-line: #2c3642;
  --lam-line-strong: #3b4654;
  --lam-text: #d7dde6;
  --lam-muted: #8d99a8;
  --lam-blue: #58a6ff;
  --lam-purple: #b17cff;
  --lam-green: #7ee787;
  --lam-yellow: #f2cc60;
  --lam-orange: #ffa657;
  --lam-red: #ff7b72;
  --lam-cyan: #76e3ea;
  --lam-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}

* {
  box-sizing: border-box;
}

html,
body {
  width: 100%;
  min-width: 0;
  min-height: 100%;
  margin: 0;
  overflow-x: hidden;
  background: var(--lam-bg);
  color: var(--lam-text);
  font-family: var(--vscode-font-family, "Segoe UI", Arial, sans-serif);
  font-size: 13px;
}

button,
select {
  font: inherit;
}

.dashboard-root {
  width: 100%;
  min-height: 100vh;
  padding: 14px;
  background:
    radial-gradient(circle at 15% 18%, rgba(88, 166, 255, 0.06), transparent 30%),
    linear-gradient(135deg, #0d1117 0%, #111820 52%, #0b1016 100%);
  color: var(--lam-text);
}

.dashboard-shell {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  min-width: 0;
}

.dashboard-toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto auto;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid var(--lam-line);
  border-radius: 6px;
  background: rgba(18, 25, 33, 0.92);
  box-shadow: var(--lam-shadow);
}

.toolbar-title {
  min-width: 0;
}

.toolbar-title h1 {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
}

.toolbar-title p {
  margin: 2px 0 0;
  color: var(--lam-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toolbar-actions,
.mode-tabs,
.panel-actions,
.inline-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.mode-tabs {
  flex-wrap: wrap;
  justify-content: center;
}

.toolbar-button,
.mode-tab,
.icon-button,
.select-control,
.primary-action {
  min-height: 28px;
  border: 1px solid var(--lam-line);
  border-radius: 5px;
  background: #18212b;
  color: var(--lam-text);
}

.toolbar-button,
.mode-tab,
.primary-action {
  padding: 5px 10px;
}

.toolbar-button,
.mode-tab,
.icon-button,
.primary-action {
  cursor: pointer;
}

.toolbar-button:hover,
.mode-tab:hover,
.icon-button:hover,
.primary-action:hover {
  border-color: var(--lam-blue);
  color: #ffffff;
}

.mode-tab.active {
  border-color: var(--lam-blue);
  background: rgba(88, 166, 255, 0.18);
  color: #ffffff;
}

.select-control {
  padding: 4px 28px 4px 8px;
}

.icon-button {
  display: inline-grid;
  place-items: center;
  width: 28px;
  padding: 0;
}

.primary-action {
  border-color: rgba(126, 231, 135, 0.45);
  background: rgba(46, 160, 67, 0.18);
  color: var(--lam-green);
}

.dashboard-mode {
  min-width: 0;
}

.panel {
  min-width: 0;
  min-height: 0;
  border: 1px solid var(--lam-line);
  border-radius: 6px;
  background: rgba(21, 27, 35, 0.9);
  box-shadow: var(--lam-shadow);
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 11px 14px 8px;
  border-bottom: 1px solid rgba(44, 54, 66, 0.72);
}

.panel-heading {
  min-width: 0;
}

.panel-title {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
}

.panel-subtitle {
  margin: 3px 0 0;
  color: var(--lam-muted);
}

.panel-body {
  min-width: 0;
  padding: 12px 14px 14px;
}

.live-grid {
  display: grid;
  grid-template-rows: auto minmax(310px, 1fr) minmax(210px, 0.76fr) auto;
  gap: 10px;
  min-height: calc(100vh - 76px);
}

.current-change-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 360px);
  gap: 14px;
  align-items: stretch;
}

.change-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  color: var(--lam-muted);
  margin-bottom: 12px;
}

.auto-refresh {
  color: var(--lam-blue);
}

.breadcrumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 9px 11px;
  border-radius: 5px;
  background: rgba(88, 166, 255, 0.09);
  color: var(--lam-blue);
  max-width: 720px;
}

.breadcrumb span:not(:last-child)::after {
  content: ">";
  margin-left: 8px;
  color: var(--lam-muted);
}

.risk-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.risk-card,
.metric-card,
.health-card,
.summary-card,
.validation-card {
  min-width: 0;
  border: 1px solid var(--lam-line);
  border-radius: 6px;
  background: linear-gradient(180deg, rgba(28, 36, 46, 0.92), rgba(18, 24, 31, 0.92));
  padding: 11px;
}

.risk-card.high,
.summary-card.removed {
  border-color: rgba(255, 123, 114, 0.5);
  background: linear-gradient(180deg, rgba(83, 27, 33, 0.44), rgba(30, 21, 25, 0.95));
}

.risk-card.medium,
.summary-card.changed {
  border-color: rgba(255, 166, 87, 0.55);
  background: linear-gradient(180deg, rgba(85, 55, 20, 0.42), rgba(30, 24, 18, 0.95));
}

.risk-card.low,
.summary-card.added {
  border-color: rgba(126, 231, 135, 0.5);
  background: linear-gradient(180deg, rgba(30, 80, 46, 0.38), rgba(18, 30, 23, 0.95));
}

.risk-label,
.metric-label,
.health-label,
.summary-label {
  color: var(--lam-muted);
}

.risk-value,
.metric-value,
.summary-value {
  margin-top: 8px;
  font-size: 25px;
  line-height: 1;
  color: #ffffff;
}

.risk-card.high .risk-label,
.risk-card.high .risk-value {
  color: var(--lam-red);
}

.risk-card.medium .risk-label,
.risk-card.medium .risk-value {
  color: var(--lam-yellow);
}

.risk-card.low .risk-label,
.risk-card.low .risk-value {
  color: var(--lam-green);
}

.large-graph-panel .panel-body,
.dependency-panel .panel-body,
.whole-diagram-panel .panel-body,
.internal-graph-panel .panel-body,
.before-after-panel .panel-body {
  height: 100%;
  min-height: 0;
}

.large-graph-panel {
  min-height: 310px;
}

.lower-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 0.78fr);
  gap: 10px;
  min-width: 0;
}

.table-wrap {
  min-width: 0;
  overflow: auto;
}

.data-table {
  width: 100%;
  min-width: 560px;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 7px 8px;
  border-bottom: 1px solid rgba(44, 54, 66, 0.68);
  text-align: left;
  white-space: nowrap;
}

.data-table th {
  color: var(--lam-muted);
  font-weight: 550;
}

.data-table td.path-cell {
  max-width: 360px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-pill,
.risk-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  padding: 2px 6px;
  border-radius: 999px;
  border: 1px solid var(--lam-line);
  font-size: 12px;
}

.risk-pill.high {
  color: var(--lam-red);
  border-color: rgba(255, 123, 114, 0.55);
}

.risk-pill.medium {
  color: var(--lam-yellow);
  border-color: rgba(242, 204, 96, 0.55);
}

.risk-pill.low {
  color: var(--lam-green);
  border-color: rgba(126, 231, 135, 0.55);
}

.validation-row {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
}

.validation-card {
  min-height: 84px;
}

.validation-label {
  font-weight: 600;
  margin-bottom: 7px;
}

.validation-state.passed {
  color: var(--lam-green);
}

.validation-state.running {
  color: var(--lam-yellow);
}

.validation-state.failed {
  color: var(--lam-red);
}

.validation-detail {
  margin-top: 5px;
  color: var(--lam-muted);
  font-size: 12px;
}

.graph-stage {
  position: relative;
  width: 100%;
  min-width: 0;
  height: 100%;
  min-height: 220px;
  border-radius: 5px;
  background:
    linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
  background-size: 34px 34px;
  overflow: hidden;
}

.graph-svg {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 220px;
}

.feature-node rect,
.module-node rect {
  stroke-width: 1.3;
}

.node-label {
  fill: #e6edf3;
  font-size: 13px;
  font-weight: 650;
}

.node-small {
  fill: #c6d0dc;
  font-size: 11px;
}

.edge-line {
  stroke: rgba(205, 217, 229, 0.78);
  stroke-width: 2;
  fill: none;
  marker-end: url(#arrow);
}

.edge-line.dashed {
  stroke-dasharray: 6 5;
  opacity: 0.75;
}

.whole-layout,
.feature-layout,
.diff-layout {
  display: grid;
  gap: 10px;
  min-height: calc(100vh - 76px);
}

.whole-layout {
  grid-template-columns: 260px minmax(0, 1fr);
}

.mode-sidebar {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.nav-list,
.compact-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav-list li,
.compact-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid rgba(44, 54, 66, 0.48);
  color: var(--lam-text);
}

.nav-list li:last-child,
.compact-list li:last-child {
  border-bottom: 0;
}

.count-badge {
  display: inline-grid;
  place-items: center;
  min-width: 22px;
  height: 20px;
  border-radius: 999px;
  background: rgba(139, 148, 158, 0.18);
  color: var(--lam-muted);
  font-size: 12px;
}

.whole-main {
  display: grid;
  grid-template-rows: minmax(420px, 1fr) minmax(150px, auto);
  gap: 10px;
  min-width: 0;
}

.overview-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;
}

.metric-grid,
.health-grid,
.summary-grid {
  display: grid;
  gap: 10px;
}

.metric-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.health-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.health-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.health-value.good {
  color: var(--lam-green);
}

.health-value.warn {
  color: var(--lam-yellow);
}

.health-value.info {
  color: var(--lam-blue);
}

.feature-layout {
  grid-template-columns: 250px minmax(0, 1fr);
}

.feature-main {
  display: grid;
  grid-template-rows: auto minmax(280px, 0.95fr) minmax(210px, 0.7fr);
  gap: 10px;
  min-width: 0;
}

.feature-selector-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.feature-top-split,
.feature-bottom-split {
  display: grid;
  grid-template-columns: minmax(0, 0.86fr) minmax(0, 1fr);
  gap: 10px;
  min-width: 0;
}

.module-composition {
  display: grid;
  grid-template-columns: repeat(4, minmax(82px, 1fr));
  gap: 8px;
  align-content: center;
  min-height: 190px;
}

.module-chip {
  border: 1px solid var(--lam-line-strong);
  border-radius: 5px;
  padding: 8px;
  min-height: 40px;
  background: rgba(24, 33, 43, 0.88);
  color: var(--lam-text);
  text-align: center;
  overflow-wrap: anywhere;
}

.external-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.external-card {
  min-width: 0;
  border: 1px solid var(--lam-line);
  border-radius: 6px;
  background: rgba(24, 33, 43, 0.86);
  padding: 10px;
}

.external-title {
  color: var(--lam-blue);
  font-weight: 650;
  margin-bottom: 8px;
}

.test-list li {
  color: var(--lam-text);
}

.test-state {
  color: var(--lam-green);
}

.diff-layout {
  grid-template-columns: 250px minmax(0, 1fr);
}

.diff-main {
  display: grid;
  grid-template-rows: auto auto minmax(330px, 1fr);
  gap: 10px;
  min-width: 0;
}

.baseline-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 14px;
  border: 1px solid var(--lam-line);
  border-radius: 6px;
  background: rgba(21, 27, 35, 0.88);
}

.summary-grid {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.diff-content-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 0.78fr);
  gap: 10px;
  min-width: 0;
}

.diff-right-stack {
  display: grid;
  grid-template-rows: minmax(190px, 0.85fr) minmax(190px, 0.9fr);
  gap: 10px;
  min-width: 0;
}

.empty-baseline {
  display: grid;
  place-items: center;
  min-height: 380px;
  text-align: center;
}

.empty-baseline h2 {
  margin: 0 0 8px;
  font-size: 22px;
}

.timeline-svg {
  width: 100%;
  height: 180px;
}

@media (max-width: 1180px) {
  .dashboard-toolbar,
  .current-change-grid,
  .lower-split,
  .whole-layout,
  .feature-layout,
  .diff-layout,
  .overview-row,
  .feature-top-split,
  .feature-bottom-split,
  .diff-content-split {
    grid-template-columns: 1fr;
  }

  .validation-row,
  .metric-grid,
  .health-grid,
  .summary-grid,
  .external-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .dashboard-root {
    padding: 8px;
  }

  .toolbar-actions,
  .mode-tabs {
    justify-content: flex-start;
  }

  .risk-grid,
  .validation-row,
  .metric-grid,
  .health-grid,
  .summary-grid,
  .external-grid,
  .module-composition {
    grid-template-columns: 1fr;
  }
}
`;
