import {
  ChangedFile,
  DashboardMode,
  DashboardState,
  FeatureBlock,
  ModuleNode,
  ValidationStatus,
  dashboardModes,
  getModeLabel
} from "./dashboardState";

export function renderDashboardShell(state: DashboardState): string {
  return `
    <main class="dashboard-root" data-testid="dashboard-root" data-mode="${escapeAttribute(state.mode)}">
      <div class="dashboard-shell">
        ${renderTopToolbar(state)}
        <section class="dashboard-mode">
          ${renderModeContent(state)}
        </section>
      </div>
    </main>
  `;
}

export function renderTopToolbar(state: DashboardState): string {
  return `
    <header class="dashboard-toolbar">
      <div class="toolbar-title">
        <h1>Live Architecture Map</h1>
        <p>${escapeHtml(state.workspace.name)} · ${escapeHtml(getModeLabel(state.mode))} · Mock validation state</p>
      </div>
      ${renderModeTabs(state)}
      <div class="toolbar-actions" aria-label="Dashboard actions">
        <button class="toolbar-button" type="button" data-command="refresh" title="Refresh dashboard">Refresh</button>
        <button class="toolbar-button" type="button" data-command="exportSnapshot" title="Export snapshot">Export</button>
        <button class="toolbar-button" type="button" title="Configure extension settings">Configure</button>
        <button class="toolbar-button" type="button" title="Open structural timeline">Timeline</button>
      </div>
    </header>
  `;
}

export function renderModeTabs(state: DashboardState): string {
  return `
    <nav class="mode-tabs" aria-label="Dashboard modes">
      ${dashboardModes.map((mode) => renderModeTab(mode, state.mode)).join("")}
    </nav>
  `;
}

export function renderLiveChangesMode(state: DashboardState): string {
  return `
    <div class="live-grid">
      ${renderCurrentChangeArea(state)}
      <section class="panel large-graph-panel" data-testid="architecture-impact-graph">
        <div class="panel-header">
          <div class="panel-heading">
            <h2 class="panel-title">Architecture Impact Graph</h2>
            <p class="panel-subtitle">Changed code impact across feature blocks and dependency paths.</p>
          </div>
          ${renderGraphControls()}
        </div>
        <div class="panel-body">
          ${renderFeatureImpactGraph(state)}
        </div>
      </section>
      <div class="lower-split">
        ${renderChangedFilesTable(state)}
        <section class="panel dependency-panel" data-testid="dependency-graph">
          <div class="panel-header">
            <div class="panel-heading">
              <h2 class="panel-title">Dependency Graph</h2>
              <p class="panel-subtitle">Python import relationships around changed modules.</p>
            </div>
            ${renderZoomControls()}
          </div>
          <div class="panel-body">
            ${renderDependencyGraph(state)}
          </div>
        </section>
      </div>
      ${renderValidationStatus(state)}
    </div>
  `;
}

