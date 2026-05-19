import React, { useEffect, useMemo, useState } from "react";
import {
  DashboardMode,
  DashboardState,
  dashboardModes,
  getModeLabel
} from "../webview/dashboardState";
import { ExtensionToWebviewMessage, isExtensionToWebviewMessage } from "../webview/messageProtocol";
import { postToExtension } from "./vscodeApi";

type ViewStatus =
  | { type: "loading"; message: string }
  | { type: "error"; message: string }
  | { type: "ready"; state: DashboardState };

export function App(): React.JSX.Element {
  const [status, setStatus] = useState<ViewStatus>({
    type: "loading",
    message: "Waiting for dashboard state..."
  });

  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>) => {
      const message = event.data;
      if (!isExtensionToWebviewMessage(message)) {
        return;
      }
      applyExtensionMessage(message, setStatus);
    };

    window.addEventListener("message", onMessage);
    postToExtension({ type: "ready" });
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    let selectionActive = false;
    let timer: number | undefined;

    const notifySelection = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const selection = window.getSelection();
        const active = Boolean(selection && selection.toString().length > 0);
        if (active !== selectionActive) {
          selectionActive = active;
          postToExtension({ type: "selectionState", active });
        }
      }, 80);
    };

    document.addEventListener("selectionchange", notifySelection);
    document.addEventListener("mouseup", notifySelection);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("selectionchange", notifySelection);
      document.removeEventListener("mouseup", notifySelection);
    };
  }, []);

  if (status.type === "error") {
    return (
      <main className="dashboard-shell dashboard-center" data-testid="react-dashboard-root">
        <section className="empty-state" data-testid="react-dashboard-error">
          <p className="eyebrow">Live Architecture Map</p>
          <h1>Dashboard unavailable</h1>
          <p>{status.message}</p>
        </section>
      </main>
    );
  }

  if (status.type === "loading") {
    return (
      <main className="dashboard-shell dashboard-center" data-testid="react-dashboard-root">
        <section className="empty-state" data-testid="react-dashboard-loading">
          <p className="eyebrow">Live Architecture Map</p>
          <h1>Loading dashboard</h1>
          <p>{status.message}</p>
        </section>
      </main>
    );
  }

  return <Dashboard state={status.state} />;
}

