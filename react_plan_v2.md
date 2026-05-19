# react_plan_v2.md

## 0. Purpose

This file is the single source of truth for migrating **Live Architecture Map** from the current hand-built HTML/SVG dashboard to the long-term React webview architecture.

This v2 plan supersedes `react_plan_v1.md` for implementation. Use this file only unless the user explicitly asks otherwise.

The goal is not just to fix one bad edge route. The goal is to establish the correct long-term structure for an interactive architecture visualization extension:

```text
VS Code extension host
  -> workspace scanner / git status / dependency graph / feature classifier
  -> normalized dashboard state + graph view models
  -> VS Code webview shell
  -> Vite-built React app
  -> React Flow canvas + ELK automatic layout
  -> Playwright + VS Code integration + VSIX packaging validation
```

The finished extension must still be safe for inspected workspaces. It may read files and git status, but it must not write generated files into the inspected target workspace.

---

## 1. v2 Improvements Over v1

v2 adds four mandatory clarifications that were not strong enough in v1:

1. **VSIX asset packaging validation**
   - The final VSIX must include the Vite-built webview bundle.
   - Validate that the packaged VSIX contains `media/webview` assets, manifest, JavaScript, and CSS.
   - The installed extension must load the React dashboard from packaged assets, not from dev-only files.

2. **ELK layout adapter must be pure and testable**
   - Do not hide ELK logic inside React components.
   - Create a testable layout adapter module.
   - Unit tests must be able to call the graph model and layout conversion logic without starting VS Code.

3. **Implementation checkpoints are mandatory**
   - Split the migration into controlled checkpoints:
     - Checkpoint A: React shell loads.
     - Checkpoint B: Dashboard frame and messaging work.
     - Checkpoint C: Graph view models are generated.
     - Checkpoint D: React Flow + ELK renders graphs.
     - Checkpoint E: all modes are migrated and legacy renderer is unreachable.
     - Checkpoint F: VSIX packaging and installed extension validation.
   - Each checkpoint must compile and pass the required tests before moving on.

4. **Old renderer removal criteria are strict**
   - Final live dashboard path must not use `src/webview/renderers.ts` for graph rendering.
   - Old `svg.graph-svg` graph stages must not remain as the live graph implementation.
   - If old renderer helper code remains temporarily, it must be unreachable from the dashboard and documented.

---

## 2. Current State Summary

Current implementation characteristics:

- Extension repository: `June-Jevons/vs_extension_work`.
- VS Code extension name: `live-architecture-map`.
- Runtime entry: `src/extension.ts`.
- Dashboard panel lifecycle: `src/webview/dashboardPanel.ts`.
- Current dashboard HTML shell: `src/webview/html.ts`.
- Current standalone renderer: `src/webview/standaloneHtml.ts`.
- Current dashboard string renderer: `src/webview/renderers.ts`.
- Current dashboard styles: `src/webview/styles.ts`.
- Current visual render script: `scripts/render-ui-snapshots.ts`.
- Current Playwright test: `visual/dashboard.spec.ts`.

Current graph problems:

- Feature-level graphs are rendered by manually constructing SVG strings.
- Feature graph node placement is manually computed.
- Feature graph edge routing is custom and heuristic-based.
- Module graphs use direct center-to-center SVG paths.
- Visual tests check presence and dimensions but do not reliably catch edges crossing through nodes.

This plan replaces the dashboard rendering path with React, React Flow, and ELK.

---

## 3. Target Stack

### 3.1 Runtime dependencies

Install these as production dependencies:

```powershell
npm install react react-dom @xyflow/react elkjs
```

Reason:

- `react` and `react-dom`: webview UI framework.
- `@xyflow/react`: React Flow package for interactive node and edge canvas.
- `elkjs`: automatic layout engine for layered architecture diagrams and orthogonal edge routing.

### 3.2 Development dependencies

Install these as dev dependencies:

```powershell
npm install -D vite @vitejs/plugin-react @types/react @types/react-dom
```