export function renderWholeArchitectureMode(state: DashboardState): string {
  const architectureFeatures = getArchitectureFeatures(state);

  return `
    <div class="whole-layout">
      <aside class="mode-sidebar">
        <section class="panel">
          <div class="panel-header">
            <div class="panel-heading">
              <h2 class="panel-title">Feature Blocks</h2>
              <p class="panel-subtitle">Feature-level structure.</p>
            </div>
          </div>
          <div class="panel-body">
            <ul class="nav-list">
              ${architectureFeatures.map((feature) => `
                <li>
                  <span>${escapeHtml(feature.label)}</span>
                  <span class="count-badge">${feature.moduleIds.length}</span>
                </li>
              `).join("")}
            </ul>
          </div>
        </section>
        <section class="panel">
          <div class="panel-header">
            <div class="panel-heading">
              <h2 class="panel-title">Entry Points</h2>
              <p class="panel-subtitle">Primary launch surfaces.</p>
            </div>
          </div>
          <div class="panel-body">
            <ul class="compact-list">
              <li><span>Main GUI</span><span class="count-badge">1</span></li>
              <li><span>ROS2 Nodes</span><span class="count-badge">4</span></li>
              <li><span>CLI Tools</span><span class="count-badge">3</span></li>
              <li><span>Launch Files</span><span class="count-badge">5</span></li>
            </ul>
          </div>
        </section>
        <section class="panel">
          <div class="panel-header">
            <div class="panel-heading">
              <h2 class="panel-title">Architecture Views</h2>
              <p class="panel-subtitle">Static first-pass views.</p>
            </div>
          </div>
          <div class="panel-body">
            <ul class="compact-list">
              <li><span>Whole Diagram</span><span class="count-badge">On</span></li>
              <li><span>Module Graph</span><span class="count-badge">38</span></li>
              <li><span>Folder Structure</span><span class="count-badge">8</span></li>
              <li><span>Config Flow</span><span class="count-badge">3</span></li>
              <li><span>Runtime Flow</span><span class="count-badge">4</span></li>
            </ul>
          </div>
        </section>
      </aside>
      <div class="whole-main">
        <section class="panel whole-diagram-panel" data-testid="whole-architecture-diagram">
          <div class="panel-header">
            <div class="panel-heading">
              <h2 class="panel-title">Feature-Level Architecture Diagram</h2>
              <p class="panel-subtitle">The full mock architecture grouped by feature block.</p>
            </div>
            ${renderGraphControls()}
          </div>
          <div class="panel-body">
            ${renderWholeArchitectureGraph(state)}
          </div>
        </section>
        <div class="overview-row">
          <section class="panel" data-testid="architecture-overview-cards">
            <div class="panel-header">
              <div class="panel-heading">
                <h2 class="panel-title">Architecture Overview</h2>
                <p class="panel-subtitle">Static mock summary for the current workspace.</p>
              </div>
            </div>
            <div class="panel-body metric-grid">
              ${renderMetricCard("Total Python Files", state.snapshot.health.totalPythonFiles)}
              ${renderMetricCard("Total Modules", state.snapshot.health.totalModules)}
              ${renderMetricCard("Total Classes", state.snapshot.health.totalClasses)}
              ${renderMetricCard("Total Functions", state.snapshot.health.totalFunctions)}
            </div>
          </section>
          <section class="panel" data-testid="architecture-health-cards">
            <div class="panel-header">
              <div class="panel-heading">
                <h2 class="panel-title">Architecture Health</h2>
                <p class="panel-subtitle">Validation-first health indicators.</p>
              </div>
            </div>
            <div class="panel-body health-grid">
              ${renderHealthCard("Circular Dependencies", state.snapshot.health.circularDependencyCount, "good")}
              ${renderHealthCard("High-Risk Modules", state.snapshot.health.highRiskModuleCount, "warn")}
              ${renderHealthCard("Orphan Modules", state.snapshot.health.orphanModuleCount, "warn")}
              ${renderHealthCard("Estimated Test Coverage", `${state.snapshot.health.estimatedTestCoverage}%`, "info")}
            </div>
          </section>
        </div>
      </div>
    </div>
  `;
}

export function renderFeatureFocusMode(state: DashboardState): string {
  const selectedFeature = getSelectedFeature(state);
  const selectedModules = getModulesForFeature(state, selectedFeature.id);
  const externalFeatures = state.snapshot.featureBlocks
    .filter((feature) => feature.id !== selectedFeature.id)
    .slice(0, 4);
  const tests = state.snapshot.modules.filter((moduleNode) => moduleNode.isTest).slice(0, 5);

  return `
    <div class="feature-layout">
      <aside class="mode-sidebar">
        <section class="panel">
          <div class="panel-header">
            <div class="panel-heading">
              <h2 class="panel-title">Feature Focus</h2>
              <p class="panel-subtitle">Selected feature and related modules.</p>
            </div>
          </div>
          <div class="panel-body">
            <label for="feature-selector-control">Target feature</label>
            <select id="feature-selector-control" class="select-control" data-testid="feature-selector" data-command="selectFeature">
              ${state.snapshot.featureBlocks.map((feature) => `
                <option value="${escapeAttribute(feature.id)}"${feature.id === selectedFeature.id ? " selected" : ""}>${escapeHtml(feature.label)}</option>
              `).join("")}
            </select>
          </div>
        </section>
        <section class="panel">
          <div class="panel-header">
            <div class="panel-heading">
              <h2 class="panel-title">Related Modules</h2>
              <p class="panel-subtitle">${selectedModules.length} modules in focus.</p>
            </div>
          </div>
          <div class="panel-body">
            <ul class="compact-list">
              ${selectedModules.map((moduleNode) => `
                <li>
                  <span>${escapeHtml(moduleNode.name)}</span>
                  <span class="risk-pill ${moduleNode.riskLevel}">${escapeHtml(moduleNode.riskLevel)}</span>
                </li>
              `).join("")}
            </ul>
          </div>
        </section>
        <section class="panel">
          <div class="panel-header">
            <div class="panel-heading">
              <h2 class="panel-title">Nearby Features</h2>
              <p class="panel-subtitle">External feature context.</p>
            </div>
          </div>
          <div class="panel-body">
            <ul class="compact-list">
              ${externalFeatures.map((feature) => `
                <li>
                  <span>${escapeHtml(feature.label)}</span>
                  <span class="risk-pill ${feature.riskLevel}">${escapeHtml(feature.riskLevel)}</span>
                </li>
              `).join("")}
            </ul>
          </div>
        </section>
      </aside>
      <div class="feature-main">
        <div class="feature-selector-row">
          <div>
            <h2 class="panel-title">${escapeHtml(selectedFeature.label)} Feature Detail</h2>
            <p class="panel-subtitle">${escapeHtml(selectedFeature.description)}</p>
          </div>
          <div class="inline-actions">
            <span class="risk-pill ${selectedFeature.riskLevel}">${escapeHtml(selectedFeature.riskLevel)} risk</span>
            <button class="toolbar-button" type="button" data-command="refresh">Refresh</button>
          </div>
        </div>
        <div class="feature-top-split">
          <section class="panel" data-testid="module-composition-panel">
            <div class="panel-header">
              <div class="panel-heading">
                <h2 class="panel-title">Module Composition</h2>
                <p class="panel-subtitle">Modules grouped under the selected feature.</p>
              </div>
            </div>
            <div class="panel-body module-composition">
              ${selectedModules.map((moduleNode) => `
                <div class="module-chip">${escapeHtml(moduleNode.name)}</div>
              `).join("")}
            </div>
          </section>
          <section class="panel internal-graph-panel" data-testid="internal-dependency-graph">
            <div class="panel-header">
              <div class="panel-heading">
                <h2 class="panel-title">Internal Dependency Graph</h2>
                <p class="panel-subtitle">Imports within ${escapeHtml(selectedFeature.label)}.</p>
              </div>
              ${renderZoomControls()}
            </div>
            <div class="panel-body">
              ${renderInternalDependencyGraph(selectedModules)}
            </div>
          </section>
        </div>
        <div class="feature-bottom-split">
          <section class="panel" data-testid="related-external-dependencies">
            <div class="panel-header">
              <div class="panel-heading">
                <h2 class="panel-title">Related External Dependencies</h2>
                <p class="panel-subtitle">Feature blocks that interact with this feature.</p>
              </div>
            </div>
            <div class="panel-body external-grid">
              ${externalFeatures.map((feature) => `
                <article class="external-card">
                  <div class="external-title">${escapeHtml(feature.label)}</div>
                  <div>${feature.moduleIds.slice(0, 2).map((moduleId) => escapeHtml(getModuleName(state, moduleId))).join("<br>")}</div>
                </article>
              `).join("")}
            </div>
          </section>
          <section class="panel" data-testid="related-tests">
            <div class="panel-header">
              <div class="panel-heading">
                <h2 class="panel-title">Related Tests</h2>
                <p class="panel-subtitle">Candidate tests for this focus area.</p>
              </div>
            </div>
            <div class="panel-body">
              <ul class="compact-list test-list">
                ${tests.map((testModule) => `
                  <li>
                    <span>${escapeHtml(testModule.path)}</span>
                    <span class="test-state">Passed</span>
                  </li>
                `).join("")}
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  `;
}

