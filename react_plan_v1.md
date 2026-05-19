# react_plan_v1.md

## 0. Purpose

This file is the single source of truth for migrating **Live Architecture Map** from the current hand-built HTML/SVG dashboard to a long-term React-based VS Code webview architecture.

The goal is not just to fix one bad edge route. The goal is to establish the correct long-term structure for an interactive architecture visualization extension:

```text
VS Code extension host
  -> workspace scanner / git status / dependency graph / feature classifier
  -> normalized dashboard + graph view model
  -> VS Code webview shell
  -> Vite-built React app
  -> React Flow canvas + ELK automatic layout
  -> Playwright + VS Code integration validation
```

The finished extension must still be safe for inspected workspaces: it must read source files and git status, but must not write generated files into the inspected target workspace.

---

## 1. Current State Summary

Current implementation characteristics:

- Extension project repository: `June-Jevons/vs_extension_work`.
- Main package: VS Code extension named `live-architecture-map`.
- Runtime entry: `src/extension.ts`.
- Dashboard panel lifecycle: `src/webview/dashboardPanel.ts`.
- Current dashboard HTML shell: `src/webview/html.ts`.
- Current static standalone renderer: `src/webview/standaloneHtml.ts`.
- Current dashboard renderer: `src/webview/renderers.ts`.
- Current dashboard styling: `src/webview/styles.ts`.
- Current validation scripts:
  - `npm run compile`
  - `npm run test:unit`
  - `npm run visual:render`
  - `npm run visual:test`
  - `npm run test:vscode`
  - `npm run validate`
  - `npm run package`

Current graph problem:

- Feature-level graphs are rendered with custom SVG `<rect>`, `<text>`, and `<path>` strings.
- Feature graph node placement is manually computed.
- Feature graph edge routing is custom and heuristic-based.
- Module graphs currently use straight center-to-center SVG paths.
- Visual tests check presence, dimensions, overflow, and zoom controls, but do not reliably catch edge-through-node geometry problems.

This plan replaces that approach with a React webview app and a real layout engine.

---

## 2. Target Stack

Use this stack unless a hard compatibility issue is found and documented:

### Runtime dependencies

Install as normal production dependencies:

```powershell
npm install react react-dom @xyflow/react elkjs
```

Reason:

- `react` / `react-dom`: UI framework for the webview dashboard.
- `@xyflow/react`: React Flow package for interactive node/edge canvas, pan/zoom, selection, minimap, controls, and custom nodes.
- `elkjs`: automatic graph layout engine for layered architecture diagrams and orthogonal edge routing.

### Development dependencies

Install as dev dependencies:

```powershell
npm install -D vite @vitejs/plugin-react @types/react @types/react-dom
```

Optional but recommended if Codex determines the extra tests are useful and stable:

```powershell
npm install -D vitest jsdom
```

Do not add a large state management library in v1 unless it is clearly needed. Prefer React state/hooks first. If state becomes messy, use a tiny local reducer or a minimal store.

Do not add D3, Cytoscape, Mermaid, Graphviz, or canvas rendering in this pass.

---

## 3. Non-Negotiable Constraints

1. **Windows Native workflow only**
   - Do not implement or validate from WSL.
   - Use Windows Native VS Code and PowerShell.
   - The inspected target workspace may be a WSL UNC path, but the extension process must be Windows Native.

2. **No inspected-workspace writes**
   - Do not write generated files, caches, snapshots, settings, or metadata into the inspected workspace.
   - Generated extension validation artifacts may stay under the extension repository's ignored `artifacts/` folder.

3. **No CDN / no remote scripts**
   - The webview must load only local bundled assets from the extension installation.
   - Do not use external URLs for scripts, styles, fonts, images, or runtime data.

4. **Strict CSP**
   - Keep a strict Content Security Policy in the VS Code webview.
   - Use nonces and `webview.asWebviewUri(...)` for local bundled JS/CSS.
   - Do not use unsafe inline scripts in the real VS Code webview.
   - Standalone Playwright HTML may use a relaxed CSP only if needed for test harnessing.

5. **No silent legacy fallback**
   - Do not silently fall back to the old string/SVG graph renderer if React/ELK fails.
   - If layout fails, show an explicit graph error state and log the reason.
   - Before final validation, the old graph renderer path must not be used by the dashboard.