function Dashboard({ state }: { state: DashboardState }): React.JSX.Element {
  const activeFeature = useMemo(
    () => state.snapshot.featureBlocks.find((feature) => feature.id === state.selectedFeatureId) ?? state.snapshot.featureBlocks[0],
    [state.selectedFeatureId, state.snapshot.featureBlocks]
  );

  return (
    <main className="dashboard-shell" data-testid="react-dashboard-root">
      <header className="topbar">
        <div>
          <p className="eyebrow">Live Architecture Map</p>
          <h1>{state.workspace.name}</h1>
        </div>
        <div className="status-strip" aria-label="Dashboard status">
          <span>{getModeLabel(state.mode)}</span>
          <span>{state.diagnostics.stateSource === "real" ? "Live workspace data" : "Diagnostic state"}</span>
          <span>{state.workspace.isDirty ? "Changes detected" : "Clean"}</span>
        </div>
      </header>

      <nav className="mode-tabs" aria-label="Dashboard modes">
        {dashboardModes.map((mode) => (
          <button
            key={mode}
            className={mode === state.mode ? "active" : undefined}
            data-testid={`mode-${mode}`}
            type="button"
            onClick={() => postToExtension({ type: "setMode", mode })}
          >
            {getModeLabel(mode)}
          </button>
        ))}
      </nav>

      <section className="action-row" aria-label="Dashboard actions">
        <button type="button" onClick={() => postToExtension({ type: "refresh" })}>Refresh</button>
        <button type="button" onClick={() => postToExtension({ type: "captureBaseline" })}>Capture Baseline</button>
        <button type="button" onClick={() => postToExtension({ type: "showDiffSinceBaseline" })}>Show Diff</button>
        <button type="button" onClick={() => postToExtension({ type: "exportSnapshot" })}>Export</button>
        <button type="button" onClick={() => postToExtension({ type: "configure" })}>Configure</button>
        <button type="button" onClick={() => focusTimeline()}>Timeline</button>
      </section>

      <section className="summary-grid" aria-label="Workspace summary">
        <Metric label="Python files" value={state.diagnostics.pythonFileCount} />
        <Metric label="Modules" value={state.diagnostics.moduleCount} />
        <Metric label="Dependencies" value={state.diagnostics.dependencyCount} />
        <Metric label="Changed files" value={state.diagnostics.changedFileCount} />
        <Metric label="Git" value={state.diagnostics.gitStatusSource} />
        <Metric label="Scanner" value={state.diagnostics.scannerStatus} />
      </section>

      <section className="mode-panel">
        {state.mode === "liveChanges" && <LiveChanges state={state} />}
        {state.mode === "wholeArchitecture" && <WholeArchitecture state={state} />}
        {state.mode === "featureFocus" && <FeatureFocus state={state} activeFeatureId={activeFeature?.id} />}
        {state.mode === "diffSinceBaseline" && <DiffSinceBaseline state={state} />}
      </section>

      <details className="diagnostics" data-testid="workspace-diagnostics-panel">
        <summary>Diagnostics</summary>
        <dl>
          <Diagnostic label="Path type" value={state.diagnostics.pathKind} />
          <Diagnostic label="Git branch" value={state.diagnostics.gitBranch} />
          <Diagnostic label="Graph nodes" value={state.diagnostics.graphNodeCount} />
          <Diagnostic label="Graph edges" value={state.diagnostics.graphEdgeCount} />
          <Diagnostic label="Unresolved imports" value={state.diagnostics.unresolvedImportCount} />
          <Diagnostic label="Updated" value={state.diagnostics.lastUpdatedIso} />
          {state.error ? <Diagnostic label="Error" value={state.error} /> : null}
          {state.diagnostics.fallbackReason ? <Diagnostic label="Diagnostic reason" value={state.diagnostics.fallbackReason} /> : null}
        </dl>
      </details>
    </main>
  );
}

function LiveChanges({ state }: { state: DashboardState }): React.JSX.Element {
  return (
    <div className="two-column">
      <section data-testid="current-change-area">
        <h2>Current Change Area</h2>
        <p>{state.snapshot.impactedFeatures.length} impacted features from {state.snapshot.changedFiles.length} changed files.</p>
        <ul className="plain-list">
          {state.snapshot.impactedFeatures.slice(0, 6).map((feature) => (
            <li key={feature.featureId}>{feature.label}: {feature.reason}</li>
          ))}
        </ul>
      </section>
      <section data-testid="changed-files-table">
        <h2>Changed Files</h2>
        <ul className="plain-list">
          {state.snapshot.changedFiles.slice(0, 8).map((file) => (
            <li key={`${file.status}:${file.path}`}>{file.status} - {file.path}</li>
          ))}
        </ul>
      </section>
      <GraphPlaceholder testId="architecture-impact-graph" title="Architecture Impact Graph" />
      <GraphPlaceholder testId="dependency-graph" title="Dependency Graph" />
    </div>
  );
}

function WholeArchitecture({ state }: { state: DashboardState }): React.JSX.Element {
  return (
    <div className="two-column">
      <GraphPlaceholder testId="whole-architecture-diagram" title="Whole Architecture" />
      <section data-testid="architecture-overview-cards">
        <h2>Feature Blocks</h2>
        <ul className="plain-list">
          {state.snapshot.featureBlocks.map((feature) => (
            <li key={feature.id}>{feature.label}: {feature.moduleIds.length} modules</li>
          ))}
        </ul>
      </section>
      <section data-testid="architecture-health-cards">
        <h2>Architecture Health</h2>
        <p>{state.snapshot.health.highRiskModuleCount} high-risk modules, {state.snapshot.health.orphanModuleCount} orphan modules.</p>
      </section>
    </div>
  );
}