export function renderDiffSinceBaselineMode(state: DashboardState): string {
  const diff = state.baselineDiff;

  if (!diff) {
    return `
      <section class="panel empty-baseline" data-testid="baseline-selector">
        <div>
          <h2>No baseline captured yet</h2>
          <p class="panel-subtitle">Capture a baseline before comparing structural changes.</p>
          <button class="primary-action" type="button" data-command="captureBaseline">Capture Baseline</button>
        </div>
      </section>
    `;
  }

  return `
    <div class="diff-layout">
      <aside class="mode-sidebar">
        <section class="panel">
          <div class="panel-header">
            <div class="panel-heading">
              <h2 class="panel-title">Diff View</h2>
              <p class="panel-subtitle">Baseline comparison controls.</p>
            </div>
          </div>
          <div class="panel-body">
            <ul class="compact-list">
              <li><span>Added Modules</span><span class="count-badge">${diff.addedModules.length}</span></li>
              <li><span>Removed Modules</span><span class="count-badge">${diff.removedModules.length}</span></li>
              <li><span>Changed Modules</span><span class="count-badge">${diff.changedModules.length}</span></li>
              <li><span>Added Dependencies</span><span class="count-badge">${diff.addedEdges.length}</span></li>
              <li><span>Removed Dependencies</span><span class="count-badge">${diff.removedEdges.length}</span></li>
            </ul>
          </div>
        </section>
        <section class="panel">
          <div class="panel-header">
            <div class="panel-heading">
              <h2 class="panel-title">Impacted Features</h2>
              <p class="panel-subtitle">Changed feature risk.</p>
            </div>
          </div>
          <div class="panel-body">
            <ul class="compact-list">
              ${diff.changedFeatures.map((feature) => `
                <li>
                  <span>${escapeHtml(feature.label)}</span>
                  <span class="risk-pill ${feature.riskLevel}">${escapeHtml(feature.riskLevel)}</span>
                </li>
              `).join("")}
            </ul>
          </div>
        </section>
      </aside>
      <div class="diff-main">
        <div class="baseline-controls" data-testid="baseline-selector">
          <div>
            <strong>Compare baseline</strong>
            <span class="panel-subtitle">baseline_2024-05-15 to current mock structure</span>
          </div>
          <div class="inline-actions">
            <select class="select-control" aria-label="Baseline selector">
              <option>baseline_2024-05-15</option>
            </select>
            <button class="primary-action" type="button" data-command="captureBaseline">Capture Baseline</button>
            <button class="toolbar-button" type="button" data-command="showDiffSinceBaseline">Compare</button>
          </div>
        </div>
        <section class="summary-grid" data-testid="baseline-summary-cards">
          ${renderSummaryCard("Added Modules", diff.addedModules.length, "25% up", "added")}
          ${renderSummaryCard("Removed Modules", diff.removedModules.length, "14% down", "removed")}
          ${renderSummaryCard("Changed Modules", diff.changedModules.length, "31% up", "changed")}
          ${renderSummaryCard("Added Dependencies", diff.addedEdges.length, "18% up", "added")}
          ${renderSummaryCard("Removed Dependencies", diff.removedEdges.length, "12% down", "removed")}
        </section>
        <div class="diff-content-split">
          <section class="panel before-after-panel" data-testid="before-after-graph">
            <div class="panel-header">
              <div class="panel-heading">
                <h2 class="panel-title">Before / After Dependency Comparison</h2>
                <p class="panel-subtitle">Structural change from baseline to current state.</p>
              </div>
            </div>
            <div class="panel-body">
              ${renderBeforeAfterGraph()}
            </div>
          </section>
          <div class="diff-right-stack">
            <section class="panel" data-testid="top-changes-table">
              <div class="panel-header">
                <div class="panel-heading">
                  <h2 class="panel-title">Top Structural Changes</h2>
                  <p class="panel-subtitle">Largest dependency shifts since baseline.</p>
                </div>
              </div>
              <div class="panel-body table-wrap">
                ${renderTopChangesTable(state)}
              </div>
            </section>
            <section class="panel" data-testid="structural-timeline">
              <div class="panel-header">
                <div class="panel-heading">
                  <h2 class="panel-title">Structural Timeline</h2>
                  <p class="panel-subtitle">Modules, dependencies, and test coverage over time.</p>
                </div>
              </div>
              <div class="panel-body">
                ${renderStructuralTimeline()}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderFeatureImpactGraph(state: DashboardState): string {
  const graphNodes = getImpactGraphNodes(state);
  const featureMap = new Map(state.snapshot.featureBlocks.map((feature) => [feature.id, feature]));

  return `
    <div class="graph-stage">
      <svg class="graph-svg" viewBox="0 0 1220 360" role="img" aria-label="Feature impact graph">
        ${renderSvgDefs()}
        <path class="edge-line" d="M240 100 H340" />
        <path class="edge-line" d="M560 100 H650" />
        <path class="edge-line" d="M880 100 H960" />
        <path class="edge-line dashed" d="M135 153 V276 H220" />
        <path class="edge-line dashed" d="M450 153 V220" />
        <path class="edge-line dashed" d="M765 153 V276 H450" />
        <path class="edge-line dashed" d="M1070 153 V276 H450" />
        ${graphNodes.map((node) => renderFeatureNode(featureMap.get(node.id), node.x, node.y, node.w, node.h, node.color)).join("")}
      </svg>
    </div>
  `;
}

function getImpactGraphNodes(state: DashboardState): Array<{ id: string; x: number; y: number; w: number; h: number; color: string }> {
  const mockNodes = [
    { id: "config-system", x: 30, y: 48, w: 210, h: 105, color: "#ff7b72" },
    { id: "operator-panel-startup", x: 340, y: 48, w: 220, h: 105, color: "#ffa657" },
    { id: "launcher-subprocess-env", x: 650, y: 48, w: 230, h: 105, color: "#58a6ff" },
    { id: "ros-launch-runtime", x: 960, y: 48, w: 220, h: 105, color: "#7ee787" },
    { id: "tests-config-scanner", x: 220, y: 220, w: 230, h: 95, color: "#76e3ea" }
  ];

  if (mockNodes.some((node) => state.snapshot.featureBlocks.some((feature) => feature.id === node.id))) {
    return mockNodes;
  }

  const fixedSlots = [
    { x: 30, y: 48, w: 210, h: 105, color: "#ff7b72" },
    { x: 340, y: 48, w: 220, h: 105, color: "#ffa657" },
    { x: 650, y: 48, w: 230, h: 105, color: "#58a6ff" },
    { x: 960, y: 48, w: 220, h: 105, color: "#7ee787" },
    { x: 220, y: 220, w: 230, h: 95, color: "#76e3ea" }
  ];
  const impactedIds = new Set(state.snapshot.impactedFeatures.map((feature) => feature.featureId));
  const selectedFeatures = [
    ...state.snapshot.featureBlocks.filter((feature) => impactedIds.has(feature.id)),
    ...state.snapshot.featureBlocks.filter((feature) => !impactedIds.has(feature.id))
  ].slice(0, fixedSlots.length);

  return selectedFeatures.map((feature, index) => ({
    id: feature.id,
    ...fixedSlots[index]!
  }));
}

export function renderDependencyGraph(state: DashboardState): string {
  const nodes = [
    { id: "operator-launcher", label: "operator_panel.launcher", x: 410, y: 30, color: "#b17cff" },
    { id: "runtime-config", label: "abb_common.config.runtime_config", x: 170, y: 125, color: "#b17cff" },
    { id: "ros-launcher", label: "launch.ros_launcher", x: 650, y: 125, color: "#58a6ff" },
    { id: "config-loader", label: "abb_common.config.config_loader", x: 180, y: 245, color: "#4f7cff" },
    { id: "env-loader", label: "abb_common.config.env_loader", x: 415, y: 245, color: "#816bff" },
    { id: "test-runtime-config", label: "tests.config.test_runtime_config", x: 665, y: 245, color: "#4f7cff" }
  ];

  return `
    <div class="graph-stage">
      <svg class="graph-svg" viewBox="0 0 800 320" role="img" aria-label="Dependency graph">
        ${renderSvgDefs()}
        <path class="edge-line" d="M410 52 L190 118" />
        <path class="edge-line" d="M430 52 L650 118" />
        <path class="edge-line" d="M190 147 L190 224" />
        <path class="edge-line" d="M220 135 L390 235" />
        <path class="edge-line" d="M640 147 L435 235" />
        <path class="edge-line" d="M650 147 L665 224" />
        <path class="edge-line" d="M410 224 V62" />
        ${nodes.map((node) => `
          <g>
            <circle cx="${node.x}" cy="${node.y}" r="13" fill="${node.color}" stroke="#d7dde6" stroke-width="1.2" />
            <text x="${node.x + 18}" y="${node.y + 4}" class="node-small">${escapeHtml(node.label)}</text>
          </g>
        `).join("")}
      </svg>
    </div>
  `;
}

export function renderChangedFilesTable(state: DashboardState): string {
  return `
    <section class="panel" data-testid="changed-files-table">
      <div class="panel-header">
        <div class="panel-heading">
          <h2 class="panel-title">Changed Files</h2>
          <p class="panel-subtitle">Recent modified files mapped to features.</p>
        </div>
      </div>
      <div class="panel-body table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>File</th>
              <th>Status</th>
              <th>Feature</th>
              <th>Last Change</th>
            </tr>
          </thead>
          <tbody>
            ${state.snapshot.changedFiles.map((file) => renderChangedFileRow(file, state)).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

export function renderValidationStatus(state: DashboardState): string {
  return `
    <section class="panel" data-testid="validation-status-row">
      <div class="panel-header">
        <div class="panel-heading">
          <h2 class="panel-title">Validation Status</h2>
          <p class="panel-subtitle">Automated quality and confidence checks.</p>
        </div>
      </div>
      <div class="panel-body validation-row">
        ${state.snapshot.validations.map((validation) => renderValidationCard(validation)).join("")}
      </div>
    </section>
  `;
}

function renderModeContent(state: DashboardState): string {
  switch (state.mode) {
    case "liveChanges":
      return renderLiveChangesMode(state);
    case "wholeArchitecture":
      return renderWholeArchitectureMode(state);
    case "featureFocus":
      return renderFeatureFocusMode(state);
    case "diffSinceBaseline":
      return renderDiffSinceBaselineMode(state);
  }
}

function renderCurrentChangeArea(state: DashboardState): string {
  const risks = state.snapshot.risks;
  const breadcrumbLabels = state.snapshot.impactedFeatures.length > 0
    ? state.snapshot.impactedFeatures.slice(0, 3).map((feature) => feature.label)
    : state.snapshot.featureBlocks.slice(0, 3).map((feature) => feature.label);

  return `
    <section class="panel" data-testid="current-change-area">
      <div class="panel-body current-change-grid">
        <div>
          <h2 class="panel-title">Current Change Area</h2>
          <div class="change-meta">
            <span>Feature path / breadcrumb</span>
            <span>Last updated: ${escapeHtml(formatTime(state.workspace.lastUpdatedIso))}</span>
            <span class="auto-refresh">${state.workspace.autoRefresh ? "Auto Refresh On" : "Auto Refresh Off"}</span>
          </div>
          <div class="breadcrumb">
            ${breadcrumbLabels.map((label) => `<span>${escapeHtml(label)}</span>`).join("")}
          </div>
        </div>
        <div class="risk-grid">
          ${renderRiskCard("risk-card-high", risks.find((risk) => risk.level === "high"), "high")}
          ${renderRiskCard("risk-card-medium", risks.find((risk) => risk.level === "medium"), "medium")}
          ${renderRiskCard("risk-card-low", risks.find((risk) => risk.level === "low"), "low")}
        </div>
      </div>
    </section>
  `;
}

function renderModeTab(mode: DashboardMode, currentMode: DashboardMode): string {
  const isActive = mode === currentMode;
  return `
    <button
      class="mode-tab${isActive ? " active" : ""}"
      type="button"
      data-testid="mode-${escapeAttribute(mode)}"
      data-mode="${escapeAttribute(mode)}"
      aria-pressed="${isActive ? "true" : "false"}"
    >${escapeHtml(getModeLabel(mode))}</button>
  `;
}

function renderGraphControls(): string {
  return `
    <div class="panel-actions">
      <select class="select-control" aria-label="Graph layout">
        <option>Layout: LR</option>
        <option>Layout: TB</option>
      </select>
      ${renderZoomControls()}
    </div>
  `;
}

function renderZoomControls(): string {
  return `
    <div class="panel-actions" aria-label="Graph zoom controls">
      <span class="panel-subtitle">Zoom</span>
      <button class="icon-button" type="button" title="Zoom out">-</button>
      <button class="icon-button" type="button" title="Zoom in">+</button>
      <button class="icon-button" type="button" title="Fit to view">[]</button>
    </div>
  `;
}

function renderRiskCard(testId: string, risk: { label: string; count: number; detail: string } | undefined, level: "high" | "medium" | "low"): string {
  const fallback = {
    label: capitalize(level),
    count: 0,
    detail: "No mock risk items."
  };
  const card = risk ?? fallback;

  return `
    <article class="risk-card ${level}" data-testid="${testId}">
      <div class="risk-label">${escapeHtml(card.label)}</div>
      <div class="risk-value">${card.count}</div>
      <div class="validation-detail">${escapeHtml(card.detail)}</div>
    </article>
  `;
}

function renderFeatureNode(feature: FeatureBlock | undefined, x: number, y: number, width: number, height: number, color: string): string {
  const safeFeature = feature ?? {
    id: "unknown",
    label: "Unknown",
    description: "",
    pathPatterns: [],
    moduleIds: [],
    incomingEdges: 0,
    outgoingEdges: 0,
    changedFileCount: 0,
    riskLevel: "low" as const
  };
  const moduleLines = safeFeature.moduleIds.slice(0, 3).map((moduleId, index) => `
    <text x="${x + 14}" y="${y + 47 + index * 20}" class="node-small">${escapeHtml(moduleId.replaceAll("-", "_"))}</text>
  `).join("");

  return `
    <g class="feature-node">
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="8" fill="${color}20" stroke="${color}" />
      <text x="${x + 14}" y="${y + 25}" class="node-label" fill="${color}">${escapeHtml(safeFeature.label)}</text>
      ${moduleLines}
      <rect x="${x + width - 55}" y="${y + height - 28}" width="46" height="20" rx="4" fill="${color}30" stroke="${color}" />
      <text x="${x + width - 47}" y="${y + height - 14}" class="node-small">${escapeHtml(capitalize(safeFeature.riskLevel))}</text>
    </g>
  `;
}

function renderWholeArchitectureGraph(state: DashboardState): string {
  const nodes = [
    { id: "gui-layer", x: 40, y: 50, w: 150, h: 120, color: "#b17cff" },
    { id: "task-runner", x: 260, y: 50, w: 170, h: 120, color: "#ffa657" },
    { id: "motion-planning", x: 520, y: 50, w: 180, h: 120, color: "#58a6ff" },
    { id: "safety-layer", x: 780, y: 50, w: 160, h: 120, color: "#76e3ea" },
    { id: "robot-io-layer", x: 1020, y: 50, w: 165, h: 120, color: "#f2cc60" },
    { id: "abb-controller", x: 1260, y: 70, w: 155, h: 100, color: "#b17cff" },
    { id: "config-system", x: 200, y: 250, w: 210, h: 120, color: "#7ee787" },
    { id: "utils-common", x: 560, y: 250, w: 190, h: 120, color: "#8d99a8" }
  ];
  const featureMap = new Map(state.snapshot.featureBlocks.map((feature) => [feature.id, feature]));

  return `
    <div class="graph-stage">
      <svg class="graph-svg" viewBox="0 0 1460 430" role="img" aria-label="Whole architecture diagram">
        ${renderSvgDefs()}
        <path class="edge-line" d="M190 110 H260" />
        <path class="edge-line" d="M430 110 H520" />
        <path class="edge-line" d="M700 110 H780" />
        <path class="edge-line" d="M940 110 H1020" />
        <path class="edge-line" d="M1185 110 H1260" />
        <path class="edge-line" d="M345 170 V250" />
        <path class="edge-line dashed" d="M630 170 V250" />
        <path class="edge-line dashed" d="M860 170 V320 H750" />
        <path class="edge-line dashed" d="M1080 170 V315 H750" />
        <path class="edge-line dashed" d="M410 310 H560" />
        ${nodes.map((node) => renderFeatureNode(featureMap.get(node.id), node.x, node.y, node.w, node.h, node.color)).join("")}
      </svg>
    </div>
  `;
}

function renderInternalDependencyGraph(modules: ModuleNode[]): string {
  const visibleModules = modules.slice(0, 8);
  const nodeCount = Math.max(visibleModules.length, 1);
  const centerX = 390;
  const centerY = 160;
  const radius = 105;
  const nodes = visibleModules.map((moduleNode, index) => {
    const angle = (Math.PI * 2 * index) / nodeCount - Math.PI / 2;
    return {
      moduleNode,
      x: Math.round(centerX + Math.cos(angle) * radius),
      y: Math.round(centerY + Math.sin(angle) * radius)
    };
  });

  return `
    <div class="graph-stage">
      <svg class="graph-svg" viewBox="0 0 780 320" role="img" aria-label="Internal dependency graph">
        ${renderSvgDefs()}
        ${nodes.map((node, index) => {
          const target = nodes[(index + 2) % nodes.length] ?? node;
          return `<path class="edge-line" d="M${node.x} ${node.y} L${target.x} ${target.y}" />`;
        }).join("")}
        ${nodes.map((node) => `
          <g>
            <circle cx="${node.x}" cy="${node.y}" r="12" fill="#58a6ff" stroke="#d7dde6" stroke-width="1.1" />
            <text x="${node.x + 16}" y="${node.y + 4}" class="node-small">${escapeHtml(node.moduleNode.name)}</text>
          </g>
        `).join("")}
      </svg>
    </div>
  `;
}

function renderBeforeAfterGraph(): string {
  return `
    <div class="graph-stage">
      <svg class="graph-svg" viewBox="0 0 920 430" role="img" aria-label="Before after dependency graph">
        ${renderSvgDefs()}
        <text x="60" y="40" class="node-small">Before baseline_2024-05-15</text>
        <text x="540" y="40" class="node-small">After current</text>
        ${renderMiniNetwork(170, 205, "#b17cff", false)}
        <path class="edge-line" d="M410 215 H510" />
        <text x="443" y="198" class="node-label">Diff</text>
        ${renderMiniNetwork(690, 205, "#7ee787", true)}
        <path d="M70 380 H270" stroke="#7ee787" stroke-width="3" />
        <text x="285" y="384" class="node-small">Added dependency</text>
        <path d="M450 380 H650" stroke="#ff7b72" stroke-width="3" stroke-dasharray="7 6" />
        <text x="665" y="384" class="node-small">Removed dependency</text>
      </svg>
    </div>
  `;
}

function renderMiniNetwork(centerX: number, centerY: number, accent: string, changed: boolean): string {
  type SvgPoint = readonly [number, number];
  type SvgLine = readonly [number, number];

  const points: SvgPoint[] = [
    [centerX, centerY - 95],
    [centerX + 80, centerY - 48],
    [centerX + 80, centerY + 48],
    [centerX, centerY + 95],
    [centerX - 80, centerY + 48],
    [centerX - 80, centerY - 48],
    [centerX + 10, centerY],
    [centerX - 18, centerY + 18]
  ];
  const lines: SvgLine[] = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 0],
    [0, 6],
    [6, 2],
    [7, 4]
  ];

  return `
    ${lines.map(([from, to], index) => {
      const start = points[from];
      const end = points[to];
      if (!start || !end) {
        return "";
      }
      const color = changed && index > 5 ? "#7ee787" : "#8d99a8";
      const dash = changed && index === 8 ? " stroke-dasharray=\"7 6\"" : "";
      return `<path d="M${start[0]} ${start[1]} L${end[0]} ${end[1]}" stroke="${color}" stroke-width="2"${dash} />`;
    }).join("")}
    ${points.map(([x, y], index) => `
      <circle cx="${x}" cy="${y}" r="10" fill="${index === 6 ? accent : "#151b23"}" stroke="${index === 6 ? accent : "#d7dde6"}" stroke-width="2" />
    `).join("")}
  `;
}