6. **Preserve existing extension behavior**
   - Keep Activity Bar launcher.
   - Keep commands.
   - Keep dashboard modes:
     - Live Changes
     - Whole Architecture
     - Feature Focus
     - Diff Since Baseline
   - Keep Refresh, Configure, Timeline, Capture Baseline, Diff Since Baseline, Export Snapshot.
   - Keep diagnostics panel information.
   - Keep baseline and snapshot storage behavior.

7. **Type safety**
   - Keep `strict: true` TypeScript behavior.
   - No `any` for core graph/state models unless unavoidable and documented.

8. **Validation-first implementation**
   - Every phase must compile before moving to the next phase.
   - Do not ignore failing tests.
   - If a test is obsolete after migration, update it to test the new behavior rather than deleting validation coverage.

---

## 4. Target Architecture

### 4.1 Extension Host Responsibilities

The extension host should own:

- VS Code activation and command registration.
- Workspace scanning.
- Git status reading.
- Python import/dependency graph building.
- Feature classification.
- Risk scoring.
- Baseline/snapshot storage.
- Dashboard state production.
- Message handling from the webview.
- Export snapshot command.

The extension host should **not** own:

- React component rendering.
- Node dragging/selection UI.
- React Flow canvas state.
- CSS layout of dashboard panels.
- SVG path routing implementation.

### 4.2 Webview React App Responsibilities

The React app should own:

- Dashboard layout.
- Mode tabs.
- Action buttons.
- Graph canvas rendering.
- React Flow nodes and edges.
- ELK layout execution.
- Graph controls: fit, zoom, reset, minimap if used.
- Inspector/selection UI.
- Standalone visual render mode.

### 4.3 Shared Model Boundary

Create a clean boundary between extension host and React app:

```text
src/webview/messageProtocol.ts
src/webview/dashboardState.ts
src/webview/graphViewModel.ts          # new recommended file
```

The React app should receive a serializable state object. It should not import `vscode` APIs directly except through a tiny `vscodeApi` adapter.

Recommended new shared graph view model:

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

The exact interface may evolve, but the final design must preserve this separation:

```text
analysis state -> graph view model -> React Flow model -> ELK layout result -> rendered canvas
```

---

## 5. Proposed File Layout

Add or modify files toward this layout:

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
    graphViews.ts                  # new: builds graph view models per dashboard mode
    graphGeometry.ts               # new: pure geometry helpers for tests

  webview/
    dashboardPanel.ts
    dashboardState.ts
    graphViewModel.ts              # new shared serializable graph model
    html.ts                        # new React asset shell, no old dashboard HTML rendering
    messageProtocol.ts
    standaloneHtml.ts              # new standalone React asset shell

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
        elkLayout.ts
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

Generated build output should go to a predictable folder, for example:

```text
media/webview/
  manifest.json
  assets/*.js
  assets/*.css
```

Do not put generated webview build output under `src/`.

---

## 6. Build System Plan

### 6.1 Add Vite config

Create a Vite config at the repository root, for example:

```text
webview.vite.config.ts
```

Required behavior:

- Input root: `src/webview-app`.
- Output directory: `media/webview` or equivalent extension-owned static asset directory.
- Generate manifest: `manifest.json`.
- Use React plugin.
- Use relative/empty base suitable for VS Code webview asset loading.
- Do not start a dev server as part of normal compile/test.

Recommended conceptual config:

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

Codex must adapt this to the actual project and TypeScript constraints.

### 6.2 Update package scripts

Update `package.json` scripts to clearly separate extension and webview compilation.

Recommended scripts:

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
    "validate": "npm run compile && npm run test:unit && npm run visual:render && npm run visual:test && npm run test:vscode",
    "package": "npm run compile && vsce package"
  }
}
```

If `test:vscode` is too slow for every `validate`, Codex may keep the existing validate script but must add a separate full validation command, for example:

```json
"validate:full": "npm run validate && npm run test:vscode && npm run package"
```

Final response must state which validation script includes VS Code integration.

### 6.3 VS Code launch/tasks

Review and update `.vscode/tasks.json` and `.vscode/launch.json` if present.

Important Windows PowerShell rule:

- Avoid nested PowerShell quote expressions that break under `pwsh.exe`.
- Prefer an npm task with `script: compile` instead of manually embedding `powershell -Command '...'`.
- F5 should run compile reliably on Windows Native VS Code.

---

## 7. Webview Shell Plan

### 7.1 Replace old HTML string rendering

`src/webview/html.ts` should stop calling `renderDashboardShell(state)`.

It should instead produce a small shell:

```html
<body>
  <div id="root"></div>
  <script nonce="..." src="...built webview JS..."></script>