function FeatureFocus({ state, activeFeatureId }: { state: DashboardState; activeFeatureId?: string }): React.JSX.Element {
  const activeFeature = state.snapshot.featureBlocks.find((feature) => feature.id === activeFeatureId);
  const modules = activeFeature
    ? state.snapshot.modules.filter((moduleNode) => activeFeature.moduleIds.includes(moduleNode.id))
    : [];

  return (
    <div className="two-column">
      <section>
        <label className="select-label" htmlFor="feature-selector">Feature</label>
        <select
          id="feature-selector"
          data-testid="feature-selector"
          value={activeFeature?.id ?? ""}
          onChange={(event) => postToExtension({ type: "selectFeature", featureId: event.target.value })}
        >
          {state.snapshot.featureBlocks.map((feature) => (
            <option key={feature.id} value={feature.id}>{feature.label}</option>
          ))}
        </select>
      </section>
      <section data-testid="module-composition-panel">
        <h2>{activeFeature?.label ?? "Feature"} Modules</h2>
        <ul className="plain-list">
          {modules.slice(0, 12).map((moduleNode) => (
            <li key={moduleNode.id}>{moduleNode.path}</li>
          ))}
        </ul>
      </section>
      <GraphPlaceholder testId="internal-dependency-graph" title="Internal Dependency Graph" />
      <section data-testid="related-external-dependencies">
        <h2>Related External Dependencies</h2>
        <p>{state.snapshot.dependencies.length} workspace dependency edges are available.</p>
      </section>
      <section data-testid="related-tests">
        <h2>Related Tests</h2>
        <ul className="plain-list">
          {modules.filter((moduleNode) => moduleNode.isTest).map((moduleNode) => (
            <li key={moduleNode.id}>{moduleNode.path}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function DiffSinceBaseline({ state }: { state: DashboardState }): React.JSX.Element {
  return (
    <div className="two-column">
      <section data-testid="baseline-selector">
        <h2>Baseline</h2>
        <p>{state.baselineDiff?.baselineCapturedAtIso ?? "No baseline captured for this workspace."}</p>
      </section>
      <section data-testid="baseline-summary-cards">
        <h2>Summary</h2>
        <p>{state.baselineDiff?.changedModules.length ?? 0} changed modules since baseline.</p>
      </section>
      <GraphPlaceholder testId="before-after-graph" title="Before After Graph" />
      <section data-testid="top-changes-table">
        <h2>Top Changes</h2>
        <ul className="plain-list">
          {(state.baselineDiff?.changedModules ?? []).slice(0, 8).map((moduleNode) => (
            <li key={moduleNode.id}>{moduleNode.path}</li>
          ))}
        </ul>
      </section>
      <section data-testid="structural-timeline">
        <h2>Structural Timeline</h2>
        <p>Baseline and current snapshot comparison is ready when a baseline exists.</p>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }): React.JSX.Element {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Diagnostic({ label, value }: { label: string; value: string | number }): React.JSX.Element {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

function GraphPlaceholder({ testId, title }: { testId: string; title: string }): React.JSX.Element {
  return (
    <section className="graph-placeholder" data-testid={testId}>
      <h2>{title}</h2>
      <div className="graph-surface" data-testid="react-flow-placeholder">
        <span>React Flow canvas migration pending</span>
      </div>
    </section>
  );
}

function applyExtensionMessage(
  message: ExtensionToWebviewMessage,
  setStatus: React.Dispatch<React.SetStateAction<ViewStatus>>
): void {
  switch (message.type) {
    case "state":
      setStatus({ type: "ready", state: message.state as DashboardState });
      return;
    case "error":
      setStatus({ type: "error", message: message.message });
      return;
    case "loading":
      setStatus({ type: "loading", message: message.message });
      return;
  }
}

function focusTimeline(): void {
  const timeline = document.querySelector("[data-testid='structural-timeline']");
  if (timeline instanceof HTMLElement) {
    timeline.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  postToExtension({ type: "focusTimeline", available: Boolean(timeline) });
}