function renderStructuralTimeline(): string {
  return `
    <svg class="timeline-svg" role="img" aria-label="Structural timeline" viewBox="0 0 680 180">
      <polyline points="24,142 90,90 150,112 210,72 270,88 330,70 390,62 450,105 510,96 570,80 640,42" fill="none" stroke="#58a6ff" stroke-width="3" />
      <polyline points="24,150 90,132 150,138 210,118 270,124 330,116 390,108 450,128 510,122 570,112 640,90" fill="none" stroke="#ffa657" stroke-width="3" />
      <polyline points="24,158 90,148 150,150 210,142 270,144 330,138 390,130 450,142 510,136 570,128 640,112" fill="none" stroke="#7ee787" stroke-width="3" />
      <line x1="24" y1="160" x2="650" y2="160" stroke="#3b4654" />
      <line x1="24" y1="25" x2="24" y2="160" stroke="#3b4654" />
      <text x="25" y="176" class="node-small">05-15</text>
      <text x="210" y="176" class="node-small">05-17</text>
      <text x="390" y="176" class="node-small">05-19</text>
      <text x="590" y="176" class="node-small">05-20</text>
      <text x="548" y="36" class="node-small">Modules</text>
      <text x="548" y="58" class="node-small">Dependencies</text>
      <text x="548" y="80" class="node-small">Tests</text>
    </svg>
  `;
}