</body>
```

Asset URIs must be resolved with `webview.asWebviewUri`.

### 7.2 Manifest loader

Create a helper to read Vite's manifest and resolve JS/CSS assets.

Recommended file:

```text
src/webview/webviewAssets.ts
```

Responsibilities:

- Locate `media/webview/.vite/manifest.json` or `media/webview/manifest.json`, depending on actual Vite output.
- Resolve entrypoint script and CSS files.
- Convert file URIs to VS Code webview URIs with `webview.asWebviewUri(...)`.
- Throw an explicit error if assets are missing.

Do not hide missing webview assets with demo fallback HTML. Show a clear error page saying the webview bundle is missing and `npm run compile:webview` must be run.

### 7.3 CSP

The real VS Code webview CSP should allow only:

- images from `webview.cspSource` and `data:` if needed;
- styles from `webview.cspSource` and nonce-based inline critical style if absolutely required;
- scripts from nonce and `webview.cspSource`;
- no remote network connections unless explicitly required later.

No CDN.

### 7.4 Initial state handshake

Use a message handshake instead of injecting a giant JS object inline.

Recommended flow:

```text
React app mounts
  -> postMessage({ type: 'ready' })
Extension receives ready
  -> postMessage({ type: 'state', state })
State changes in extension
  -> postMessage({ type: 'state', state })
React app commands
  -> postMessage({ type: 'refresh' | 'setMode' | ... })
