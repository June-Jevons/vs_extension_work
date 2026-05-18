import {
  BaselineDiff,
  ChangedFile,
  DashboardMode,
  DashboardState,
  DependencyEdge,
  FeatureBlock,
  ModuleNode,
  ValidationStatus,
  dashboardModes,
  getModeLabel
} from "./dashboardState";
import { getFeatureDefinition, inferRuntimeFeatureForTestPath } from "../core/featureMapper";

interface GraphStats {
  nodes: number;
  edges: number;
  summary: string;
}

interface PositionedNode {
  id: string;
  label: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color: string;
  kind?: "feature" | "unclassifiedModule" | "module";
  featureId?: string;
  path?: string;
  subLines?: string[];
  badge?: string;
  riskLevel?: FeatureBlock["riskLevel"];
}

interface PositionedEdge {
  from: string;
  to: string;
  kind?: DependencyEdge["kind"] | "feature";
  count?: number;
}

interface GraphData {
  nodes: PositionedNode[];
  edges: PositionedEdge[];
  viewBox: string;
  emptyReason?: string;
  summary?: string;
  detailRows?: string[];
  height?: number;
  compact?: boolean;
}

export function renderDashboardShell(state: DashboardState): string {
  return `
    <main class="dashboard-root" data-testid="dashboard-root" data-mode="${escapeAttribute(state.mode)}">
      <div class="dashboard-shell">
        ${renderTopToolbar(state)}
        <section class="dashboard-mode">
          ${renderModeContent(state)}
        </section>
        ${renderWorkspaceDiagnosticsPanel(state)}
      </div>
    </main>
  `;
}

export function renderTopToolbar(state: DashboardState): string {
  return `
    <header class="dashboard-toolbar">
      <div class="toolbar-title">
        <h1>Live Architecture Map</h1>
        <p>${renderTopSubtitle(state)}</p>
      </div>
      <div class="toolbar-controls">
        <div class="control-group mode-group">
          <span class="control-group-label">Modes</span>
          ${renderModeTabs(state)}
        </div>
        <div class="control-group action-group">
          <span class="control-group-label">Actions</span>
          <div class="toolbar-actions" aria-label="Dashboard actions">
            <button class="toolbar-button" type="button" data-command="refresh" title="Refresh dashboard">Refresh</button>
            <button class="toolbar-button" type="button" data-command="exportSnapshot" title="Export snapshot">Export</button>
            <button class="toolbar-button" type="button" data-command="configure" title="Configure extension settings">Configure</button>
            <button class="toolbar-button" type="button" data-command="focusTimeline" title="Open structural timeline">Timeline</button>
          </div>
        </div>
      </div>
    </header>
  `;
}

export function renderWorkspaceDiagnosticsPanel(state: DashboardState): string {
  const diagnostics = state.diagnostics;
  const sourceLabel = state.isMockData ? "Mock data" : "Live workspace data";
  const fallback = diagnostics.fallbackReason
    ? renderDiagnosticItem("Fallback", diagnostics.fallbackReason)
    : "";
  const baseline = diagnostics.baselineCapturedAtIso
    ? formatDateTime(diagnostics.baselineCapturedAtIso)
    : "Not captured";
  const graphStats = getGraphStatsForMode(state);

  const unclassifiedPaths = diagnostics.unclassifiedModulePaths.length > 0
    ? diagnostics.unclassifiedModulePaths.join(", ")
    : "None";
  const unclassifiedReasons = diagnostics.unclassifiedReasonCounts.length > 0
    ? diagnostics.unclassifiedReasonCounts.map((item) => `${formatClassificationReason(item.reason)} ${item.count}`).join(", ")
    : "None";

  return `
    <details class="diagnostics-panel" data-testid="workspace-diagnostics-panel" aria-label="Workspace diagnostics">
      <summary>
        <span class="diagnostics-summary-title">Diagnostics</span>
        <span>${escapeHtml(String(diagnostics.moduleCount))} modules</span>
        <span>${escapeHtml(String(diagnostics.dependencyCount))} dependencies</span>
        <span>${escapeHtml(String(diagnostics.changedFileCount))} changed files</span>
        <span>${escapeHtml(String(diagnostics.unmappedModuleCount))} unclassified</span>
      </summary>
      <div class="diagnostics-grid">
      ${renderDiagnosticItem("Workspace", diagnostics.rootUri)}
      ${renderDiagnosticItem("Source", sourceLabel)}
      ${renderDiagnosticItem("Mock data", state.isMockData ? "true" : "false")}
      ${renderDiagnosticItem("Python files", diagnostics.pythonFileCount)}
      ${renderDiagnosticItem("Modules", diagnostics.moduleCount)}
      ${renderDiagnosticItem("Dependencies", diagnostics.dependencyCount)}
      ${renderDiagnosticItem("Graph nodes", graphStats.nodes)}
      ${renderDiagnosticItem("Graph edges", graphStats.edges)}
      ${renderDiagnosticItem("Unclassified modules", diagnostics.unmappedModuleCount)}
      ${renderDiagnosticItem("Top unclassified paths", unclassifiedPaths)}
      ${renderDiagnosticItem("Unclassified reasons", unclassifiedReasons)}
      ${renderDiagnosticItem("Test modules", diagnostics.testModuleCount)}
      ${renderDiagnosticItem("Runtime modules", diagnostics.runtimeModuleCount)}
      ${renderDiagnosticItem("Unresolved imports", diagnostics.unresolvedImportCount)}
      ${renderDiagnosticItem("Changed files", diagnostics.changedFileCount)}
      ${renderDiagnosticItem("Git branch", diagnostics.gitBranch)}
      ${renderDiagnosticItem("Git status source", diagnostics.gitStatusSource)}
      ${renderDiagnosticItem("Scanner", diagnostics.scannerStatus)}
      ${renderDiagnosticItem("Path type", formatPathKind(diagnostics.pathKind))}
      ${renderDiagnosticItem("Baseline", baseline)}
      ${renderDiagnosticItem("Updated", formatDateTime(diagnostics.lastUpdatedIso))}
      ${fallback}
      </div>
    </details>
  `;
}

function renderDiagnosticItem(label: string, value: number | string): string {
  return `<span><strong>${escapeHtml(label)}:</strong>${escapeHtml(String(value))}</span>`;
}

export function renderModeTabs(state: DashboardState): string {
  return `
    <nav class="mode-tabs" aria-label="Dashboard modes">
      ${dashboardModes.map((mode) => renderModeTab(mode, state.mode)).join("")}
    </nav>
  `;
}

function renderTopSubtitle(state: DashboardState): string {
  const status = state.error
    ? "Analysis error"
    : state.isLoading
      ? "Loading workspace data"
      : state.isMockData
        ? "Mock data"
        : "Live workspace data";
  return [
    state.workspace.name,
    getModeLabel(state.mode),
    status
  ].map(escapeHtml).join(" · ");
}