Optional only if Codex can keep the tests stable:

```powershell
npm install -D vitest jsdom
```

Do not add D3, Cytoscape, Mermaid, Graphviz, canvas rendering, or a large state management library in this pass.

---

## 4. Non-Negotiable Constraints

1. **Windows Native workflow only**
   - Do not implement or validate from WSL.
   - Use Windows Native VS Code and PowerShell.
   - The inspected target workspace may be a WSL UNC path, but the extension process must be Windows Native.

2. **No inspected-workspace writes**
   - Do not write generated files, caches, snapshots, settings, or metadata into the inspected target workspace.
   - Generated extension validation artifacts may stay under the extension repository's ignored `artifacts/` folder.

3. **No CDN / no remote scripts**
   - The webview must load local bundled assets only.
   - Do not use remote scripts, remote styles, external fonts, or CDN packages.

4. **Strict CSP**
   - The real VS Code webview must keep a strict Content Security Policy.
   - Use nonces and `webview.asWebviewUri(...)` for local bundled JS/CSS.
   - Do not use unsafe inline scripts in the real VS Code webview.
   - Standalone Playwright HTML may use a relaxed CSP only for the test harness.

5. **No silent legacy fallback**
   - If React bundle loading fails, show an explicit missing-bundle error page.
   - If ELK layout fails, show an explicit graph layout error state and log the reason.
   - Do not silently fall back to old custom SVG graph rendering.

6. **Preserve existing extension behavior**
   - Keep Activity Bar launcher.
   - Keep all existing commands.
   - Keep dashboard modes:
     - Live Changes
     - Whole Architecture
     - Feature Focus
     - Diff Since Baseline
   - Keep Refresh, Configure, Timeline, Capture Baseline, Diff Since Baseline, Export Snapshot.
   - Keep diagnostics panel information.
   - Keep baseline and snapshot storage behavior.

7. **Type safety**
   - Keep strict TypeScript behavior.
   - Avoid `any` in graph/state models.
   - If `any` is unavoidable for third-party interop, isolate it in adapter modules and document why.

8. **Validation-first implementation**
   - Each checkpoint must compile before moving to the next checkpoint.
   - Do not ignore failing tests.
   - If a test becomes obsolete, update it to validate the new behavior instead of removing coverage.

---

## 5. Target Architecture

### 5.1 Extension host responsibilities

The extension host owns:

- VS Code activation and command registration.
- Workspace scanning.
- Git status reading.
- Python import/dependency graph building.
- Feature classification.
- Risk scoring.
- Baseline and snapshot storage.
- Dashboard state production.
- Message handling from the webview.
- Export snapshot command.
- Webview asset URI generation.

The extension host must not own:

- React component rendering.
- React Flow canvas state.
- Node dragging/selection UI.
- CSS dashboard layout.
- SVG path routing logic.

### 5.2 React webview responsibilities

The React app owns:

- Dashboard layout.
- Mode tabs.
- Action buttons.
- Graph canvas rendering.
- React Flow nodes and edges.
- ELK layout execution through a pure layout adapter.
- Graph controls: fit, zoom, reset, minimap if used.
- Inspector/selection UI.
- Standalone visual render mode.

### 5.3 Shared model boundary

Keep a clean serializable boundary:

```text
analysis state -> graph view model -> React Flow model -> ELK layout result -> rendered canvas
```

Recommended files:

```text
src/webview/dashboardState.ts
src/webview/messageProtocol.ts
src/webview/graphViewModel.ts
src/graph/graphViews.ts
src/graph/graphGeometry.ts
```

Recommended graph view model shape:

```ts
export interface ArchitectureGraphViewModel {
  id: string;
  title: string;
  subtitle: string;
  mode: DashboardMode;
  nodes: ArchitectureGraphNode[];
  edges: ArchitectureGraphEdge[];
  summary?: string;
  detailRows?: string[];
  emptyReason?: string;
}

export interface ArchitectureGraphNode {
  id: string;
  type: 'feature' | 'module' | 'unclassifiedModule' | 'summary';
  label: string;
  width: number;
  height: number;
  color: string;
  featureId?: string;
  path?: string;
  subLines?: string[];
  badge?: string;
  riskLevel?: RiskLevel;
}

export interface ArchitectureGraphEdge {
  id: string;
  source: string;
  target: string;
  kind: 'import' | 'config' | 'test' | 'entrypoint' | 'feature' | 'unknown';
  count?: number;
  label?: string;
}
```

The exact shape may evolve, but the separation must remain.

---

## 6. Proposed File Layout

Move toward this layout:

```text
src/
  extension.ts

  core/
    analysisEngine.ts
    workspaceScanner.ts
    featureMapper.ts
    riskScorer.ts
    outputChannel.ts

  graph/
    dependencyGraph.ts
    graphDiff.ts
    graphViews.ts
    graphGeometry.ts

  webview/
    dashboardPanel.ts
    dashboardState.ts
    graphViewModel.ts
    html.ts
    messageProtocol.ts
    standaloneHtml.ts
    webviewAssets.ts

  webview-app/
    index.html
    src/
      main.tsx
      App.tsx
      vscodeApi.ts
      types.ts
      styles.css
      state/
        dashboardStore.ts
      layout/
        elkLayoutAdapter.ts
        reactFlowMapper.ts
      components/
        DashboardShell.tsx
        TopToolbar.tsx
        DiagnosticsPanel.tsx
        ModeContent.tsx
        LiveChangesView.tsx
        WholeArchitectureView.tsx
        FeatureFocusView.tsx
        DiffSinceBaselineView.tsx
        GraphCanvas.tsx
        nodes/
          FeatureNode.tsx
          ModuleNode.tsx
          SummaryNode.tsx
        panels/
          ChangedFilesTable.tsx
          ValidationStatus.tsx
          InspectorPanel.tsx
```

Generated build output should go here or an equivalent extension-owned static folder:

```text
media/webview/
  assets/*.js
  assets/*.css
  .vite/manifest.json
```

Do not put generated webview build output under `src/`.

---

## 7. Build System Plan

### 7.1 Vite config

Create:

```text
webview.vite.config.ts
```

Required behavior:

- Input root: `src/webview-app`.
- Output directory: `media/webview`.
- Generate manifest.
- Use React plugin.
- Use a relative or empty base suitable for VS Code webview asset loading.
- Do not start a Vite dev server as part of normal compile/test.

Conceptual config:

```ts
export default defineConfig({
  root: 'src/webview-app',
  base: '',
  plugins: [react()],
  build: {
    outDir: '../../media/webview',
    emptyOutDir: true,
    manifest: true,
    sourcemap: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/webview-app/index.html')
    }
  }
});
```

Codex must adapt this to the actual TypeScript and Vite constraints.

### 7.2 Package scripts

Update `package.json` scripts to separate extension and webview compilation:

```json
{
  "scripts": {
    "compile:extension": "tsc -p ./",
    "compile:webview": "vite build --config ./webview.vite.config.ts",
    "compile": "npm run compile:extension && npm run compile:webview",
    "watch:extension": "tsc -watch -p ./",
    "watch:webview": "vite build --watch --config ./webview.vite.config.ts",
    "test": "npm run compile && npm run test:unit",
    "test:unit": "tsc -p ./tsconfig.test.json && node ./out-test/test/suite/runTests.js",
    "visual:render": "npm run compile && tsc -p ./tsconfig.scripts.json && node ./out-scripts/scripts/render-ui-snapshots.js",
    "visual:test": "playwright test",
    "test:vscode": "npm run compile && tsc -p ./tsconfig.test.json && vscode-test --config ./.vscode-test.mjs",
    "validate": "npm run compile && npm run test:unit && npm run visual:render && npm run visual:test",
    "validate:full": "npm run validate && npm run test:vscode && npm run package",
    "package": "npm run compile && vsce package"
  }
}
```