```

Preserve existing message types where possible.

---

## 8. React App Plan

### 8.1 App bootstrap

Create:

```text
src/webview-app/src/main.tsx
src/webview-app/src/App.tsx
src/webview-app/src/vscodeApi.ts
src/webview-app/src/styles.css
```

`vscodeApi.ts` should hide the VS Code global:

```ts
declare const acquireVsCodeApi: undefined | (() => VsCodeApi);
```

It must support two modes:

1. Real VS Code webview mode using `acquireVsCodeApi()`.
2. Standalone visual test mode using `window.__LAM_STANDALONE_STATE__` or a test message shim.

Do not let components directly call `acquireVsCodeApi()`.

### 8.2 Dashboard shell components

Implement React components that preserve current dashboard structure:

- Top toolbar with title, mode tabs, and actions.
- Mode-specific content area.
- Diagnostics panel.
- Graph panels.
- Tables and cards.

The visual style may move from `src/webview/styles.ts` into `src/webview-app/src/styles.css`.

Preserve dark VS Code-compatible appearance. Prefer CSS variables and VS Code theme variables where practical.

### 8.3 Dashboard modes

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

Do not drop mode content just because the renderer is being migrated.

---

## 9. Graph Model and ELK Layout Plan

### 9.1 Build graph view models outside React components

Create graph view model builders outside the React components.

Recommended file:

```text
src/graph/graphViews.ts
```

It should replace the graph-data-building logic currently embedded in `renderers.ts`:

- `getWholeArchitectureGraphData`
- `getImpactGraphData`
- `getDependencyGraphData`
- `getInternalDependencyGraphData`
- `getBeforeAfterGraphData`
- `getInterFeatureEdges`
- related helpers

The output should be serializable graph view models, not SVG markup.

### 9.2 Use React Flow for rendering

Use `@xyflow/react` for graph UI.

Minimum graph canvas features:

- Pan.
- Zoom.
- Fit view.
- Node selection.
- Edge labels where needed.
- Custom feature node rendering.
- Custom module node rendering.
- Data attributes for tests.

Recommended components:

```text
GraphCanvas.tsx
FeatureNode.tsx
ModuleNode.tsx
SummaryNode.tsx
```

### 9.3 Use ELK for layout

Create:

```text
src/webview-app/src/layout/elkLayout.ts
```

Responsibilities:

- Convert `ArchitectureGraphViewModel` to ELK input.
- Run ELK layered layout.
- Use orthogonal edge routing.
- Return React Flow nodes and edges with positions.
- Keep all ELK options in one file.
- Expose deterministic layout behavior for tests.

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

Codex may tune exact options for visual quality.

### 9.4 Edge routing requirements

The final rendered graph must avoid obvious edge-through-node defects.

For feature block diagrams:

- Edges should not pass through non-endpoint feature rectangles.
- Edges should connect from visible sides, not from node centers.
- Edge labels should not sit on top of node labels if avoidable.
- Changed/impacted direction should be readable left-to-right when possible.

For module dependency graphs:

- Do not leave center-to-center straight lines if they cross labels/nodes badly.
- Prefer rectangular module nodes with ELK layout for consistency.
- If circle module nodes are retained, edges must connect to the boundary rather than the center.

### 9.5 Layout cache

Add a lightweight layout cache inside the webview app:

- Key by graph id + node ids + edge ids + relevant dimensions.
- Avoid recomputing ELK on every React render.
- Recompute only when graph data changes or mode changes.

Do not persist layout cache into the inspected workspace.

---

## 10. Remove or Retire Legacy Renderer

After the React app is working:

- `src/webview/renderers.ts` should no longer be the dashboard renderer.
- Move reusable pure functions into `src/graph/graphViews.ts` or other pure modules.
- Remove custom SVG path routing helpers from production code:
  - `routeFeatureEdge`
  - `routeOrthogonalPoints`
  - `routeAroundGraph`
  - `directFallbackRoute`
  - manual feature node SVG rendering
  - direct module center-to-center graph path rendering
- If any old renderer code remains temporarily, it must not be reachable by the live dashboard.
- Tests should fail if the live dashboard renders old `svg.graph-svg` graph stages instead of React Flow graph canvases.

---

## 11. Testing Plan

### 11.1 Unit tests

Update or add tests under `test/suite/`.

Recommended new tests:

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

### 11.2 ELK layout tests

If ELK layout runs in the React app and is hard to call from Node tests, expose a pure layout adapter that can be tested with Node or Vitest.

Required layout assertions:

- ELK returns finite node positions.
- ELK returns edges with source/target and usable path information.
- Layout output is deterministic enough for tests.
- Edge segments do not pass through interiors of non-endpoint feature rectangles for a representative 4-6 node graph.

### 11.3 React component tests

If Vitest/jsdom is added, test only stable behavior:

- App renders loading state before receiving state.
- App renders toolbar and mode tabs after receiving state.
- Mode switch sends `setMode` message.
- Refresh button sends `refresh` message.
- Graph panel renders a React Flow container when graph data exists.

Do not over-test exact pixel layout in jsdom.

### 11.4 Playwright visual tests

Update `visual/dashboard.spec.ts` for the React app.

Required checks:

- Standalone HTML loads built webview bundle.
- Each dashboard mode renders expected panels.
- React Flow viewport is visible.
- Expected custom nodes are visible.
- Expected edges are visible.
- Fit/zoom controls work.
- No horizontal page overflow at 1920x1080.
- Screenshots are generated for all four modes.
- Obvious graph failure states are not shown in normal mock snapshots.

Recommended geometry check:

- Collect feature node bounding boxes from DOM.
- Collect visible SVG edge paths or React Flow edge wrappers.
- At minimum, assert that edge bounding boxes do not obviously cover the center area of unrelated feature nodes.
- Keep robust geometry checks in pure unit tests; Playwright should catch visual regressions, not replace geometry unit tests.

### 11.5 VS Code integration tests

Update `test/vscode/extension.integration.test.ts` if needed.

Required checks:

- Extension activates.
- Activity Bar launcher provider is registered.
- `Live Architecture Map: Open Dashboard` opens a webview panel.
- Dashboard command result reports opened/visible state.
- Refresh command works.
- No inspected workspace files are written.
- Missing webview bundle produces an explicit error message, not mock fallback.

### 11.6 Installed VSIX smoke test

Document and, if practical, automate the installed VSIX smoke test:

```powershell
npm run package
& "$env:LOCALAPPDATA\Programs\Microsoft VS Code\bin\code.cmd" --install-extension .\live-architecture-map-0.0.1.vsix --force --extensions-dir C:\tmp\vscode-lam-installed-extensions
& "$env:LOCALAPPDATA\Programs\Microsoft VS Code\bin\code.cmd" "\\wsl.localhost\Ubuntu-22.04\home\jevons\ABB_ROS2" `
  --new-window `
  --user-data-dir=C:\tmp\vscode-lam-installed-user-data `
  --extensions-dir=C:\tmp\vscode-lam-installed-extensions `
  --disable-gpu