export function renderLiveChangesMode(state: DashboardState): string {
  return `
    <div class="live-grid">
      ${renderCurrentChangeArea(state)}
      <section class="panel large-graph-panel${state.snapshot.impactedFeatures.length <= 4 ? " compact-graph-panel" : ""}" data-testid="architecture-impact-graph" data-graph-panel>
        <div class="panel-header">
          <div class="panel-heading">
            <h2 class="panel-title">Architecture Impact Graph</h2>
            <p class="panel-subtitle">Changed code impact across feature blocks and dependency paths.</p>
          </div>
          ${renderZoomControls()}
        </div>
        <div class="panel-body">
          ${renderFeatureImpactGraph(state)}
        </div>
      </section>
      <div class="lower-split">
        ${renderChangedFilesTable(state)}
        <section class="panel dependency-panel" data-testid="dependency-graph" data-graph-panel>
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
  const entryPointMetrics = getEntryPointMetrics(state);
  const architectureViewMetrics = getArchitectureViewMetrics(state);

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
              ${entryPointMetrics.map((metric) => `
                <li><span>${escapeHtml(metric.label)}</span><span class="count-badge">${escapeHtml(String(metric.value))}</span></li>
              `).join("")}
            </ul>
          </div>
        </section>
        <section class="panel">
          <div class="panel-header">
            <div class="panel-heading">
              <h2 class="panel-title">Architecture Views</h2>
              <p class="panel-subtitle">Available architecture views.</p>
            </div>
          </div>
          <div class="panel-body">
            <ul class="compact-list">
              ${architectureViewMetrics.map((metric) => `
                <li><span>${escapeHtml(metric.label)}</span><span class="count-badge">${escapeHtml(String(metric.value))}</span></li>
              `).join("")}
            </ul>
          </div>
        </section>
      </aside>
      <div class="whole-main">
        <section class="panel whole-diagram-panel" data-testid="whole-architecture-diagram" data-graph-panel>
          <div class="panel-header">
            <div class="panel-heading">
              <h2 class="panel-title">Feature-Level Architecture Diagram</h2>
              <p class="panel-subtitle">The full architecture grouped by feature block.</p>
            </div>
            ${renderZoomControls()}
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
                <p class="panel-subtitle">Current summary for the active workspace.</p>
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
  const runtimeModules = getRuntimeModulesForFeature(state, selectedFeature.id);
  const relatedTests = getRelatedTestsForFeature(state, selectedFeature, runtimeModules);
  const dependencyInfo = getFeatureDependencyInfo(state, selectedFeature.id);
  const externalFeatures = [...dependencyInfo.incoming, ...dependencyInfo.outgoing]
    .map((item) => item.feature)
    .filter((feature, index, features) => features.findIndex((candidate) => candidate.id === feature.id) === index)
    .slice(0, 6);
  const changedFiles = state.snapshot.changedFiles.filter((file) => file.featureId === selectedFeature.id);
  const keyModules = rankKeyModules(runtimeModules, changedFiles).slice(0, 12);
  const visibleRuntimeModules = keyModules.length > 0 ? keyModules : runtimeModules.slice(0, 12);
  const compositionTitle = selectedFeature.id === "tests" ? "Test Modules" : "Runtime Modules";
  const riskLevel = getFeatureRiskLevel(selectedFeature, changedFiles, runtimeModules);

  return `
    <div class="feature-layout">
      <aside class="mode-sidebar">
        <section class="panel">
          <div class="panel-header">
            <div class="panel-heading">
              <h2 class="panel-title">Feature Focus</h2>
              <p class="panel-subtitle">Selected feature, runtime modules, and related tests.</p>
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
              <h2 class="panel-title">Feature Summary</h2>
              <p class="panel-subtitle">What this feature is and how it connects.</p>
            </div>
          </div>
          <div class="panel-body">
            <ul class="compact-list">
              <li><span>Runtime modules</span><span class="count-badge">${runtimeModules.length}</span></li>
              <li><span>Changed files</span><span class="count-badge">${changedFiles.length}</span></li>
              <li><span>Incoming features</span><span class="count-badge">${dependencyInfo.incoming.length}</span></li>
              <li><span>Outgoing features</span><span class="count-badge">${dependencyInfo.outgoing.length}</span></li>
              <li><span>Related tests</span><span class="count-badge">${relatedTests.length}</span></li>
            </ul>
          </div>
        </section>
        <section class="panel">
          <div class="panel-header">
            <div class="panel-heading">
              <h2 class="panel-title">Nearby Features</h2>
              <p class="panel-subtitle">External/neighbor feature context.</p>
            </div>
          </div>
          <div class="panel-body">
            <ul class="compact-list">
              ${externalFeatures.length > 0 ? externalFeatures.map((feature) => `
                <li>
                  <span>${escapeHtml(feature.label)}</span>
                  <span class="risk-pill ${feature.riskLevel}">${escapeHtml(feature.riskLevel)}</span>
                </li>
              `).join("") : `
                <li><span>No neighboring features detected.</span><span class="count-badge">0</span></li>
              `}
            </ul>
          </div>
        </section>
      </aside>
      <div class="feature-main">
        <section class="feature-summary-card" data-testid="feature-focus-summary">
          <div>
            <h2 class="panel-title">${escapeHtml(selectedFeature.label)}</h2>
            <p class="panel-subtitle">${escapeHtml(selectedFeature.description)}</p>
          </div>
          <div class="feature-summary-metrics">
            ${renderInlineMetric("Runtime", runtimeModules.length)}
            ${renderInlineMetric("Changed", changedFiles.length)}
            ${renderInlineMetric("Incoming", dependencyInfo.incomingEdgeCount)}
            ${renderInlineMetric("Outgoing", dependencyInfo.outgoingEdgeCount)}
            <span class="risk-pill ${riskLevel}">${escapeHtml(capitalize(riskLevel))} risk</span>
          </div>
        </section>
        <div class="feature-top-split">
          <section class="panel" data-testid="module-composition-panel">
            <div class="panel-header">
              <div class="panel-heading">
                <h2 class="panel-title">Key ${escapeHtml(compositionTitle)}</h2>
                <p class="panel-subtitle">${visibleRuntimeModules.length > 0 ? `Showing ${visibleRuntimeModules.length} of ${runtimeModules.length}. Changed modules, connected modules, and entry points rank first.` : "No runtime modules mapped."}</p>
              </div>
            </div>
            <div class="panel-body module-composition">
              ${visibleRuntimeModules.length > 0 ? visibleRuntimeModules.map((moduleNode) => `
                <div class="module-chip ${changedFiles.some((file) => file.moduleId === moduleNode.id) ? "changed" : ""}" title="${escapeAttribute(moduleNode.path)}">
                  <strong>${escapeHtml(moduleNode.name)}</strong>
                  <span>${escapeHtml(moduleNode.path)}</span>
                </div>
              `).join("") : `
                <div class="empty-state">No runtime modules are mapped to this feature yet.</div>
              `}
            </div>
          </section>
          <section class="panel internal-graph-panel" data-testid="internal-dependency-graph" data-graph-panel>
            <div class="panel-header">
              <div class="panel-heading">
                <h2 class="panel-title">Internal Dependencies</h2>
                <p class="panel-subtitle">Imports within ${escapeHtml(selectedFeature.label)}.</p>
              </div>
              ${renderZoomControls()}
            </div>
            <div class="panel-body">
              ${renderInternalDependencyGraph(runtimeModules)}
            </div>
          </section>
        </div>
        <div class="feature-bottom-split">
          <section class="panel" data-testid="related-external-dependencies">
            <div class="panel-header">
              <div class="panel-heading">
                <h2 class="panel-title">Feature Dependencies</h2>
                <p class="panel-subtitle">What depends on this feature, and what this feature depends on.</p>
              </div>
            </div>
            <div class="panel-body external-grid">
              ${dependencyInfo.incoming.length > 0 || dependencyInfo.outgoing.length > 0 ? `
                <article class="external-card">
                  <div class="external-title">Depends On</div>
                  <div>${dependencyInfo.outgoing.length > 0
                    ? dependencyInfo.outgoing.slice(0, 5).map((item) => `${escapeHtml(item.feature.label)} <span class="count-badge">${item.count}</span>`).join("<br>")
                    : "No outgoing feature dependencies."}</div>
                </article>
                <article class="external-card">
                  <div class="external-title">Depended On By</div>
                  <div>${dependencyInfo.incoming.length > 0
                    ? dependencyInfo.incoming.slice(0, 5).map((item) => `${escapeHtml(item.feature.label)} <span class="count-badge">${item.count}</span>`).join("<br>")
                    : "No incoming feature dependencies."}</div>
                </article>
                ${changedFiles.length > 0 ? `
                  <article class="external-card">
                    <div class="external-title">Changed Here</div>
                    <div>${changedFiles.slice(0, 5).map((file) => escapeHtml(file.path)).join("<br>")}</div>
                  </article>
                ` : ""}
                ${externalFeatures.slice(0, 3).map((feature) => `
                  <article class="external-card">
                    <div class="external-title">${escapeHtml(feature.label)}</div>
                    <div>${feature.moduleIds.slice(0, 2).map((moduleId) => escapeHtml(getModuleName(state, moduleId))).join("<br>")}</div>
                  </article>
                `).join("")}
              ` : `
                <article class="external-card">
                  <div class="external-title">No cross-feature imports</div>
                  <div>No resolved local imports connect this feature to another feature.</div>
                </article>
              `}
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
                ${relatedTests.length > 0 ? relatedTests.map((testModule) => `
                  <li>
                    <span>${escapeHtml(testModule.path)}</span>
                    <span class="test-state">related</span>
                  </li>
                `).join("") : `
                  <li><span>No related tests were inferred for this feature.</span><span class="count-badge">0</span></li>
                `}
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
            <span class="panel-subtitle">${escapeHtml(formatBaselineLabel(diff.baselineCapturedAtIso))} to current structure</span>
          </div>
          <div class="inline-actions">
            <select class="select-control" aria-label="Baseline selector">
              <option>${escapeHtml(formatBaselineLabel(diff.baselineCapturedAtIso))}</option>
            </select>
            <button class="primary-action" type="button" data-command="captureBaseline">Capture Baseline</button>
            <button class="toolbar-button" type="button" data-command="showDiffSinceBaseline">Compare</button>
          </div>
        </div>
        <section class="summary-grid" data-testid="baseline-summary-cards">
          ${renderSummaryCard("Added Modules", diff.addedModules.length, "Modules present only in the current snapshot.", "added")}
          ${renderSummaryCard("Removed Modules", diff.removedModules.length, "Modules present only in the captured baseline.", "removed")}
          ${renderSummaryCard("Changed Modules", diff.changedModules.length, "Modules with changed import or risk metadata.", "changed")}
          ${renderSummaryCard("Added Dependencies", diff.addedEdges.length, "Import edges added after baseline capture.", "added")}
          ${renderSummaryCard("Removed Dependencies", diff.removedEdges.length, "Import edges removed after baseline capture.", "removed")}
        </section>
        <div class="diff-content-split">
          <section class="panel before-after-panel" data-testid="before-after-graph" data-graph-panel>
            <div class="panel-header">
              <div class="panel-heading">
                <h2 class="panel-title">Before / After Dependency Comparison</h2>
                <p class="panel-subtitle">Structural change from baseline to current state.</p>
              </div>
              ${renderZoomControls()}
            </div>
            <div class="panel-body">
              ${renderBeforeAfterGraph(state)}
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
                ${renderStructuralTimeline(diff)}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderFeatureImpactGraph(state: DashboardState): string {
  return renderFeatureGraph(getImpactGraphData(state), state, "Feature impact graph");
}

export function renderDependencyGraph(state: DashboardState): string {
  return renderModuleGraph(getDependencyGraphData(state), "Dependency graph");
}

export function renderChangedFilesTable(state: DashboardState): string {
  const visibleCount = state.snapshot.changedFiles.length;
  return `
    <section class="panel" data-testid="changed-files-table">
      <div class="panel-header">
        <div class="panel-heading">
          <h2 class="panel-title">Changed Files</h2>
          <p class="panel-subtitle">Actual Git status entries from ${escapeHtml(state.diagnostics.gitStatusSource)}. Showing ${visibleCount} changed file${visibleCount === 1 ? "" : "s"}.</p>
        </div>
      </div>
      <div class="panel-body table-wrap changed-files-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Path</th>
              <th>Feature</th>
              <th>Risk</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            ${state.snapshot.changedFiles.length > 0
              ? state.snapshot.changedFiles.map((file) => renderChangedFileRow(file, state)).join("")
              : `<tr><td colspan="5" class="path-cell">No changed files reported by Git.</td></tr>`}
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

function renderZoomControls(): string {
  return `
    <div class="panel-actions" aria-label="Graph zoom controls">
      <span class="panel-subtitle">Zoom</span>
      <button class="icon-button" type="button" title="Zoom out" data-graph-action="zoom-out">-</button>
      <button class="icon-button" type="button" title="Zoom in" data-graph-action="zoom-in">+</button>
      <button class="icon-button" type="button" title="Fit to view" data-graph-action="reset">Fit</button>
    </div>
  `;
}

function renderRiskCard(testId: string, risk: { label: string; count: number; detail: string } | undefined, level: "high" | "medium" | "low"): string {
  const fallback = {
    label: capitalize(level),
    count: 0,
    detail: "No risk items."
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

function renderFeatureNode(feature: FeatureBlock, x: number, y: number, width: number, height: number, color: string): string {
  const moduleLines = feature.moduleIds.slice(0, 3).map((moduleId, index) => `
    <text x="${x + 14}" y="${y + 47 + index * 20}" class="node-small">${escapeHtml(moduleId.replaceAll("-", "_"))}</text>
  `).join("");
  const moduleCountLabel = `${feature.moduleIds.length} modules`;

  return `
    <g class="feature-node" data-feature-id="${escapeAttribute(feature.id)}">
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="6" fill="${color}20" stroke="${color}" />
      <text x="${x + 14}" y="${y + 25}" class="node-label" fill="${color}">${escapeHtml(feature.label)}</text>
      ${moduleLines}
      <rect x="${x + width - 55}" y="${y + height - 28}" width="46" height="20" rx="4" fill="${color}30" stroke="${color}" />
      <text x="${x + width - 47}" y="${y + height - 14}" class="node-small">${escapeHtml(capitalize(feature.riskLevel))}</text>
      <text x="${x + 14}" y="${y + height - 14}" class="node-small">${escapeHtml(moduleCountLabel)}</text>
    </g>
  `;
}

function renderGraphNode(node: PositionedNode, feature: FeatureBlock | undefined): string {
  if (feature) {
    return renderFeatureNode(feature, node.x, node.y, node.width ?? 184, node.height ?? 96, node.color);
  }

  const width = node.width ?? 184;
  const height = node.height ?? 88;
  const lines = (node.subLines ?? []).slice(0, 2).map((line, index) => `
    <text x="${node.x + 12}" y="${node.y + 45 + index * 17}" class="node-small">${escapeHtml(line)}</text>
  `).join("");
  const badge = node.badge
    ? `<text x="${node.x + 12}" y="${node.y + height - 13}" class="node-small">${escapeHtml(node.badge)}</text>`
    : "";
  return `
    <g class="feature-node unclassified-node"${node.featureId ? ` data-feature-id="${escapeAttribute(node.featureId)}"` : ""}>
      <rect x="${node.x}" y="${node.y}" width="${width}" height="${height}" rx="6" fill="${node.color}20" stroke="${node.color}" />
      <text x="${node.x + 12}" y="${node.y + 24}" class="node-label" fill="${node.color}">${escapeHtml(node.label)}</text>
      ${lines}
      ${badge}
    </g>
  `;
}

function renderWholeArchitectureGraph(state: DashboardState): string {
  return renderFeatureGraph(getWholeArchitectureGraphData(state), state, "Whole architecture diagram");
}

function renderInternalDependencyGraph(modules: ModuleNode[]): string {
  return renderModuleGraph(getInternalDependencyGraphData(modules), "Internal dependency graph");
}

function renderBeforeAfterGraph(state: DashboardState): string {
  return renderModuleGraph(getBeforeAfterGraphData(state), "Before after dependency graph");
}

function renderFeatureGraph(graph: GraphData, state: DashboardState, ariaLabel: string): string {
  const featureById = new Map(state.snapshot.featureBlocks.map((feature) => [feature.id, feature]));
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const edgeMarkup = graph.edges.map((edge, index) => {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to) {
      return "";
    }
    const fromX = from.x + (from.width ?? 0);
    const fromY = from.y + (from.height ?? 0) / 2;
    const toX = to.x;
    const toY = to.y + (to.height ?? 0) / 2;
    const offset = ((index % 5) - 2) * 12;
    const midX = Math.round((fromX + toX) / 2);
    const midY = Math.round((fromY + toY) / 2) + offset;
    const label = edge.count
      ? `<text x="${midX - 7}" y="${midY - 7}" class="edge-label">${edge.count}</text>`
      : "";
    return `
      <path class="edge-line${edge.kind === "test" ? " dashed" : ""}" d="M${fromX} ${fromY} C${midX + offset} ${fromY}, ${midX - offset} ${toY}, ${toX} ${toY}" />
      ${label}
    `;
  }).join("");

  const nodeMarkup = graph.nodes.map((node) => {
    const feature = featureById.get(node.id);
    return renderGraphNode(node, feature);
  }).join("");

  return renderGraphStage(graph, ariaLabel, edgeMarkup, nodeMarkup);
}

function renderModuleGraph(graph: GraphData, ariaLabel: string): string {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const edgeMarkup = graph.edges.map((edge) => {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to) {
      return "";
    }
    return `<path class="edge-line${edge.kind === "test" ? " dashed" : ""}" d="M${from.x} ${from.y} L${to.x} ${to.y}" />`;
  }).join("");
  const nodeMarkup = graph.nodes.map((node) => `
    <g class="module-node">
      <circle cx="${node.x}" cy="${node.y}" r="13" fill="${node.color}" stroke="#d7dde6" stroke-width="1.2" />
      <text x="${node.x + 18}" y="${node.y + 4}" class="node-small">${escapeHtml(node.label)}</text>
    </g>
  `).join("");

  return renderGraphStage(graph, ariaLabel, edgeMarkup, nodeMarkup);
}

function renderGraphStage(graph: GraphData, ariaLabel: string, edgeMarkup: string, nodeMarkup: string): string {
  const emptyState = graph.emptyReason
    ? `<div class="graph-empty-state">${escapeHtml(graph.emptyReason)}</div>`
    : "";
  const summary = graph.summary
    ? `<div class="graph-summary">${escapeHtml(graph.summary)}</div>`
    : "";
  const details = graph.detailRows && graph.detailRows.length > 0
    ? `<div class="graph-detail-list">${graph.detailRows.map((row) => `<span>${escapeHtml(row)}</span>`).join("")}</div>`
    : "";
  const style = graph.height ? ` style="min-height:${graph.height}px"` : "";

  return `
    <div class="graph-stage${graph.compact ? " compact" : ""}" data-node-count="${graph.nodes.length}" data-edge-count="${graph.edges.length}"${style}>
      ${emptyState}
      ${summary}
      <svg class="graph-svg" viewBox="${escapeAttribute(graph.viewBox)}" data-fit-viewbox="${escapeAttribute(graph.viewBox)}" preserveAspectRatio="xMinYMin meet" role="img" aria-label="${escapeAttribute(ariaLabel)}">
        ${renderSvgDefs()}
        <g class="graph-viewport">
          ${edgeMarkup}
          ${nodeMarkup}
        </g>
      </svg>
      ${details}
    </div>
  `;
}

function getWholeArchitectureGraphData(state: DashboardState): GraphData {
  const features = [...state.snapshot.featureBlocks].sort(compareFeatureBlocks);
  if (features.length === 0) {
    return emptyGraph("No feature blocks were produced. Run analysis on a workspace with readable Python files.");
  }

  const allEdges = getInterFeatureEdges(state);
  const visibleEdges = limitEdges(allEdges, 18);
  const nodes = layoutFeatureNodesForGraph(state, features, visibleEdges);
  const visibleNodeIds = new Set(nodes.map((node) => node.id));
  const edges = visibleEdges.filter((edge) => visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to));
  const hiddenEdgeCount = Math.max(allEdges.length - edges.length, 0);

  return {
    nodes,
    edges,
    viewBox: getViewBox(nodes, nodes.length <= 4 ? 760 : 940, nodes.length <= 4 ? 250 : 360),
    summary: hiddenEdgeCount > 0
      ? `Showing top ${edges.length} of ${allEdges.length} inter-feature dependency edges.`
      : `${features.length} feature blocks, ${edges.length} inter-feature dependency edges.`,
    detailRows: edgeDetailRows(edges, state),
    height: nodes.length <= 4 ? 240 : 360,
    compact: nodes.length <= 4
  };
}

function getImpactGraphData(state: DashboardState): GraphData {
  if (state.snapshot.changedFiles.length === 0) {
    return emptyGraph("No changed files were reported by Git, so no live impact graph is drawn.");
  }

  const impactedIds = new Set([
    ...state.snapshot.changedFiles.map((file) => file.featureId).filter((featureId): featureId is string => Boolean(featureId)),
    ...state.snapshot.impactedFeatures.map((feature) => feature.featureId)
  ]);
  const features = state.snapshot.featureBlocks
    .filter((feature) => impactedIds.has(feature.id))
    .sort(compareFeatureBlocks)
    .slice(0, 10);

  if (features.length === 0) {
    return emptyGraph("Changed files were found, but none could be mapped to feature blocks.");
  }

  const allEdges = getInterFeatureEdges(state)
    .filter((edge) => impactedIds.has(edge.from) && impactedIds.has(edge.to));
  const edges = limitEdges(allEdges, 12);
  const changedFeatureIds = new Set(state.snapshot.changedFiles
    .map((file) => file.featureId)
    .filter((featureId): featureId is string => Boolean(featureId)));
  const nodes = layoutFeatureNodesForGraph(state, features, edges, changedFeatureIds);
  const visibleFeatureIds = new Set(features.map((feature) => feature.id));
  const visibleEdges = edges.filter((edge) => visibleFeatureIds.has(edge.from) && visibleFeatureIds.has(edge.to));

  return {
    nodes,
    edges: visibleEdges,
    viewBox: getViewBox(nodes, nodes.length <= 4 ? 760 : 900, nodes.length <= 4 ? 230 : 320),
    summary: allEdges.length > visibleEdges.length
      ? `${state.snapshot.changedFiles.length} changed files across ${features.length} impacted feature blocks; showing top ${visibleEdges.length} of ${allEdges.length} feature edges.`
      : `${state.snapshot.changedFiles.length} changed files across ${features.length} impacted feature blocks.`,
    detailRows: edgeDetailRows(visibleEdges, state),
    height: nodes.length <= 4 ? 210 : 310,
    compact: nodes.length <= 4
  };
}

function getDependencyGraphData(state: DashboardState): GraphData {
  if (state.snapshot.dependencies.length === 0) {
    return emptyGraph("No resolved local Python import edges were found. External or unresolved imports are listed in diagnostics.");
  }

  const modulesById = new Map(state.snapshot.modules.map((moduleNode) => [moduleNode.id, moduleNode]));
  const changedModuleIds = state.snapshot.changedFiles
    .map((file) => file.moduleId)
    .filter((moduleId): moduleId is string => Boolean(moduleId));
  const seedIds = changedModuleIds.length > 0
    ? changedModuleIds
    : getTopConnectedModuleIds(state.snapshot.modules).slice(0, 6);
  const visibleIds = expandModuleNeighborhood(seedIds, state.snapshot.dependencies, 12);
  const modules = visibleIds
    .map((moduleId) => modulesById.get(moduleId))
    .filter((moduleNode): moduleNode is ModuleNode => Boolean(moduleNode));

  if (modules.length === 0) {
    return emptyGraph("No local modules are available for dependency graph rendering.");
  }

  const nodes = layoutModuleNodes(modules);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = state.snapshot.dependencies
    .filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to))
    .map((edge) => ({ from: edge.from, to: edge.to, kind: edge.kind }))
    .slice(0, 24);
  const hiddenNodeCount = Math.max(state.snapshot.modules.length - nodes.length, 0);
  const hiddenEdgeCount = Math.max(state.snapshot.dependencies.length - edges.length, 0);

  return {
    nodes,
    edges,
    viewBox: getPointViewBox(nodes),
    summary: hiddenNodeCount > 0 || hiddenEdgeCount > 0
      ? `Representative subgraph: showing ${nodes.length}/${state.snapshot.modules.length} modules and ${edges.length}/${state.snapshot.dependencies.length} resolved local import edges. Selection: ${changedModuleIds.length > 0 ? "changed modules and nearest neighbors first" : "top connected modules"}.`
      : `${nodes.length} modules and ${edges.length} resolved local import edges. Selection: ${changedModuleIds.length > 0 ? "changed modules and nearest neighbors" : "top connected modules"}.`,
    detailRows: [`Unresolved imports are counted in diagnostics (${state.diagnostics.unresolvedImportCount}) and are not drawn as edges.`],
    height: nodes.length <= 5 ? 230 : 280,
    compact: nodes.length <= 5
  };
}

function getInternalDependencyGraphData(modules: ModuleNode[]): GraphData {
  if (modules.length === 0) {
    return emptyGraph("No runtime modules are mapped to this feature.");
  }

  const visibleModules = modules.slice(0, 12);
  const nodes = layoutModuleNodes(visibleModules);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = visibleModules.flatMap((moduleNode) => moduleNode.imports
    .filter((targetId) => nodeIds.has(targetId))
    .map((targetId) => ({ from: moduleNode.id, to: targetId, kind: "import" as const })));

  return {
    nodes,
    edges,
    viewBox: getPointViewBox(nodes),
    emptyReason: edges.length === 0 ? "No internal imports were resolved among these modules." : undefined,
    summary: `${visibleModules.length} modules, ${edges.length} internal dependency edges.`,
    height: visibleModules.length <= 5 ? 230 : 280,
    compact: visibleModules.length <= 5
  };
}

function getBeforeAfterGraphData(state: DashboardState): GraphData {
  const diff = state.baselineDiff;
  if (!diff) {
    return emptyGraph("No baseline comparison is available.");
  }

  const changedEdges = [
    ...diff.addedEdges.map((edge) => ({ ...edge, kind: "import" as const })),
    ...diff.removedEdges.map((edge) => ({ ...edge, kind: "unknown" as const }))
  ].slice(0, 18);
  const moduleIds = uniqueStrings(changedEdges.flatMap((edge) => [edge.from, edge.to])).slice(0, 14);
  const modulesById = new Map(state.snapshot.modules.map((moduleNode) => [moduleNode.id, moduleNode]));
  const modules = moduleIds.map((moduleId) => modulesById.get(moduleId) ?? moduleShell(moduleId));

  if (changedEdges.length === 0 || modules.length === 0) {
    return emptyGraph("Baseline exists, but no dependency edge additions or removals were detected.");
  }

  const nodes = layoutModuleNodes(modules);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = changedEdges
    .filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to))
    .map((edge) => ({ from: edge.from, to: edge.to, kind: edge.kind }));

  return {
    nodes,
    edges,
    viewBox: getPointViewBox(nodes),
    summary: `${diff.addedEdges.length} added and ${diff.removedEdges.length} removed dependency edges since baseline.`,
    height: nodes.length <= 5 ? 230 : 310,
    compact: nodes.length <= 5
  };
}

function renderStructuralTimeline(diff: BaselineDiff): string {
  const baselineLabel = formatShortDate(diff.baselineCapturedAtIso);
  const currentLabel = formatShortDate(diff.currentCapturedAtIso);
  const moduleDelta = diff.addedModules.length - diff.removedModules.length;
  const edgeDelta = diff.addedEdges.length - diff.removedEdges.length;

  return `
    <svg class="timeline-svg" role="img" aria-label="Structural timeline" viewBox="0 0 680 180">
      <line x1="70" y1="88" x2="610" y2="88" stroke="#3b4654" stroke-width="2" />
      <line x1="70" y1="124" x2="610" y2="124" stroke="#3b4654" stroke-width="2" />
      <circle cx="90" cy="88" r="8" fill="#151b23" stroke="#58a6ff" stroke-width="2" />
      <circle cx="590" cy="88" r="8" fill="#58a6ff" stroke="#58a6ff" stroke-width="2" />
      <circle cx="90" cy="124" r="8" fill="#151b23" stroke="#ffa657" stroke-width="2" />
      <circle cx="590" cy="124" r="8" fill="#ffa657" stroke="#ffa657" stroke-width="2" />
      <text x="72" y="40" class="node-small">Baseline ${escapeHtml(baselineLabel)}</text>
      <text x="530" y="40" class="node-small">Current ${escapeHtml(currentLabel)}</text>
      <text x="112" y="92" class="node-small">Modules</text>
      <text x="112" y="128" class="node-small">Dependencies</text>
      <text x="438" y="92" class="node-small">+${diff.addedModules.length} / -${diff.removedModules.length} (${moduleDelta >= 0 ? "+" : ""}${moduleDelta})</text>
      <text x="438" y="128" class="node-small">+${diff.addedEdges.length} / -${diff.removedEdges.length} (${edgeDelta >= 0 ? "+" : ""}${edgeDelta})</text>
      <line x1="90" y1="150" x2="590" y2="150" stroke="#3b4654" />
      <text x="72" y="166" class="node-small">${escapeHtml(formatTime(diff.baselineCapturedAtIso))}</text>
      <text x="530" y="166" class="node-small">${escapeHtml(formatTime(diff.currentCapturedAtIso))}</text>
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

function renderInlineMetric(label: string, value: number): string {
  return `
    <span class="inline-metric">
      <strong>${escapeHtml(String(value))}</strong>
      <span>${escapeHtml(label)}</span>
    </span>
  `;
}

function renderTopChangesTable(state: DashboardState): string {
  const diff = state.baselineDiff;
  const rows = diff
    ? [
      ...diff.addedModules.map((moduleNode) => ({
        path: moduleNode.path,
        type: "Added module",
        deps: `${moduleNode.imports.length} imports`
      })),
      ...diff.removedModules.map((moduleNode) => ({
        path: moduleNode.path,
        type: "Removed module",
        deps: `${moduleNode.imports.length} imports`
      })),
      ...diff.changedModules.map((moduleNode) => ({
        path: moduleNode.path,
        type: "Changed module",
        deps: `${moduleNode.imports.length} imports`
      })),
      ...diff.addedEdges.map((edge) => ({
        path: `${edge.from} -> ${edge.to}`,
        type: "Added dependency",
        deps: edge.kind
      })),
      ...diff.removedEdges.map((edge) => ({
        path: `${edge.from} -> ${edge.to}`,
        type: "Removed dependency",
        deps: edge.kind
      }))
    ].slice(0, 12)
    : state.snapshot.changedFiles.map((file) => ({
      path: file.path,
      type: "Changed file",
      deps: file.status
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
        ${rows.length > 0 ? rows.map((row, index) => `
          <tr>
            <td>${index + 1}</td>
            <td class="path-cell">${escapeHtml(row.path)}</td>
            <td>${escapeHtml(row.type)}</td>
            <td class="test-state">${escapeHtml(row.deps)}</td>
          </tr>
        `).join("") : `
          <tr>
            <td>1</td>
            <td class="path-cell">No structural changes detected</td>
            <td>Stable</td>
            <td class="test-state">0</td>
          </tr>
        `}
      </tbody>
    </table>
  `;
}

function renderChangedFileRow(file: ChangedFile, state: DashboardState): string {
  const feature = file.featureId
    ? state.snapshot.featureBlocks.find((candidate) => candidate.id === file.featureId)
    : undefined;
  const fallbackFeature = getFeatureDefinition(file.featureId);

  return `
    <tr>
      <td><span class="status-pill">${escapeHtml(getStatusAbbreviation(file.status))}</span></td>
      <td class="path-cell">${escapeHtml(file.path)}</td>
      <td>${escapeHtml(feature?.label ?? fallbackFeature.label)}</td>
      <td><span class="risk-pill ${file.riskLevel}">${escapeHtml(capitalize(file.riskLevel))}</span></td>
      <td>${escapeHtml(file.reason)}</td>
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

export function getGraphStatsForMode(state: DashboardState): GraphStats {
  switch (state.mode) {
    case "liveChanges": {
      const impact = getImpactGraphData(state);
      const dependency = getDependencyGraphData(state);
      return {
        nodes: impact.nodes.length + dependency.nodes.length,
        edges: impact.edges.length + dependency.edges.length,
        summary: `impact=${impact.nodes.length}/${impact.edges.length}, dependency=${dependency.nodes.length}/${dependency.edges.length}`
      };
    }
    case "wholeArchitecture": {
      const graph = getWholeArchitectureGraphData(state);
      return {
        nodes: graph.nodes.length,
        edges: graph.edges.length,
        summary: `wholeArchitecture=${graph.nodes.length}/${graph.edges.length}`
      };
    }
    case "featureFocus": {
      const selectedFeature = getSelectedFeature(state);
      const graph = getInternalDependencyGraphData(getRuntimeModulesForFeature(state, selectedFeature.id));
      return {
        nodes: graph.nodes.length,
        edges: graph.edges.length,
        summary: `featureFocus=${graph.nodes.length}/${graph.edges.length}`
      };
    }
    case "diffSinceBaseline": {
      const graph = getBeforeAfterGraphData(state);
      return {
        nodes: graph.nodes.length,
        edges: graph.edges.length,
        summary: `diffSinceBaseline=${graph.nodes.length}/${graph.edges.length}`
      };
    }
  }
}

function getArchitectureFeatures(state: DashboardState): FeatureBlock[] {
  return [...state.snapshot.featureBlocks].sort(compareFeatureBlocks);
}

function getSelectedFeature(state: DashboardState): FeatureBlock {
  const selected = state.snapshot.featureBlocks.find((feature) => feature.id === state.selectedFeatureId);
  return selected ?? state.snapshot.featureBlocks[0] ?? {
    id: "unmapped-unknown",
    label: "Unclassified Modules",
    description: "No feature blocks are available.",
    pathPatterns: [],
    moduleIds: [],
    incomingEdges: 0,
    outgoingEdges: 0,
    changedFileCount: 0,
    riskLevel: "medium"
  };
}

function getRuntimeModulesForFeature(state: DashboardState, featureId: string): ModuleNode[] {
  if (featureId === "tests") {
    return state.snapshot.modules.filter((moduleNode) => moduleNode.isTest);
  }
  return state.snapshot.modules.filter((moduleNode) => moduleNode.featureId === featureId && !moduleNode.isTest);
}

function getModuleName(state: DashboardState, moduleId: string): string {
  return state.snapshot.modules.find((moduleNode) => moduleNode.id === moduleId)?.name ?? moduleId;
}

function getEntryPointMetrics(state: DashboardState): Array<{ label: string; value: number | string }> {
  const modules = state.snapshot.modules;
  return [
    {
      label: "Python entry points",
      value: modules.filter((moduleNode) => moduleNode.isEntryPoint).length
    },
    {
      label: "ROS / Bridge modules",
      value: modules.filter((moduleNode) => moduleNode.featureId === "ros-bridge-runtime").length
    },
    {
      label: "CLI-like modules",
      value: modules.filter((moduleNode) => /\b(cli|cmd|command|tool)\b/i.test(moduleNode.path)).length
    },
    {
      label: "Launch modules",
      value: modules.filter((moduleNode) => /\b(launch|launcher|startup)\b/i.test(moduleNode.path)).length
    }
  ];
}

function getArchitectureViewMetrics(state: DashboardState): Array<{ label: string; value: number | string }> {
  const folders = new Set(state.snapshot.modules.map((moduleNode) => moduleNode.path.split("/")[0]).filter(Boolean));
  return [
    {
      label: "Whole Diagram",
      value: state.snapshot.featureBlocks.length > 0 ? "On" : "Not analyzed"
    },
    {
      label: "Module Graph",
      value: state.snapshot.modules.length
    },
    {
      label: "Folder Groups",
      value: folders.size
    },
    {
      label: "Config Flow",
      value: state.snapshot.dependencies.filter((edge) => edge.kind === "config"
        || edge.from.includes("config")
        || edge.to.includes("config")).length
    },
    {
      label: "Runtime Flow",
      value: state.snapshot.dependencies.filter((edge) => edge.kind !== "test").length
    }
  ];
}

function getNeighborFeatures(state: DashboardState, featureId: string): FeatureBlock[] {
  const neighborIds = new Set<string>();
  for (const edge of getInterFeatureEdges(state)) {
    if (edge.from === featureId) {
      neighborIds.add(edge.to);
    }
    if (edge.to === featureId) {
      neighborIds.add(edge.from);
    }
  }
  const featuresById = new Map(state.snapshot.featureBlocks.map((feature) => [feature.id, feature]));
  return [...neighborIds]
    .map((id) => featuresById.get(id))
    .filter((feature): feature is FeatureBlock => Boolean(feature))
    .sort(compareFeatureBlocks);
}

function getFeatureDependencyInfo(state: DashboardState, featureId: string): {
  incoming: Array<{ feature: FeatureBlock; count: number }>;
  outgoing: Array<{ feature: FeatureBlock; count: number }>;
  incomingEdgeCount: number;
  outgoingEdgeCount: number;
} {
  const featuresById = new Map(state.snapshot.featureBlocks.map((feature) => [feature.id, feature]));
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();

  for (const edge of getInterFeatureEdges(state)) {
    const count = edge.count ?? 1;
    if (edge.to === featureId) {
      incoming.set(edge.from, (incoming.get(edge.from) ?? 0) + count);
    }
    if (edge.from === featureId) {
      outgoing.set(edge.to, (outgoing.get(edge.to) ?? 0) + count);
    }
  }

  const toList = (values: Map<string, number>) => [...values.entries()]
    .map(([id, count]) => ({
      feature: featuresById.get(id),
      count
    }))
    .filter((item): item is { feature: FeatureBlock; count: number } => Boolean(item.feature))
    .sort((left, right) => right.count - left.count || left.feature.label.localeCompare(right.feature.label));

  const incomingList = toList(incoming);
  const outgoingList = toList(outgoing);
  return {
    incoming: incomingList,
    outgoing: outgoingList,
    incomingEdgeCount: incomingList.reduce((total, item) => total + item.count, 0),
    outgoingEdgeCount: outgoingList.reduce((total, item) => total + item.count, 0)
  };
}

function rankKeyModules(runtimeModules: ModuleNode[], changedFiles: ChangedFile[]): ModuleNode[] {
  const changedModuleIds = new Set(changedFiles.map((file) => file.moduleId).filter((moduleId): moduleId is string => Boolean(moduleId)));
  return [...runtimeModules]
    .sort((left, right) => scoreKeyModule(right, changedModuleIds) - scoreKeyModule(left, changedModuleIds)
      || left.path.localeCompare(right.path));
}

function scoreKeyModule(moduleNode: ModuleNode, changedModuleIds: ReadonlySet<string>): number {
  let score = 0;
  if (changedModuleIds.has(moduleNode.id)) {
    score += 100;
  }
  score += (moduleNode.imports.length + moduleNode.importedBy.length) * 5;
  if (moduleNode.isEntryPoint) {
    score += 20;
  }
  if (moduleNode.riskLevel === "high") {
    score += 12;
  } else if (moduleNode.riskLevel === "medium") {
    score += 6;
  }
  return score;
}

function getFeatureRiskLevel(feature: FeatureBlock, changedFiles: ChangedFile[], runtimeModules: ModuleNode[]): FeatureBlock["riskLevel"] {
  if (changedFiles.some((file) => file.riskLevel === "high") || runtimeModules.some((moduleNode) => moduleNode.riskLevel === "high")) {
    return "high";
  }
  if (changedFiles.some((file) => file.riskLevel === "medium") || runtimeModules.some((moduleNode) => moduleNode.riskLevel === "medium")) {
    return "medium";
  }
  return feature.riskLevel;
}

function getRelatedTestsForFeature(
  state: DashboardState,
  selectedFeature: FeatureBlock,
  runtimeModules: ModuleNode[]
): ModuleNode[] {
  if (selectedFeature.id === "tests") {
    return [];
  }

  const runtimeIds = new Set(runtimeModules.map((moduleNode) => moduleNode.id));
  return state.snapshot.modules
    .filter((moduleNode) => moduleNode.isTest)
    .map((moduleNode) => ({
      moduleNode,
      score: scoreRelatedTest(moduleNode, selectedFeature, runtimeModules, runtimeIds)
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.moduleNode.path.localeCompare(right.moduleNode.path))
    .slice(0, 8)
    .map((item) => item.moduleNode);
}

function scoreRelatedTest(
  testModule: ModuleNode,
  selectedFeature: FeatureBlock,
  runtimeModules: ModuleNode[],
  runtimeIds: ReadonlySet<string>
): number {
  let score = 0;
  const inferredRuntimeFeature = inferRuntimeFeatureForTestPath(testModule.path);
  if (inferredRuntimeFeature?.id === selectedFeature.id) {
    score += 8;
  }
  if (testModule.imports.some((moduleId) => runtimeIds.has(moduleId))) {
    score += 6;
  }
  if (testModule.importedBy.some((moduleId) => runtimeIds.has(moduleId))) {
    score += 3;
  }

  const selectedTokens = tokenize(`${selectedFeature.id} ${selectedFeature.label} ${selectedFeature.pathPatterns.join(" ")}`);
  const testTokens = tokenize(testModule.path);
  const runtimeTokens = tokenize(runtimeModules.map((moduleNode) => `${moduleNode.id} ${moduleNode.name} ${moduleNode.path}`).join(" "));
  score += countIntersection(testTokens, selectedTokens) * 2;
  score += Math.min(countIntersection(testTokens, runtimeTokens), 4);
  return score;
}

function getInterFeatureEdges(state: DashboardState): PositionedEdge[] {
  const moduleFeatureById = new Map(state.snapshot.modules.map((moduleNode) => [moduleNode.id, moduleNode.featureId]));
  const edgeCounts = new Map<string, { from: string; to: string; kind: PositionedEdge["kind"]; count: number }>();

  for (const edge of state.snapshot.dependencies) {
    const from = moduleFeatureById.get(edge.from);
    const to = moduleFeatureById.get(edge.to);
    if (!from || !to || from === to) {
      continue;
    }
    const key = `${from}->${to}`;
    const existing = edgeCounts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      edgeCounts.set(key, {
        from,
        to,
        kind: edge.kind,
        count: 1
      });
    }
  }

  return [...edgeCounts.values()].sort((left, right) => right.count - left.count || `${left.from}->${left.to}`.localeCompare(`${right.from}->${right.to}`));
}

function limitEdges(edges: PositionedEdge[], limit: number): PositionedEdge[] {
  return edges.slice(0, limit);
}

function edgeDetailRows(edges: PositionedEdge[], state: DashboardState): string[] {
  const features = new Map(state.snapshot.featureBlocks.map((feature) => [feature.id, feature.label]));
  return edges.slice(0, 8).map((edge) => {
    const from = features.get(edge.from) ?? edge.from;
    const to = features.get(edge.to) ?? edge.to;
    const count = edge.count ?? 1;
    return `${from} -> ${to}: ${count} resolved import edge${count === 1 ? "" : "s"}`;
  });
}

function layoutFeatureNodesForGraph(
  state: DashboardState,
  features: FeatureBlock[],
  edges: PositionedEdge[],
  changedFeatureIds = new Set<string>()
): PositionedNode[] {
  const expandedFeatures = expandUnclassifiedFeatureNodes(state, features);
  const normalFeatures = expandedFeatures.filter((node) => node.kind !== "unclassifiedModule");
  const unclassifiedNodes = expandedFeatures.filter((node) => node.kind === "unclassifiedModule");
  const nodeWidth = 184;
  const nodeHeight = 96;
  const gapX = 92;
  const gapY = 38;
  const margin = 24;

  if (changedFeatureIds.size > 0 && normalFeatures.length > 1) {
    const changed = normalFeatures.filter((node) => changedFeatureIds.has(node.id));
    const impacted = normalFeatures.filter((node) => !changedFeatureIds.has(node.id));
    const placed = [
      ...changed.map((node, index) => ({
        ...node,
        x: margin,
        y: margin + index * (nodeHeight + gapY),
        width: nodeWidth,
        height: nodeHeight
      })),
      ...impacted.map((node, index) => ({
        ...node,
        x: margin + nodeWidth + gapX,
        y: margin + index * (nodeHeight + gapY),
        width: nodeWidth,
        height: nodeHeight
      }))
    ];
    return appendUnclassifiedNodes(placed, unclassifiedNodes, margin, nodeWidth, nodeHeight, gapX, gapY);
  }

  const outgoingCounts = new Map<string, number>();
  const incomingCounts = new Map<string, number>();
  for (const edge of edges) {
    outgoingCounts.set(edge.from, (outgoingCounts.get(edge.from) ?? 0) + (edge.count ?? 1));
    incomingCounts.set(edge.to, (incomingCounts.get(edge.to) ?? 0) + (edge.count ?? 1));
  }

  const sorted = [...normalFeatures].sort((left, right) => {
    const leftScore = (outgoingCounts.get(left.id) ?? 0) - (incomingCounts.get(left.id) ?? 0);
    const rightScore = (outgoingCounts.get(right.id) ?? 0) - (incomingCounts.get(right.id) ?? 0);
    return rightScore - leftScore || left.label.localeCompare(right.label);
  });
  const columns = Math.max(1, Math.min(4, Math.ceil(Math.sqrt(sorted.length))));
  const placed = sorted.map((node, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return {
      ...node,
      x: margin + column * (nodeWidth + gapX),
      y: margin + row * (nodeHeight + gapY),
      width: nodeWidth,
      height: nodeHeight
    };
  });

  return appendUnclassifiedNodes(placed, unclassifiedNodes, margin, nodeWidth, nodeHeight, gapX, gapY);
}

function expandUnclassifiedFeatureNodes(state: DashboardState, features: FeatureBlock[]): PositionedNode[] {
  const unclassified = features.find((feature) => feature.id === "unmapped-unknown");
  const regularNodes = features
    .filter((feature) => feature.id !== "unmapped-unknown")
    .map((feature, index): PositionedNode => ({
      id: feature.id,
      label: feature.label,
      x: 0,
      y: 0,
      width: 184,
      height: 96,
      color: graphColor(index),
      kind: "feature",
      featureId: feature.id
    }));

  if (!unclassified) {
    return regularNodes;
  }

  const modules = state.snapshot.modules
    .filter((moduleNode) => moduleNode.featureId === "unmapped-unknown" && !moduleNode.isTest)
    .sort((left, right) => left.path.localeCompare(right.path));
  if (modules.length > 0 && modules.length <= 8) {
    return [
      ...regularNodes,
      ...modules.map((moduleNode, index): PositionedNode => ({
        id: `unclassified:${moduleNode.id}`,
        label: shortenModuleLabel(moduleNode.name),
        x: 0,
        y: 0,
        width: 184,
        height: 88,
        color: "#8d99a8",
        kind: "unclassifiedModule",
        featureId: unclassified.id,
        path: moduleNode.path,
        subLines: [moduleNode.path, formatClassificationReason(moduleNode.classificationReason?.category)],
        badge: "Unclassified module",
        riskLevel: moduleNode.riskLevel
      }))
    ];
  }

  return [
    ...regularNodes,
    {
      id: unclassified.id,
      label: "Unclassified Modules",
      x: 0,
      y: 0,
      width: 184,
      height: 96,
      color: "#8d99a8",
      kind: "feature",
      featureId: unclassified.id,
      subLines: modules.slice(0, 3).map((moduleNode) => moduleNode.path),
      badge: `${modules.length} modules`
    }
  ];
}

function appendUnclassifiedNodes(
  placed: PositionedNode[],
  unclassifiedNodes: PositionedNode[],
  margin: number,
  nodeWidth: number,
  nodeHeight: number,
  gapX: number,
  gapY: number
): PositionedNode[] {
  if (unclassifiedNodes.length === 0) {
    return placed;
  }
  const startColumn = Math.max(1, Math.ceil(Math.sqrt(Math.max(placed.length, 1))));
  const startX = margin + startColumn * (nodeWidth + gapX);
  const nodes = unclassifiedNodes.map((node, index) => ({
    ...node,
    x: startX,
    y: margin + index * (nodeHeight + gapY),
    width: node.width ?? nodeWidth,
    height: node.height ?? nodeHeight
  }));
  return [...placed, ...nodes];
}

function layoutModuleNodes(modules: ModuleNode[]): PositionedNode[] {
  const nodeCount = Math.max(modules.length, 1);
  const centerX = 420;
  const centerY = 210;
  const radius = Math.max(96, Math.min(180, 48 + modules.length * 12));
  return modules.map((moduleNode, index) => {
    const angle = (Math.PI * 2 * index) / nodeCount - Math.PI / 2;
    return {
      id: moduleNode.id,
      label: shortenModuleLabel(moduleNode.packageName ?? moduleNode.name ?? moduleNode.id),
      x: Math.round(centerX + Math.cos(angle) * radius),
      y: Math.round(centerY + Math.sin(angle) * radius),
      color: moduleNode.isTest ? "#76e3ea" : graphColor(index)
    };
  });
}

function getViewBox(nodes: PositionedNode[], minWidth = 640, minHeight = 260): string {
  if (nodes.length === 0) {
    return "0 0 840 420";
  }
  const minX = Math.min(...nodes.map((node) => node.x)) - 24;
  const minY = Math.min(...nodes.map((node) => node.y)) - 24;
  const maxX = Math.max(...nodes.map((node) => node.x + (node.width ?? 0))) + 24;
  const maxY = Math.max(...nodes.map((node) => node.y + (node.height ?? 0))) + 24;
  return `${minX} ${minY} ${Math.max(maxX - minX, minWidth)} ${Math.max(maxY - minY, minHeight)}`;
}

function getPointViewBox(nodes: PositionedNode[]): string {
  if (nodes.length === 0) {
    return "0 0 840 420";
  }
  const minX = Math.min(...nodes.map((node) => node.x)) - 90;
  const minY = Math.min(...nodes.map((node) => node.y)) - 70;
  const maxX = Math.max(...nodes.map((node) => node.x)) + 240;
  const maxY = Math.max(...nodes.map((node) => node.y)) + 90;
  return `${minX} ${minY} ${Math.max(maxX - minX, 360)} ${Math.max(maxY - minY, 240)}`;
}

function emptyGraph(reason: string): GraphData {
  return {
    nodes: [],
    edges: [],
    viewBox: "0 0 840 420",
    emptyReason: reason
  };
}

function expandModuleNeighborhood(seedIds: string[], dependencies: DependencyEdge[], limit: number): string[] {
  const selected = new Set(seedIds);
  for (const edge of dependencies) {
    if (selected.size >= limit) {
      break;
    }
    if (selected.has(edge.from)) {
      selected.add(edge.to);
    }
    if (selected.has(edge.to)) {
      selected.add(edge.from);
    }
  }
  return [...selected].slice(0, limit);
}

function getTopConnectedModuleIds(modules: ModuleNode[]): string[] {
  return [...modules]
    .sort((left, right) => (right.imports.length + right.importedBy.length) - (left.imports.length + left.importedBy.length)
      || left.path.localeCompare(right.path))
    .map((moduleNode) => moduleNode.id);
}

function moduleShell(moduleId: string): ModuleNode {
  return {
    id: moduleId,
    name: moduleId.split("/").at(-1) ?? moduleId,
    path: `${moduleId}.py`,
    language: "python",
    packageName: moduleId.replaceAll("/", "."),
    imports: [],
    importedBy: [],
    isEntryPoint: false,
    isTest: false,
    isOrphan: false,
    riskLevel: "low"
  };
}

function compareFeatureBlocks(left: FeatureBlock, right: FeatureBlock): number {
  if (left.id === "unmapped-unknown") {
    return 1;
  }
  if (right.id === "unmapped-unknown") {
    return -1;
  }
  return right.moduleIds.length - left.moduleIds.length || left.label.localeCompare(right.label);
}

function graphColor(index: number): string {
  const colors = ["#58a6ff", "#7ee787", "#ffa657", "#b17cff", "#76e3ea", "#f2cc60", "#ff7b72", "#8d99a8"];
  return colors[index % colors.length]!;
}

function tokenize(value: string): Set<string> {
  return new Set(value.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2 && token !== "test" && token !== "tests"));
}

function countIntersection(left: ReadonlySet<string>, right: ReadonlySet<string>): number {
  let count = 0;
  for (const value of left) {
    if (right.has(value)) {
      count += 1;
    }
  }
  return count;
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

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("en-AU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

function formatBaselineLabel(value: string): string {
  return `baseline_${formatShortDate(value)}`;
}

function formatPathKind(value: DashboardState["diagnostics"]["pathKind"]): string {
  switch (value) {
    case "unc-wsl":
      return "UNC WSL";
    case "unc":
      return "UNC";
    case "local":
      return "Local";
    case "unknown":
      return "Unknown";
  }
}

function formatClassificationReason(value: NonNullable<ModuleNode["classificationReason"]>["category"] | undefined): string {
  switch (value) {
    case "path-pattern-match":
      return "path pattern match";
    case "import-neighbor-inference":
      return "import-neighbor inference";
    case "no-path-pattern-match":
      return "no path pattern match";
    case "no-strong-import-neighbor-inference":
      return "no strong import-neighbor inference";
    case "ambiguous-match":
      return "ambiguous match";
    default:
      return "not classified";
  }
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function shortenModuleLabel(value: string): string {
  if (value.length <= 42) {
    return value;
  }
  const parts = value.split(".");
  if (parts.length > 2) {
    return `${parts.slice(0, 2).join(".")}...${parts.at(-1) ?? ""}`;
  }
  return `${value.slice(0, 38)}...`;
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