If Codex chooses to include `test:vscode` inside `validate`, the final report must state that clearly.

### 7.3 VS Code launch/tasks

Review `.vscode/tasks.json` and `.vscode/launch.json` if present.

Rules:

- Prefer npm tasks over nested PowerShell command strings.
- Avoid nested quoting that breaks under `pwsh.exe`.
- F5 must run compile reliably on Windows Native VS Code.

---

## 8. Webview Shell Plan

### 8.1 Replace old HTML string rendering

`src/webview/html.ts` must stop calling `renderDashboardShell(state)`.

It should produce only a shell:

```html
<body>
  <div id="root"></div>
  <script nonce="..." src="...built webview JS..."></script>
</body>
```

CSS assets must also be loaded from the Vite manifest.

### 8.2 Asset manifest loader

Create:

```text
src/webview/webviewAssets.ts
```

Responsibilities:

- Locate Vite manifest under `media/webview`.
- Resolve JS and CSS assets for the React entrypoint.
- Convert paths to webview URIs using `webview.asWebviewUri(...)`.
- Throw an explicit error if the bundle is missing.
- Support packaged extension paths, not only dev repo paths.

Missing bundle behavior:

- Show a visible error page in the dashboard.
- The error must say the webview bundle is missing and `npm run compile:webview` or `npm run compile` must be run.
- Do not show mock dashboard content as a fallback for missing assets.

### 8.3 CSP

The real VS Code webview CSP should allow only:

- images from `webview.cspSource` and `data:` if needed;
- styles from `webview.cspSource` and nonce-based inline critical style only if necessary;
- scripts from nonce and `webview.cspSource`;
- no remote network connections.

### 8.4 Message handshake

Use a message handshake instead of injecting large state inline:

```text
React app mounts
  -> postMessage({ type: 'ready' })
Extension receives ready
  -> postMessage({ type: 'state', state })
Extension state changes
  -> postMessage({ type: 'state', state })
React app command
  -> postMessage({ type: 'refresh' | 'setMode' | 'selectFeature' | ... })
```

Preserve existing message types where practical.

---

## 9. React App Plan

### 9.1 Bootstrap

Create:

```text
src/webview-app/src/main.tsx
src/webview-app/src/App.tsx
src/webview-app/src/vscodeApi.ts
src/webview-app/src/styles.css
```

`vscodeApi.ts` must be the only place that directly touches `acquireVsCodeApi()`.

It must support:

1. Real VS Code webview mode.
2. Standalone visual test mode using a test-safe global state or message shim.

Components must not directly call `acquireVsCodeApi()`.

### 9.2 Dashboard frame

Implement React components preserving current dashboard structure:

- Top toolbar.
- Mode tabs.
- Action buttons.
- Mode content area.
- Diagnostics panel.
- Graph panels.
- Tables.
- Cards.
- Error and loading states.

Preserve dark VS Code-compatible appearance. Prefer CSS variables and VS Code theme variables where practical.

### 9.3 Dashboard modes

Implement all modes:

1. `LiveChangesView`
   - Current Change Area.
   - Risk cards.
   - Architecture Impact Graph.
   - Changed Files table.
   - Dependency Graph.
   - Validation Status.

2. `WholeArchitectureView`
   - Feature Blocks sidebar.
   - Entry Points.
   - Architecture Views.
   - Feature-Level Architecture Diagram.
   - Overview cards.
   - Health cards.

3. `FeatureFocusView`
   - Feature selector.
   - Feature summary.
   - Key runtime modules.
   - Internal dependency graph.
   - Feature dependencies.
   - Related tests.

4. `DiffSinceBaselineView`
   - Baseline controls.
   - Summary cards.
   - Before/After graph.
   - Top structural changes.
   - Timeline.

Do not drop mode content because of migration complexity.

---

## 10. Graph Model and ELK Layout Plan

### 10.1 Graph view model builders

Create:

```text
src/graph/graphViews.ts
```