```

Manual confirmation required if desktop UI is not fully observable by automation:

- Activity Bar icon visible.
- Dashboard opens.
- React graph canvas visible.
- Feature blocks are aligned.
- Edges do not cross through feature blocks.
- Modes switch correctly.
- Refresh updates state.
- No target workspace files created.

---

## 12. Visual Render Script Plan

Update `scripts/render-ui-snapshots.ts`.

Current behavior writes full standalone HTML using server-side string rendering. New behavior should:

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

This is acceptable only for standalone local visual tests. The real VS Code webview must use the message handshake and CSP-safe assets.

---

## 13. Implementation Phases

### Phase 0 — Baseline audit

Tasks:

- Read `README.md`.
- Read `package.json`.
- Read `src/extension.ts`.
- Read `src/webview/dashboardPanel.ts`.
- Read `src/webview/html.ts`.
- Read `src/webview/renderers.ts`.
- Read `src/webview/standaloneHtml.ts`.
- Read `visual/dashboard.spec.ts`.
- Run current tests if environment is ready:

```powershell
npm install
npm run compile
npm run test:unit
npm run visual:render
npm run visual:test
```

Report current failures before modifying code.

### Phase 1 — Add dependencies and build pipeline

Tasks:

- Install runtime dependencies:

```powershell
npm install react react-dom @xyflow/react elkjs
```

- Install dev dependencies:

```powershell
npm install -D vite @vitejs/plugin-react @types/react @types/react-dom
```

- Add `webview.vite.config.ts`.
- Add `src/webview-app/index.html`.
- Add minimal `src/webview-app/src/main.tsx`.
- Add minimal `src/webview-app/src/App.tsx`.
- Update `package.json` scripts.
- Ensure `npm run compile:webview` builds into `media/webview`.
- Ensure `npm run compile:extension` still works.
- Ensure `npm run compile` runs both.

Validation:

```powershell
npm run compile
```

### Phase 2 — Create React webview shell

Tasks:

- Update `src/webview/html.ts` to load built React assets.
- Add Vite manifest asset resolver.
- Keep strict CSP.
- Update `DashboardPanel` so it posts state to the React app after `ready`.
- Preserve existing command message handling.
- Add explicit missing-bundle error page.

Validation:

```powershell
npm run compile
npm run test:unit
```

### Phase 3 — Implement React dashboard frame

Tasks:

- Implement `DashboardShell`.
- Implement top toolbar.
- Implement mode tabs.
- Implement action buttons.
- Implement diagnostics panel.
- Implement loading/error/empty states.
- Implement message adapter.
- Confirm state updates re-render without replacing selected text unnecessarily.

Validation:

```powershell
npm run compile
npm run test:unit
```

### Phase 4 — Build graph view models

Tasks:

- Create `src/webview/graphViewModel.ts`.
- Create `src/graph/graphViews.ts`.
- Move graph data selection logic out of `renderers.ts`.
- Produce serializable graph models for all four modes.
- Add unit tests for graph model integrity.

Validation:

```powershell
npm run compile
npm run test:unit
```

### Phase 5 — Implement React Flow graph canvas

Tasks:

- Implement `GraphCanvas.tsx`.
- Register custom node components.
- Render feature nodes.
- Render module nodes.
- Render summary/unclassified nodes.
- Render edge labels/counts.
- Add fit/zoom controls.
- Add test IDs/data attributes.
- Preserve current visual hierarchy as much as practical.

Validation:

```powershell
npm run compile
npm run visual:render
npm run visual:test
```

### Phase 6 — Add ELK layout

Tasks:

- Implement `elkLayout.ts`.
- Convert graph view model to ELK input.
- Run layered layout.
- Convert ELK result to React Flow nodes/edges.
- Add layout cache.
- Add visible graph error state if layout fails.
- Add geometry/unit tests where possible.

Validation:

```powershell
npm run compile
npm run test:unit
npm run visual:render
npm run visual:test
```

### Phase 7 — Migrate all dashboard modes

Tasks:

- Implement `LiveChangesView`.
- Implement `WholeArchitectureView`.
- Implement `FeatureFocusView`.
- Implement `DiffSinceBaselineView`.
- Port changed files table.
- Port validation cards.
- Port summary cards.
- Port health/metric cards.
- Port related tests and dependency detail panels.
- Port structural timeline, either as React SVG component or simple HTML visualization.

Validation:

```powershell
npm run compile
npm run test:unit
npm run visual:render
npm run visual:test
```

### Phase 8 — Retire old renderer

Tasks:

- Stop using `renderDashboardShell` in production.
- Remove or shrink `src/webview/renderers.ts`.
- Delete obsolete custom graph routing helpers if no longer used.
- Update imports and tests.
- Ensure no live dashboard path uses old custom SVG graph rendering.

Validation:

```powershell
npm run compile
npm run test:unit
npm run visual:render
npm run visual:test
```

### Phase 9 — VS Code integration validation

Tasks:

- Update VS Code integration tests.
- Verify dashboard command opens React webview.
- Verify state handshake works.
- Verify refresh/mode/selectFeature commands work.
- Verify no target workspace writes.

Validation:

```powershell
npm run test:vscode
```

### Phase 10 — Package and installed extension validation

Tasks:

- Build VSIX.
- Install in isolated extension dir.
- Launch against ABB_ROS2 UNC workspace from Windows Native VS Code.
- Validate dashboard manually if automation cannot observe all desktop UI surfaces.

Validation:

```powershell
npm run package
```

Then run the installed VSIX smoke commands from Section 11.6.

---

## 14. Acceptance Criteria

The migration is complete only when all of the following are true:

- `package.json` contains React, React DOM, React Flow, and ELKJS dependencies.
- Vite builds the webview app into extension-owned static assets.
- The real VS Code dashboard loads the Vite-built React app.
- The React app receives live dashboard state from the extension host.
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

---

## 15. Required Validation Commands

Run from Windows Native PowerShell in the extension repository:

```powershell
cd C:\Users\Junekim\Work\99.vs_workspace\vs_extension_work
npm install
npm run compile
npm run test:unit
npm run visual:render
npm run visual:test
npm run test:vscode
npm run validate
npm run package
```

If Playwright browsers are missing:

```powershell
npx playwright install chromium
```

Do not run these from WSL.

---

## 16. Final Report Format

Codex final response must include:

```text
Summary
- What changed architecturally
- Which dependencies were added
- Which files were added/modified/removed
- Which dashboard modes were migrated
- Which graph types use React Flow + ELK
- Whether any old graph renderer remains reachable