function renderMetricCard(label: string, value: number | string): string {
  return `
    <article class="metric-card">
      <div class="metric-label">${escapeHtml(label)}</div>
      <div class="metric-value">${escapeHtml(String(value))}</div>
    </article>
  `;
}

function renderHealthCard(label: string, value: number | string, tone: "good" | "warn" | "info"): string {
  return `
    <article class="health-card">
      <span class="health-label">${escapeHtml(label)}</span>
      <strong class="health-value ${tone}">${escapeHtml(String(value))}</strong>
    </article>
  `;
}

function renderSummaryCard(label: string, value: number, detail: string, tone: "added" | "removed" | "changed"): string {
  return `
    <article class="summary-card ${tone}">
      <div class="summary-label">${escapeHtml(label)}</div>
      <div class="summary-value">${value}</div>
      <div class="validation-detail">${escapeHtml(detail)}</div>
    </article>
  `;
}

function renderTopChangesTable(state: DashboardState): string {
  const rows = state.snapshot.changedFiles.map((file, index) => ({
    path: file.path,
    type: index % 2 === 0 ? "Changed deps" : "Changed module",
    deps: `+${index + 2} deps`
  }));

  return `
    <table class="data-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Path</th>
          <th>Type</th>
          <th>Delta</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((row, index) => `
          <tr>
            <td>${index + 1}</td>
            <td class="path-cell">${escapeHtml(row.path)}</td>
            <td>${escapeHtml(row.type)}</td>
            <td class="test-state">${escapeHtml(row.deps)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderChangedFileRow(file: ChangedFile, state: DashboardState): string {
  const feature = file.featureId
    ? state.snapshot.featureBlocks.find((candidate) => candidate.id === file.featureId)
    : undefined;

  return `
    <tr>
      <td class="path-cell">${escapeHtml(file.path)}</td>
      <td><span class="status-pill">${escapeHtml(getStatusAbbreviation(file.status))}</span></td>
      <td>${escapeHtml(feature?.label ?? "Unknown")}</td>
      <td>${escapeHtml(file.lastChangedIso ? formatTime(file.lastChangedIso) : "Unknown")}</td>
    </tr>
  `;
}

function renderValidationCard(validation: ValidationStatus): string {
  return `
    <article class="validation-card">
      <div class="validation-label">${escapeHtml(validation.label)}</div>
      <div class="validation-state ${validation.state}">${escapeHtml(formatValidationState(validation.state))}</div>
      <div class="validation-detail">${escapeHtml(validation.detail)}</div>
      ${validation.durationMs ? `<div class="validation-detail">${(validation.durationMs / 1000).toFixed(1)}s</div>` : ""}
    </article>
  `;
}

function renderSvgDefs(): string {
  return `
    <defs>
      <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="#c9d1d9" />
      </marker>
    </defs>
  `;
}

function getArchitectureFeatures(state: DashboardState): FeatureBlock[] {
  const architectureIds = new Set([
    "motion-planning",
    "gui-layer",
    "task-runner",
    "safety-layer",
    "robot-io-layer",
    "config-system",
    "utils-common",
    "abb-controller"
  ]);
  return state.snapshot.featureBlocks.filter((feature) => architectureIds.has(feature.id));
}

function getSelectedFeature(state: DashboardState): FeatureBlock {
  const selected = state.snapshot.featureBlocks.find((feature) => feature.id === state.selectedFeatureId);
  return selected ?? state.snapshot.featureBlocks[0]!;
}

function getModulesForFeature(state: DashboardState, featureId: string): ModuleNode[] {
  return state.snapshot.modules.filter((moduleNode) => moduleNode.featureId === featureId);
}

function getModuleName(state: DashboardState, moduleId: string): string {
  return state.snapshot.modules.find((moduleNode) => moduleNode.id === moduleId)?.name ?? moduleId;
}

function getStatusAbbreviation(status: ChangedFile["status"]): string {
  switch (status) {
    case "modified":
      return "M";
    case "added":
      return "A";
    case "deleted":
      return "D";
    case "renamed":
      return "R";
    case "untracked":
      return "U";
    case "unknown":
      return "?";
  }
}

function formatValidationState(state: ValidationStatus["state"]): string {
  switch (state) {
    case "passed":
      return "Passed";
    case "running":
      return "Running";
    case "failed":
      return "Failed";
    case "unknown":
      return "Unknown";
    case "notRun":
      return "Not Run";
  }
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

function capitalize(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}
