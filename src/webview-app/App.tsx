import React, { useEffect, useMemo, useState } from "react";
import {
  DashboardMode,
  DashboardState,
  dashboardModes,
  getModeLabel
} from "../webview/dashboardState";
import { ExtensionToWebviewMessage, isExtensionToWebviewMessage } from "../webview/messageProtocol";
import { buildFeatureFocusViewModel } from "../webview/featureFocusViewModel";
import { buildGraphViewForTarget } from "../webview/graphViewModel";
import { GraphCanvas } from "./GraphCanvas";
import { postToExtension } from "./vscodeApi";

type ViewStatus =
  | { type: "loading"; message: string }
  | { type: "error"; message: string }
  | { type: "ready"; state: DashboardState };

declare global {
  interface Window {
    __LIVE_ARCHITECTURE_MAP_INITIAL_STATE__?: DashboardState;
  }
}

export function App(): React.JSX.Element {
  const [status, setStatus] = useState<ViewStatus>(() => {
    const initialState = window.__LIVE_ARCHITECTURE_MAP_INITIAL_STATE__;
    return initialState
      ? { type: "ready", state: initialState }
      : {
        type: "loading",
        message: "Waiting for dashboard state..."
      };
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
      <main className="dashboard-shell dashboard-center" data-testid="dashboard-root">
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
      <main className="dashboard-shell dashboard-center" data-testid="dashboard-root">
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
    <main className="dashboard-shell" data-testid="dashboard-root">
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
          <Diagnostic label="Cache hits" value={state.diagnostics.cache.hitCount} />
          <Diagnostic label="Cache misses" value={state.diagnostics.cache.missCount} />
          <Diagnostic label="Cache entries" value={state.diagnostics.cache.entryCount} />
          <Diagnostic label="Incremental" value={state.diagnostics.incremental ? "true" : "false"} />
          <Diagnostic label="Changed paths" value={state.diagnostics.changedPathCount} />
          <Diagnostic label="Index reason" value={state.diagnostics.workspaceIndexReason} />
          <Diagnostic label="Total refresh" value={`${state.diagnostics.analysisTimings.find((entry) => entry.phase === "total refresh")?.durationMs ?? 0} ms`} />
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
  const risksByLevel = new Map(state.snapshot.risks.map((risk) => [risk.level, risk]));
  const impactView = useMemo(() => buildGraphViewForTarget(state, "liveImpact"), [state]);
  const dependencyView = useMemo(() => buildGraphViewForTarget(state, "liveDependency"), [state]);

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
      <div className="risk-grid" aria-label="Risk summary">
        {(["high", "medium", "low"] as const).map((level) => {
          const risk = risksByLevel.get(level);
          return (
            <section className={`risk-card risk-${level}`} data-testid={`risk-card-${level}`} key={level}>
              <h2>{level}</h2>
              <strong>{risk?.count ?? 0}</strong>
              <p>{risk?.detail ?? "No current risk items."}</p>
            </section>
          );
        })}
      </div>
      <section data-testid="changed-files-table">
        <h2>Changed Files</h2>
        <ul className="plain-list">
          {state.snapshot.changedFiles.slice(0, 8).map((file) => (
            <li key={`${file.status}:${file.path}`}>{file.status} - {file.path}</li>
          ))}
        </ul>
      </section>
      <section data-testid="validation-status-row">
        <h2>Validation Status</h2>
        <ul className="plain-list">
          {state.snapshot.validations.slice(0, 6).map((validation) => (
            <li key={validation.id}>{validation.label}: {validation.state}</li>
          ))}
        </ul>
      </section>
      <GraphCanvas testId="architecture-impact-graph" view={impactView} />
      <GraphCanvas testId="dependency-graph" view={dependencyView} />
    </div>
  );
}

function WholeArchitecture({ state }: { state: DashboardState }): React.JSX.Element {
  const graphView = useMemo(() => buildGraphViewForTarget(state, "wholeArchitecture"), [state]);

  return (
    <div className="two-column">
      <GraphCanvas testId="whole-architecture-diagram" view={graphView} />
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
  const focusView = useMemo(
    () => buildFeatureFocusViewModel(state, activeFeatureId),
    [activeFeatureId, state]
  );
  const activeFeature = focusView.activeFeature;
  const graphView = useMemo(
    () => buildGraphViewForTarget(state, "featureInternal", activeFeature?.id),
    [activeFeature?.id, state]
  );

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
          {focusView.runtimeModules.slice(0, 12).map((moduleNode) => (
            <li key={moduleNode.id}>{moduleNode.path}</li>
          ))}
        </ul>
      </section>
      <GraphCanvas testId="internal-dependency-graph" view={graphView} />
      <section data-testid="related-external-dependencies">
        <h2>Related External Dependencies</h2>
        <p>{state.snapshot.dependencies.length} workspace dependency edges are available.</p>
      </section>
      <section data-testid="related-tests">
        <h2>Related Tests</h2>
        <ul className="plain-list">
          {focusView.relatedTests.map((moduleNode) => (
            <li key={moduleNode.id}>{moduleNode.path}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function DiffSinceBaseline({ state }: { state: DashboardState }): React.JSX.Element {
  const graphView = useMemo(() => buildGraphViewForTarget(state, "baselineDiff"), [state]);

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
      <GraphCanvas testId="before-after-graph" view={graphView} />
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