Validation
- npm install: pass/fail
- npm run compile: pass/fail
- npm run test:unit: pass/fail
- npm run visual:render: pass/fail
- npm run visual:test: pass/fail
- npm run test:vscode: pass/fail
- npm run validate: pass/fail
- npm run package: pass/fail

Artifacts
- List generated HTML files
- List generated screenshots
- List validation report path

Safety
- Confirm no inspected target workspace files were written

Known limitations
- Anything still requiring manual VS Code UI inspection
- Any graph layout limitations that remain
```

---

## 17. Important Implementation Notes

- Keep changes focused. Do not redesign unrelated scanner/risk/git logic unless required by the React migration.
- Prefer small pure functions for graph view model generation.
- Do not put VS Code API calls inside React components.
- Do not use webview global state directly except through `vscodeApi.ts`.
- Use stable node and edge IDs for tests and layout caching.
- Preserve user-select behavior for text panels; React Flow canvas itself can remain interactive/drag-based.
- Keep rendering performant for realistic ABB_ROS2-size projects.
- If graph size is too large, add summarization before layout rather than rendering hundreds of nodes by default.
- For large graphs, show top connected/changed/impacted nodes first and expose details in diagnostics/inspector.
- Use explicit errors. Avoid silent fallbacks that make bad layouts look acceptable.