Move graph data selection logic out of `src/webview/renderers.ts`:

- whole architecture graph;
- impact graph;
- dependency graph;
- internal dependency graph;
- before/after diff graph;
- inter-feature edge aggregation;
- graph summaries and detail rows.

The output must be serializable graph view models, not SVG markup.

### 10.2 React Flow rendering

Use `@xyflow/react` for graph UI.

Minimum capabilities:

- Pan.
- Zoom.
- Fit view.
- Node selection.
- Custom feature nodes.
- Custom module nodes.
- Custom summary/unclassified nodes.
- Edge labels and counts where needed.
- Stable test IDs/data attributes.

### 10.3 Pure ELK layout adapter

Mandatory v2 rule:

**Do not implement ELK layout directly inside React components.**

Create a pure/testable adapter:

```text
src/webview-app/src/layout/elkLayoutAdapter.ts
```

The adapter should expose functions similar to:

```ts
export async function layoutArchitectureGraph(
  graph: ArchitectureGraphViewModel,
  options?: LayoutOptions
): Promise<ReactFlowLayoutResult>;
```

Responsibilities:

- Convert `ArchitectureGraphViewModel` to ELK graph input.
- Run ELK layered layout.
- Use orthogonal edge routing.
- Convert ELK output to React Flow nodes and edges.
- Keep all ELK options centralized.
- Return explicit layout errors rather than throwing unhandled exceptions into components.
- Be callable from tests without starting VS Code.

Recommended ELK options:

```ts
{
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.layered.spacing.nodeNodeBetweenLayers': '80',
  'elk.spacing.nodeNode': '40',
  'elk.edgeRouting': 'ORTHOGONAL'
}
```

Codex may tune exact options, but options must remain centralized.

### 10.4 Geometry helpers

Create:

```text
src/graph/graphGeometry.ts
```

Use this for pure tests:

- rectangle geometry;
- point and segment helpers;
- edge segment vs node rectangle intersection;
- ignore endpoint source/target nodes when checking edge crossing;
- validate that representative layout output does not pass through unrelated feature nodes.

### 10.5 Layout cache

Add lightweight webview-side layout cache:

- Key by graph id + node ids + edge ids + dimensions + layout direction.
- Avoid recomputing ELK on every React render.
- Recompute only when graph data changes.
- Do not persist layout cache to the inspected workspace.

---

## 11. Legacy Renderer Removal Rules

Final implementation must satisfy all of these:

1. `src/webview/html.ts` must load the React bundle, not server-render dashboard HTML.
2. Live dashboard must not call `renderDashboardShell(state)`.
3. Live dashboard must not use old `svg.graph-svg` graph stages for graph rendering.
4. `src/webview/renderers.ts` must either be removed or reduced to non-production/deprecated code.
5. Old custom routing helpers must not be reachable from the live dashboard:
   - `routeFeatureEdge`
   - `routeOrthogonalPoints`
   - `routeAroundGraph`
   - `directFallbackRoute`
   - direct center-to-center module graph path rendering
6. Tests must catch accidental use of the old graph renderer.

Suggested test assertion:

- In Playwright snapshots for normal graph modes, assert that React Flow graph elements exist.
- Assert that old `.graph-svg` stages do not appear as the main graph implementation.

If temporary compatibility code remains, final report must list it and prove it is unreachable from the live dashboard.

---

## 12. VSIX Packaging Requirements

This section is mandatory in v2.

### 12.1 Build output inclusion

The packaged VSIX must include:

```text
out/extension.js
package.json
media/webview/...built assets...
media/webview/...manifest...
media/codicon-map.svg
```

It must not require `src/webview-app` or Vite dev server at runtime.

### 12.2 `.vscodeignore` review

Review `.vscodeignore` and update it if needed.

Rules:

- Do not exclude `media/webview/**`.
- Do not exclude required Activity Bar icon assets.
- It is okay to exclude `src/**`, `scripts/**`, `test/**`, `visual/**`, and generated test artifacts.
- If source maps are intentionally excluded or included, document the decision.

