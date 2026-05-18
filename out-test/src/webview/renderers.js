"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderDashboardShell = renderDashboardShell;
const svgGraphLayout_1 = require("../graph/svgGraphLayout");
const dashboardState_1 = require("./dashboardState");
function renderDashboardShell(state) {
    return `
    <div class="dashboard-shell mode-${state.mode}">
      ${renderTopbar(state)}
      ${renderMode(state)}
    </div>
  `;
}
function renderTopbar(state) {
    return `
    <header class="topbar" aria-label="Live Architecture Map toolbar">
      <nav class="mode-tabs" aria-label="Dashboard modes">
        ${dashboardState_1.dashboardModes.map((mode) => renderModeTab(state, mode)).join("")}
        ${state.isMockData ? `<span class="mock-badge">Mock Data</span>` : ""}
      </nav>
      <div class="toolbar">
        <button class="toolbar-button" type="button" data-action="refresh">Refresh</button>
        <button class="toolbar-button" type="button" data-action="exportSnapshot">Export</button>
        <button class="toolbar-button" type="button" data-action="configure">Configure</button>
        <button class="toolbar-button" type="button" data-action="timeline">Timeline</button>
      </div>
    </header>
  `;
}
function renderModeTab(state, mode) {
    const active = state.mode === mode ? " active" : "";
    return `<button class="mode-tab${active}" type="button" data-mode="${mode}">${escapeHtml(state.ui.modeLabels[mode])}</button>`;
}
function renderMode(state) {
    switch (state.mode) {
        case "wholeArchitecture":
            return renderWholeArchitectureMode(state);
        case "featureFocus":
            return renderFeatureFocusMode(state);
        case "diffSinceBaseline":
            return renderDiffSinceBaselineMode(state);
        case "liveChanges":
        default:
            return renderLiveChangesMode(state);
    }
}
function renderLiveChangesMode(state) {
    return `
    <section class="live-summary">
      <article class="panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Current Change Area</h2>
            <p class="panel-subtitle">Current feature area touched by the active edit set</p>
          </div>
          <div class="inline-controls">
            <span>Last updated: ${escapeHtml(state.workspace.lastUpdatedLabel)}</span>
            <span><i class="status-dot"></i> Auto Refresh</span>
          </div>
        </div>
        <div class="panel-body">
          <div class="current-path">
            ${state.ui.currentChangePath.map((part) => `<span>${escapeHtml(part)}</span>`).join(`<span class="path-separator">&gt;</span>`)}
          </div>
        </div>
      </article>
      <div class="risk-card-grid">
        ${renderRiskSummaryCards(state)}
      </div>
    </section>

    <article class="panel impact-panel">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Architecture Impact Graph</h2>
          <p class="panel-subtitle">How changed code can affect feature-level structure</p>
        </div>
      </div>
      <div class="panel-body">
        ${renderGraph(state.ui.liveImpactGraph, "Layout: LR", true)}
      </div>
    </article>

    <section class="lower-grid">
      <article class="panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Changed Files</h2>
            <p class="panel-subtitle">Recent changed files mapped to features</p>
          </div>
        </div>
        <div class="panel-body">
          ${renderChangedFilesTable(state.ui.changedFiles)}
        </div>
      </article>
      <article class="panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Dependency Graph (Import)</h2>
            <p class="panel-subtitle">Python import relationships around changed modules</p>
          </div>
        </div>
        <div class="panel-body">
          ${renderGraph(state.ui.dependencyGraph, "Zoom", true)}
        </div>
      </article>
    </section>

    <article class="panel">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Validation Status</h2>
          <p class="panel-subtitle">Validation and quality checks for the mocked edit set</p>
        </div>
      </div>
      <div class="panel-body">
        ${renderValidationStatus(state.snapshot.validations)}
      </div>
    </article>
  `;
}
function renderWholeArchitectureMode(state) {
    return `
    <section class="mode-grid">
      ${renderWholeArchitectureSideNav(state)}
      <main>
        <article class="panel large-graph-panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">Feature-Level Architecture Diagram</h2>
              <p class="panel-subtitle">Complete project structure shown by feature block and dependency direction</p>
            </div>
          </div>
          <div class="panel-body">
            ${renderGraph(state.ui.wholeArchitectureGraph, "Layout: LR", true)}
          </div>
        </article>
        <section class="lower-grid with-gap">
          <article class="panel">
            <div class="panel-header"><h2 class="panel-title">Architecture Overview</h2></div>
            <div class="panel-body">${renderMetricGrid(state.ui.overviewCards, "metric-grid")}</div>
          </article>
          <article class="panel">
            <div class="panel-header"><h2 class="panel-title">Architecture Health</h2></div>
            <div class="panel-body">${renderHealthCards(state.ui.healthCards)}</div>
          </article>
        </section>
      </main>
    </section>
  `;
}
function renderFeatureFocusMode(state) {
    const selected = state.ui.featureBlocks.find((feature) => feature.id === state.selectedFeatureId) ?? state.ui.featureBlocks[7];
    const relatedModules = state.ui.featureDetail.relatedModuleIds;
    return `
    <section class="mode-grid">
      ${renderFeatureSideNav(state, selected)}
      <main>
        <div class="select-row">
          <label for="feature-select">Target feature:</label>
          <select id="feature-select" data-feature-select>
            ${state.ui.featureBlocks.map((feature) => `<option value="${escapeAttr(feature.id)}" ${feature.id === selected.id ? "selected" : ""}>${escapeHtml(feature.label)}</option>`).join("")}
          </select>
        </div>
        <article class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">${escapeHtml(selected.label)} Feature Detail</h2>
              <p class="panel-subtitle">Modules, internal edges, external dependencies, and related tests for the selected feature</p>
            </div>
          </div>
        </article>
        <section class="feature-grid with-gap">
          <article class="panel">
            <div class="panel-header"><h2 class="panel-title">Module Composition</h2></div>
            <div class="panel-body">
              <div class="composition-grid">
                <div class="module-chip primary">${escapeHtml(selected.label)}</div>
                ${relatedModules.map((moduleId) => `<div class="module-chip">${escapeHtml(moduleId)}</div>`).join("")}
              </div>
            </div>
          </article>
          <article class="panel">
            <div class="panel-header"><h2 class="panel-title">Internal Dependency Graph</h2></div>
            <div class="panel-body">${renderGraph(state.ui.featureInternalGraph, "Zoom", true)}</div>
          </article>
        </section>
        <section class="feature-bottom-grid">
          <article class="panel">
            <div class="panel-header"><h2 class="panel-title">Related External Dependencies</h2></div>
            <div class="panel-body">${renderExternalDependencies(state)}</div>
          </article>
          <article class="panel">
            <div class="panel-header"><h2 class="panel-title">Related Tests</h2></div>
            <div class="panel-body">${renderTestList(state.ui.featureDetail.relatedTests)}</div>
          </article>
        </section>
      </main>
    </section>
  `;
}
function renderDiffSinceBaselineMode(state) {
    return `
    <section class="mode-grid">
      ${renderDiffSideNav(state)}
      <main>
        <div class="select-row">
          <label for="baseline-select">Baseline:</label>
          <select id="baseline-select">
            <option>baseline_2026-05-15</option>
          </select>
          <button class="toolbar-button" type="button" data-action="captureBaseline">Save New Baseline</button>
          <button class="toolbar-button" type="button" data-action="showDiffSinceBaseline">Compare</button>
        </div>

        <article class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">Structural Change Summary</h2>
              <p class="panel-subtitle">Result of comparing baseline_2026-05-15 with the current architecture snapshot</p>
            </div>
          </div>
          <div class="panel-body">${renderMetricGrid(state.ui.diffSummaryCards, "diff-summary-grid")}</div>
        </article>

        <section class="diff-grid with-gap">
          <article class="panel">
            <div class="panel-header"><h2 class="panel-title">Dependency Change Graph</h2></div>
            <div class="panel-body">
              <div class="diff-graphs">
                <div>
                  <p class="panel-subtitle">Before baseline_2026-05-15</p>
                  ${renderGraph(state.ui.baselineBeforeGraph, "", false)}
                </div>
                <div class="diff-arrow">-&gt;</div>
                <div>
                  <p class="panel-subtitle">After current</p>
                  ${renderGraph(state.ui.baselineAfterGraph, "", false)}
                </div>
              </div>
              <div class="legend-row">
                <span class="risk-low">Added dependency</span>
                <span class="risk-high">Removed dependency</span>
                <span>Unchanged edge</span>
              </div>
            </div>
          </article>
          <article class="panel">
            <div class="panel-header"><h2 class="panel-title">Top Changes</h2></div>
            <div class="panel-body">${renderTopChanges(state.ui.topChanges)}</div>
          </article>
        </section>

        <article class="panel with-gap">
          <div class="panel-header"><h2 class="panel-title">Structural Timeline</h2></div>
          <div class="panel-body">${renderTimeline(state)}</div>
        </article>
      </main>
    </section>
  `;
}
function renderRiskSummaryCards(state) {
    const counts = { high: 0, medium: 0, low: 0 };
    for (const risk of state.snapshot.risks) {
        counts[risk.level] += 1;
    }
    return ["high", "medium", "low"]
        .map((level) => `
      <article class="risk-card tone-${level}">
        <span class="risk-label">${capitalize(level)}</span>
        <span class="risk-value">${counts[level]}</span>
      </article>
    `)
        .join("");
}
function renderChangedFilesTable(files) {
    return `
    <table aria-label="Changed files table">
      <thead>
        <tr>
          <th class="col-file">File</th>
          <th class="col-status">Status</th>
          <th class="col-feature">Feature</th>
          <th class="col-change">Last Change</th>
        </tr>
      </thead>
      <tbody>
        ${files.map((file) => `
          <tr>
            <td title="${escapeAttr(file.path)}">${escapeHtml(file.path)}</td>
            <td><span class="status-${statusClass(file.status)}">${statusShort(file.status)}</span></td>
            <td><span class="linkish">${escapeHtml(featureLabel(file.featureId))}</span></td>
            <td>${escapeHtml(file.lastChangedIso ?? "-")}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
    <div class="status-legend">
      <span><span class="status-modified">M</span>: Modified</span>
      <span><span class="risk-low">A</span>: Added</span>
      <span><span class="status-deleted">D</span>: Deleted</span>
      <span>R: Renamed</span>
    </div>
  `;
}
function renderValidationStatus(validations) {
    return `
    <div class="validation-grid">
      ${validations.map((validation) => `
        <article class="validation-card">
          <div class="validation-label">${escapeHtml(validation.label)}</div>
          <div class="state-${validation.state}">${validation.state === "passed" ? "Passed" : capitalize(validation.state)}</div>
          <div class="validation-detail">${escapeHtml(validation.detail)}</div>
        </article>
      `).join("")}
    </div>
  `;
}
function renderWholeArchitectureSideNav(state) {
    return `
    <aside class="panel side-nav">
      <div class="side-group">
        <h3 class="side-group-title">Feature Blocks</h3>
        ${state.ui.featureBlocks.slice(5, 11).map((feature) => `
          <div class="side-row"><span>${escapeHtml(feature.label)}</span><span>${feature.moduleIds.length || mockModuleCount(feature.id)}</span></div>
        `).join("")}
      </div>
      <div class="side-group">
        <h3 class="side-group-title">Entry Points</h3>
        <div class="side-row"><span>Main GUI</span></div>
        <div class="side-row"><span>ROS2 Nodes</span></div>
        <div class="side-row"><span>CLI Tools</span></div>
        <div class="side-row"><span>Launch Files</span></div>
      </div>
      <div class="side-group">
        <h3 class="side-group-title">Architecture Views</h3>
        <div class="side-row"><span class="linkish">Full Diagram</span></div>
        <div class="side-row"><span>Module Detail</span></div>
        <div class="side-row"><span>Folder Structure</span></div>
        <div class="side-row"><span>Config Flow</span></div>
        <div class="side-row"><span>Runtime Flow</span></div>
      </div>
    </aside>
  `;
}
function renderFeatureSideNav(state, selected) {
    const modules = state.ui.featureDetail.relatedModuleIds;
    return `
    <aside class="panel side-nav">
      <div class="side-group">
        <h3 class="side-group-title">Target Feature</h3>
        <div class="side-row"><span class="linkish">${escapeHtml(selected.label)}</span><span class="badge risk-${selected.riskLevel}">${selected.riskLevel}</span></div>
      </div>
      <div class="side-group">
        <h3 class="side-group-title">Owned Modules</h3>
        ${modules.map((moduleId, index) => `
          <div class="side-row"><span>${escapeHtml(moduleId)}</span><span>${index + 2}</span></div>
        `).join("")}
      </div>
      <div class="side-group">
        <h3 class="side-group-title">Related Features</h3>
        ${state.ui.featureDetail.relatedExternalFeatures.map((featureId) => `<div class="side-row"><span>${escapeHtml(featureLabel(featureId))}</span></div>`).join("")}
      </div>
    </aside>
  `;
}
function renderDiffSideNav(state) {
    return `
    <aside class="panel side-nav">
      <div class="side-group">
        <h3 class="side-group-title">Change Summary</h3>
        <div class="side-row"><span>Added modules</span><span>5</span></div>
        <div class="side-row"><span>Removed modules</span><span>2</span></div>
        <div class="side-row"><span>Changed modules</span><span>11</span></div>
        <div class="side-row"><span>Added dependencies</span><span>23</span></div>
        <div class="side-row"><span>Removed dependencies</span><span>7</span></div>
      </div>
      <div class="side-group">
        <h3 class="side-group-title">Impacted Features</h3>
        ${state.ui.impactedFeatures.slice(0, 4).map((feature) => `
          <div class="side-row"><span>${escapeHtml(feature.label)}</span><span class="badge risk-${feature.riskLevel}">${feature.riskLevel}</span></div>
        `).join("")}
      </div>
    </aside>
  `;
}
function renderMetricGrid(cards, className) {
    return `
    <div class="${className}">
      ${cards.map((card) => `
        <article class="metric-card tone-${card.tone ?? "info"}">
          <div class="metric-label">${escapeHtml(card.label)}</div>
          <div class="metric-value">${escapeHtml(card.value)}</div>
          ${card.detail ? `<div class="metric-detail">${escapeHtml(card.detail)}</div>` : ""}
        </article>
      `).join("")}
    </div>
  `;
}
function renderHealthCards(cards) {
    return `
    <div class="health-list">
      ${cards.map((card) => `
        <div class="health-row tone-${card.tone}">
          <div>
            <strong>${escapeHtml(card.label)}</strong>
            <div class="health-detail">${escapeHtml(card.detail)}</div>
          </div>
          <span class="metric-value small">${escapeHtml(card.value)}</span>
        </div>
      `).join("")}
    </div>
  `;
}
function renderExternalDependencies(state) {
    return `
    <div class="external-grid">
      ${state.ui.featureDetail.relatedExternalFeatures.map((featureId) => `
        <article class="external-card tone-${featureTone(featureId)}">
          <strong>${escapeHtml(featureLabel(featureId))}</strong>
          <div>${escapeHtml(externalDetail(featureId))}</div>
        </article>
      `).join("")}
    </div>
  `;
}
function renderTestList(files) {
    return files.map((file) => `
    <div class="test-row">
      <span title="${escapeAttr(file.path)}">${escapeHtml(file.path)}</span>
      <span class="risk-low">OK</span>
    </div>
  `).join("");
}
function renderTopChanges(changes) {
    return `
    <table aria-label="Top baseline changes">
      <tbody>
        ${changes.map((change, index) => `
          <tr>
            <td class="col-index">${index + 1}</td>
            <td title="${escapeAttr(change.path)}">${escapeHtml(change.path)}</td>
            <td class="col-small status-modified">${escapeHtml(change.status)}</td>
            <td class="col-small risk-low">${escapeHtml(change.dependencyDelta)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}
function renderTimeline(state) {
    const points = state.ui.timeline;
    const max = Math.max(...points.map((point) => Math.max(point.modules, point.dependencies, point.tests)));
    const xStep = 720 / Math.max(points.length - 1, 1);
    const line = (key, color) => {
        const coordinates = points.map((point, index) => {
            const x = 40 + index * xStep;
            const y = 150 - (point[key] / max) * 115;
            return `${x},${y}`;
        }).join(" ");
        return `<polyline points="${coordinates}" fill="none" stroke="${color}" stroke-width="2"/>`;
    };
    return `
    <svg class="timeline-svg" viewBox="0 0 820 180" role="img" aria-label="Structural timeline">
      <line x1="34" y1="152" x2="785" y2="152" stroke="rgba(255,255,255,0.22)"/>
      ${line("modules", "#71bcff")}
      ${line("dependencies", "#f3b44b")}
      ${line("tests", "#62d26f")}
      ${points.map((point, index) => {
        const x = 40 + index * xStep;
        return `<text x="${x}" y="172" fill="rgba(255,255,255,0.62)" font-size="11" text-anchor="middle">${escapeHtml(point.label)}</text>`;
    }).join("")}
      <text x="690" y="28" fill="#71bcff" font-size="12">modules</text>
      <text x="690" y="48" fill="#f3b44b" font-size="12">dependencies</text>
      <text x="690" y="68" fill="#62d26f" font-size="12">tests</text>
    </svg>
  `;
}
function renderGraph(graph, controlLabel, controls) {
    const nodeLookup = new Map(graph.nodes.map((node) => [node.id, node]));
    return `
    <div class="graph-wrap">
      ${controls ? renderGraphControls(controlLabel) : ""}
      <svg viewBox="${(0, svgGraphLayout_1.graphViewBox)(graph)}" role="img" aria-label="Architecture graph">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.65)"></path>
          </marker>
        </defs>
        ${graph.edges.map((edge) => renderGraphEdge(edge.from, edge.to, edge.kind ?? "solid", nodeLookup)).join("")}
        ${graph.nodes.map(renderGraphNode).join("")}
      </svg>
    </div>
  `;
}
function renderGraphControls(label) {
    return `
    <div class="graph-controls" aria-label="Graph controls">
      ${label.startsWith("Layout") ? `<select><option>${escapeHtml(label)}</option><option>Layout: TB</option></select>` : `<span>${escapeHtml(label)}</span>`}
      <button class="mini-button" type="button" aria-label="Zoom out">-</button>
      <button class="mini-button" type="button" aria-label="Zoom in">+</button>
      <button class="mini-button" type="button" aria-label="Fit">[]</button>
    </div>
  `;
}
function renderGraphEdge(fromId, toId, kind, nodeLookup) {
    const from = nodeLookup.get(fromId);
    const to = nodeLookup.get(toId);
    if (!from || !to) {
        return "";
    }
    const fromCenter = centerOf(from);
    const toCenter = centerOf(to);
    return `<line class="graph-edge ${escapeAttr(kind)}" x1="${fromCenter.x}" y1="${fromCenter.y}" x2="${toCenter.x}" y2="${toCenter.y}"></line>`;
}
function renderGraphNode(node) {
    if (node.width <= 40 && node.height <= 40 && !node.subtitle && (!node.detailLines || node.detailLines.length === 0)) {
        return `
      <g class="node-${node.riskLevel ?? "low"}">
        <circle class="node-circle node-${node.riskLevel ?? "low"}" cx="${node.x}" cy="${node.y}" r="14"></circle>
        ${node.label ? `<text class="node-detail" x="${node.x + 24}" y="${node.y + 4}">${escapeHtml(node.label)}</text>` : ""}
      </g>
    `;
    }
    const lines = node.detailLines ?? [];
    return `
    <g class="node-${node.riskLevel ?? "low"} ${node.changed ? "node-changed" : ""}">
      <rect class="node-rect" x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}"></rect>
      <text class="node-label risk-${node.riskLevel ?? "low"}" x="${node.x + 12}" y="${node.y + 24}">${escapeHtml(node.label)}</text>
      ${node.subtitle ? `<text class="node-subtitle" x="${node.x + 12}" y="${node.y + 47}">${escapeHtml(node.subtitle)}</text>` : ""}
      ${lines.map((line, index) => `<text class="node-detail" x="${node.x + 12}" y="${node.y + 67 + index * 18}">${escapeHtml(line)}</text>`).join("")}
      ${node.changed ? `<text class="node-detail risk-${node.riskLevel ?? "low"}" x="${node.x + node.width - 52}" y="${node.y + node.height - 12}">${capitalize(node.riskLevel ?? "low")}</text>` : ""}
    </g>
  `;
}
function centerOf(node) {
    if (node.width <= 40 && node.height <= 40 && !node.subtitle) {
        return { x: node.x, y: node.y };
    }
    return {
        x: node.x + node.width / 2,
        y: node.y + node.height / 2
    };
}
function statusShort(status) {
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
        default:
            return "-";
    }
}
function statusClass(status) {
    switch (status) {
        case "deleted":
            return "deleted";
        case "added":
            return "added";
        default:
            return "modified";
    }
}
function featureLabel(featureId) {
    switch (featureId) {
        case "config-system":
            return "Config System";
        case "operator-startup":
            return "Operator Panel Startup";
        case "tests-config":
            return "Tests / Config Scanner";
        case "launcher-env":
            return "Launcher / Subprocess Env";
        case "ros-runtime":
            return "ROS Launch / Runtime";
        case "gui-layer":
            return "GUI Layer";
        case "task-runner":
            return "Task Runner";
        case "motion-planning":
            return "Motion Planning";
        case "safety-layer":
            return "Safety Layer";
        case "robot-io":
            return "Robot I/O Layer";
        case "utils-common":
            return "Utils / Common";
        default:
            return featureId ?? "Unknown";
    }
}
function featureTone(featureId) {
    switch (featureId) {
        case "safety-layer":
        case "robot-io":
            return "medium";
        case "task-runner":
            return "medium";
        case "gui-layer":
            return "info";
        default:
            return "low";
    }
}
function externalDetail(featureId) {
    switch (featureId) {
        case "gui-layer":
            return "motion_tab.py, pose_display.py";
        case "task-runner":
            return "box_task_runner.py, sequence_manager.py";
        case "safety-layer":
            return "collision_checker.py, zone_checker.py";
        case "robot-io":
            return "egm_client.py, tcp_world.py";
        default:
            return "Related modules";
    }
}
function mockModuleCount(featureId) {
    switch (featureId) {
        case "gui-layer":
            return 12;
        case "motion-planning":
            return 18;
        case "robot-io":
            return 15;
        case "safety-layer":
            return 9;
        case "config-system":
            return 11;
        case "utils-common":
            return 8;
        default:
            return 3;
    }
}
function capitalize(value) {
    return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}
function escapeHtml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
function escapeAttr(value) {
    return escapeHtml(value);
}
//# sourceMappingURL=renderers.js.map