### 12.3 Package content verification

Add either a script or documented manual command to verify VSIX contents.

Preferred script:

```text
scripts/verify-vsix-contents.ts
```

Recommended npm script:

```json
"verify:vsix": "tsc -p ./tsconfig.scripts.json && node ./out-scripts/scripts/verify-vsix-contents.js"
```

The script should verify the generated VSIX contains at least:

- `extension/package.json`
- `extension/out/extension.js`
- `extension/media/webview/` bundle files
- at least one webview JavaScript asset
- at least one webview CSS asset if Vite emits CSS
- Vite manifest file
- `extension/media/codicon-map.svg`

If implementing a script is too much for this pass, document the exact PowerShell command used to inspect the VSIX zip and the verified entries.

### 12.4 Installed extension smoke test

After packaging, install into an isolated extensions directory and launch against the real target workspace using Windows Native VS Code.

Required confirmation:

- Extension activates from installed VSIX.
- Activity Bar icon is visible.
- Dashboard opens.
- React app loads from packaged files.
- React Flow canvas is visible.
- ELK layout is applied.
- No missing bundle error appears.
- No inspected target workspace files are written.

---

## 13. Implementation Checkpoints

Codex must implement in these checkpoints. Do not skip directly to the final migration.

### Checkpoint A — Baseline and build pipeline

Tasks:

- Read current README, package, webview, renderer, visual test, and integration test files.
- Install dependencies.
- Add Vite config.
- Add minimal React app.
- Add compile scripts.
- Confirm webview bundle builds into `media/webview`.

Validation:

```powershell
npm install
npm run compile
```

Checkpoint A success criteria:

- Extension TypeScript compiles.
- Webview bundle builds.
- `media/webview` contains built assets and manifest.

### Checkpoint B — React webview shell and messaging

Tasks:

- Update `html.ts` to load React assets.
- Add webview asset resolver.
- Add missing-bundle error page.
- Implement ready/state message handshake.
- Keep command messages working.

Validation:

```powershell
npm run compile
npm run test:unit
```

Checkpoint B success criteria:

- Opening dashboard loads React shell.
- React app receives state from extension.
- Refresh and mode message path still works.

### Checkpoint C — React dashboard frame

Tasks:

- Implement toolbar, mode tabs, diagnostics, loading/error states.
- Implement basic mode containers.
- Preserve existing command buttons.

Validation:

```powershell
npm run compile
npm run test:unit
npm run visual:render
npm run visual:test
```

Checkpoint C success criteria:

- Standalone snapshots render React dashboard frame for all four modes.
- No horizontal overflow at 1920x1080.

### Checkpoint D — Graph view models and ELK adapter

Tasks:

- Create `graphViewModel.ts`.
- Create `graphViews.ts`.
- Create `elkLayoutAdapter.ts`.
- Create `graphGeometry.ts`.
- Add graph model and layout tests.

Validation:

```powershell
npm run compile
npm run test:unit
```

Checkpoint D success criteria:

- Graph view models produce valid nodes and edges.
- ELK adapter returns finite positions.
- Geometry tests catch edge-through-node defects on representative graphs.

### Checkpoint E — React Flow graph migration

Tasks:

- Implement `GraphCanvas`.
- Implement custom feature/module/summary nodes.
- Render all dashboard graphs with React Flow + ELK.
- Remove live use of old custom SVG graph renderer.
- Add tests that fail if old `.graph-svg` graph stage remains the main graph implementation.

Validation:

```powershell
npm run compile
npm run test:unit
npm run visual:render
npm run visual:test
```

Checkpoint E success criteria:

- Feature-level graphs use React Flow + ELK.
- Module/dependency graphs no longer use direct center-to-center SVG paths.
- Old graph renderer is unreachable from the live dashboard.

### Checkpoint F — Full dashboard mode migration

Tasks:

- Finish all four mode views.
- Port changed files table.
- Port validation cards.
- Port summary/health/metric cards.
- Port feature focus panels.
- Port diff/baseline panels.
- Port structural timeline.

Validation:

```powershell
npm run compile
npm run test:unit
npm run visual:render
npm run visual:test
npm run test:vscode
```

Checkpoint F success criteria:

- All modes render their expected panels.
- Dashboard commands work.
- VS Code integration test passes or any desktop UI limitation is explicitly documented.

### Checkpoint G — Packaging and installed extension

Tasks:

- Review `.vscodeignore`.
- Package VSIX.
- Verify VSIX contains React webview bundle.
- Install VSIX into isolated extension dir.
- Smoke test against target workspace.

Validation:

```powershell
npm run package
```

If implemented:

```powershell
npm run verify:vsix
```

Checkpoint G success criteria:

- VSIX includes required webview assets.
- Installed extension loads React dashboard.
- No inspected target workspace files are written.

---

## 14. Testing Plan

### 14.1 Unit tests

Add or update:

```text
test/suite/graphViews.test.ts
test/suite/graphGeometry.test.ts
test/suite/messageProtocol.test.ts
```

Required assertions:

- Graph view model builders produce stable IDs.
- Every graph node has finite width and height.
- Every graph edge references existing source and target node IDs.
- Empty graph states are explicit and serializable.
- Feature graph builders preserve summary/detail rows.
- Changed file graphs include changed features first.
- Diff graph handles no-baseline and empty-diff states.

### 14.2 ELK layout tests

Required assertions:

- Layout adapter is callable from tests without VS Code.
- ELK returns finite node positions.
- ELK returns usable edge/source/target information.
- Layout output is deterministic enough for stable tests.
- Representative feature graph edges do not pass through non-endpoint feature rectangles.

### 14.3 React component tests

If Vitest/jsdom is added, test only stable behavior:

- App renders loading state before receiving state.
- App renders toolbar and mode tabs after receiving state.
- Mode switch sends `setMode` message.
- Refresh button sends `refresh` message.
- Graph panel renders React Flow container when graph data exists.

Do not over-test exact pixel layout in jsdom.

### 14.4 Playwright visual tests

Update `visual/dashboard.spec.ts`.

Required checks:

- Standalone HTML loads the built React bundle.
- Each mode renders expected panels.
- React Flow viewport is visible.
- Expected custom nodes are visible.
- Expected edges are visible.
- Fit/zoom controls work.
- No horizontal page overflow at 1920x1080.
- Screenshots are generated for all four modes.
- Normal mock snapshots do not show graph layout failure states.
- Old `.graph-svg` graph stage does not remain as the main graph implementation.

### 14.5 VS Code integration tests

Update `test/vscode/extension.integration.test.ts` if needed.

Required checks:

- Extension activates.
- Activity Bar launcher provider is registered.
- `Live Architecture Map: Open Dashboard` opens a webview panel.
- Dashboard command result reports opened/visible state.
- Refresh command works.
- Missing webview bundle produces an explicit error message, not mock fallback.
- No inspected workspace files are written.

---

## 15. Visual Render Script Plan

Update `scripts/render-ui-snapshots.ts`.

New behavior:

1. Ensure webview bundle exists by requiring `npm run compile` before render.
2. Generate standalone HTML files that load the built React bundle.
3. Inject or provide mock dashboard state for each mode in a test-safe way.
4. Continue writing:
   - `artifacts/ui/live-changes.html`
   - `artifacts/ui/whole-architecture.html`
   - `artifacts/ui/feature-focus.html`
   - `artifacts/ui/diff-since-baseline.html`
   - screenshots generated by Playwright
   - `artifacts/validation-report.md`

Standalone mode may use a global variable such as:

```ts
window.__LAM_STANDALONE_STATE__ = { ... };
```

This is allowed only for standalone local visual tests. The real VS Code webview must use the message handshake and CSP-safe assets.

---

## 16. Acceptance Criteria

The migration is complete only when all of these are true:

- `package.json` contains React, React DOM, React Flow, ELKJS, Vite, and React plugin dependencies in the correct dependency groups.
- Vite builds the webview app into extension-owned static assets.
- `media/webview` contains manifest and JS/CSS assets after compile.
- Real VS Code dashboard loads the Vite-built React app.
- React app receives live dashboard state from the extension host.
- All four modes render in React.
- Feature-level architecture graphs use React Flow + ELK layout.
- Module/dependency graphs do not use old direct center-to-center line rendering.
- Edges do not visibly pass through unrelated feature blocks in normal views.
- Missing webview bundle produces an explicit error, not mock fallback.
- Existing commands still work.
- Baseline capture and diff still work.
- Export snapshot still works.
- Diagnostics still show real workspace/scanner/git information.
- No files are written into the inspected target workspace.
- Visual snapshots are generated for all four modes.
- Unit tests pass.
- Playwright visual tests pass.
- VS Code integration tests pass or any limitation is explicitly documented.
- `npm run package` succeeds.
- VSIX contents are verified to include `media/webview` built assets.
- Installed VSIX smoke test confirms the React dashboard loads from packaged assets.
- Old renderer is not reachable from the live dashboard.

---

## 17. Required Validation Commands

Run from Windows Native PowerShell in the extension repository.

Use the real local path for the repository. Example:

```powershell
cd C:/Users/Junekim/Work/99.vs_workspace/vs_extension_work
npm install
npm run compile
npm run test:unit
npm run visual:render
npm run visual:test
npm run test:vscode
npm run validate
npm run package
```

If implemented:

```powershell
npm run verify:vsix
npm run validate:full
```

If Playwright browsers are missing:

```powershell
npx playwright install chromium
```

Do not run implementation or validation from WSL.

---

## 18. Final Report Format

Codex final response must include:

```text
Summary
- What changed architecturally
- Which dependencies were added
- Which files were added/modified/removed
- Which dashboard modes were migrated
- Which graph types use React Flow + ELK
- Whether any old graph renderer remains reachable

Checkpoints
- Checkpoint A: pass/fail and notes
- Checkpoint B: pass/fail and notes
- Checkpoint C: pass/fail and notes
- Checkpoint D: pass/fail and notes
- Checkpoint E: pass/fail and notes
- Checkpoint F: pass/fail and notes
- Checkpoint G: pass/fail and notes

Validation
- npm install: pass/fail
- npm run compile: pass/fail
- npm run test:unit: pass/fail
- npm run visual:render: pass/fail
- npm run visual:test: pass/fail
- npm run test:vscode: pass/fail
- npm run validate: pass/fail
- npm run package: pass/fail
- npm run verify:vsix: pass/fail/not implemented

Artifacts
- List generated HTML files
- List generated screenshots
- List validation report path
- List packaged VSIX path
- State whether VSIX webview assets were verified

Safety
- Confirm no inspected target workspace files were written

Known limitations
- Anything still requiring manual VS Code UI inspection
- Any graph layout limitations that remain
```

---

## 19. Important Implementation Notes

- Keep changes focused on the webview migration and graph rendering architecture.
- Do not redesign unrelated scanner/risk/git logic unless required by the migration.
- Prefer pure functions for graph view model generation.
- Do not put VS Code API calls inside React components.
- Do not use webview global state directly except through `vscodeApi.ts`.
- Use stable node and edge IDs for tests and layout caching.
- Preserve text selection behavior for text panels; React Flow canvas may remain interactive/drag-based.
- Keep rendering performant for realistic ABB_ROS2-size projects.
- If graph size is too large, summarize before layout rather than rendering hundreds of nodes by default.
- For large graphs, show top connected/changed/impacted nodes first and expose details in diagnostics or inspector.
- Use explicit errors. Avoid silent fallbacks.
- Do not leave direct center-to-center module edges in production graph rendering.
- Do not declare success until VSIX packaging assets are verified.
