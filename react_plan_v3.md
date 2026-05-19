# react_plan_v3.md

## 0. Purpose

This file is the single source of truth for migrating **Live Architecture Map** to the long-term React webview architecture while also improving analysis performance and removing fallback-based behavior.

This v3 plan supersedes both `react_plan_v1.md` and `react_plan_v2.md` for implementation. Use this file only unless the user explicitly asks otherwise.

The goals are:

1. Replace the current hand-built HTML/SVG dashboard with a Vite-built React webview app.
2. Replace custom graph rendering/routing with React Flow + ELK.
3. Introduce a long-term analysis performance architecture using watcher events, file-level cache, graph model cache, layout cache, and Git status enrichment.
4. Remove fallback-style behavior that hides errors and makes debugging difficult.
5. Keep inspected workspaces read-only.

Target long-term flow:

```text
VS Code extension host
  -> deterministic scanner backend
  -> file-level analysis cache
  -> Python import/dependency index
  -> Git status enrichment through VS Code Git API
  -> normalized dashboard state + graph view models
  -> VS Code webview shell
  -> Vite-built React app
  -> React Flow canvas + ELK automatic layout
  -> Playwright + VS Code integration + VSIX packaging validation
```

---

## 1. v3 Critical Policy: No Fallback Features

From this plan onward, do not add fallback behavior for new features.

Fallback means an automatic alternate path that silently replaces the intended implementation when something fails or is unavailable.

Examples of behavior that must be removed or avoided:

- Do not silently show mock/sample dashboard data when live analysis fails.
- Do not silently fall back from React dashboard to old string/SVG renderer.
- Do not silently fall back from ELK layout to custom graph routing.
- Do not silently fall back from VS Code Git API to Git CLI.
- Do not silently fall back from one scanner backend to another.
- Do not silently treat missing webview bundle as a usable dashboard.
- Do not keep legacy compatibility branches that make failures appear successful.

Required replacement behavior:

```text
Failure or unavailable dependency
  -> explicit state
  -> explicit diagnostic message
  -> output-channel log
  -> test coverage if possible
  -> no hidden alternate implementation
```

Allowed exceptions:

- Standalone visual tests may use mock data intentionally.
- Unit tests may use fixtures/mock state intentionally.
- A user-facing explicit mode or setting may select a backend, but this must be deterministic selection, not automatic fallback.

Terminology rule:

- Avoid naming new code paths `fallback` unless the code is a temporary deletion target.
- Prefer names such as `explicitErrorState`, `selectedScannerBackend`, `unavailableGitState`, or `standaloneMockState`.

---

## 2. v3 Improvements Over v2

v2 added four key implementation safeguards. v3 keeps them and adds performance architecture plus stronger fallback removal.

Inherited from v2:

1. **VSIX asset packaging validation**
   - Final VSIX must include the Vite-built webview bundle.
   - Verify `media/webview` assets, manifest, JavaScript, and CSS are packaged.
   - Installed extension must load the React dashboard from packaged assets.

2. **Pure/testable ELK layout adapter**
   - ELK logic must not be hidden inside React components.
   - Layout adapter must be callable from tests without starting VS Code.

3. **Mandatory implementation checkpoints**
   - Implement checkpoint by checkpoint.
   - Compile/test before moving on.

4. **Strict legacy renderer removal**
   - Final live dashboard must not use `src/webview/renderers.ts` for graph rendering.
   - Old `svg.graph-svg` graph stages must not remain as the live graph implementation.

New in v3:

5. **Watcher/cache/Git hybrid performance architecture**
   - Watcher and file cache provide fast incremental analysis.
   - Git provides semantic changed-file status.
   - Full scan is reserved for explicit initial index, branch/config changes, or cache invalidation.

6. **No automatic fallback policy**
   - Existing fallback behavior must be removed or converted to explicit error/unavailable states.
   - New features must not include fallback branches.

7. **Performance diagnostics and budgets**
   - Analysis timing must be recorded per phase.
   - Dashboard diagnostics must include enough performance information to identify bottlenecks.

---

## 3. Current State Summary

Current implementation characteristics:

- Extension repository: `June-Jevons/vs_extension_work`.
- VS Code extension name: `live-architecture-map`.
- Runtime entry: `src/extension.ts`.
- Dashboard panel lifecycle: `src/webview/dashboardPanel.ts`.
- Current dashboard HTML shell: `src/webview/html.ts`.
- Current standalone renderer: `src/webview/standaloneHtml.ts`.
- Current dashboard string renderer: `src/webview/renderers.ts`.
- Current dashboard styles: `src/webview/styles.ts`.
- Current watcher: `src/watchers/workspaceWatcher.ts`.
- Current scanner: `src/core/workspaceScanner.ts`.
- Current read-directory alternate scanner: `src/core/readDirectoryFallbackScanner.ts`.
- Current Git provider: `src/git/gitProvider.ts`.
- Current visual render script: `scripts/render-ui-snapshots.ts`.
- Current Playwright test: `visual/dashboard.spec.ts`.

Current graph problems:

- Feature-level graphs are rendered by manually constructing SVG strings.
- Feature graph node placement is manually computed.
- Feature graph edge routing is custom and heuristic-based.
- Module graphs use direct center-to-center SVG paths.
- Visual tests check presence and dimensions but do not reliably catch edges crossing through nodes.

Current analysis performance problems:

- Watcher events call a general `stateManager.refresh()` after debounce.
- Refresh performs a broad analysis flow rather than changed-path incremental analysis.
- Scanner reads and parses Python files repeatedly.
- Import resolution can scan module ids repeatedly for suffix matches.
- Git status is used for semantic changed-file status but not as a fast incremental analysis cache.
- Snapshot/baseline storage stores coarse snapshots but not a file-level parse/index cache.

Current fallback problems to remove:

- Live analysis may show mock fallback state.
- Scanner may switch from one backend to another automatically.
- Git provider may switch from VS Code Git API to Git CLI automatically.
- Old dashboard renderer may remain available as a hidden fallback if not explicitly removed.

---

## 4. Target Stack

### 4.1 Runtime dependencies

Install as production dependencies:

```powershell
npm install react react-dom @xyflow/react elkjs
```

Reason:

- `react` and `react-dom`: webview UI framework.
- `@xyflow/react`: React Flow package for interactive node and edge canvas.
- `elkjs`: automatic layout engine for layered architecture diagrams and orthogonal edge routing.

### 4.2 Development dependencies

Install as dev dependencies:

```powershell
npm install -D vite @vitejs/plugin-react @types/react @types/react-dom
```

Optional only if tests remain stable:

```powershell
npm install -D vitest jsdom
```

Do not add D3, Cytoscape, Mermaid, Graphviz, canvas rendering, or a large state management library in this pass.

---

## 5. Non-Negotiable Constraints

1. **Windows Native workflow only**
   - Do not implement or validate from WSL.
   - Use Windows Native VS Code and PowerShell.
   - The inspected target workspace may be a WSL UNC path, but the extension process must be Windows Native.

2. **No inspected-workspace writes**
   - Do not write generated files, caches, snapshots, settings, or metadata into the inspected target workspace.
   - Generated extension validation artifacts may stay under the extension repository's ignored `artifacts/` folder.
   - Persistent extension cache may use VS Code extension-managed storage only.

3. **No CDN / no remote scripts**
   - The webview must load local bundled assets only.
   - Do not use remote scripts, remote styles, external fonts, or CDN packages.

4. **Strict CSP**
   - The real VS Code webview must keep a strict Content Security Policy.
   - Use nonces and `webview.asWebviewUri(...)` for local bundled JS/CSS.
   - Do not use unsafe inline scripts in the real VS Code webview.
   - Standalone Playwright HTML may use a relaxed CSP only for the test harness.

5. **No fallback features**
   - Do not add automatic fallback code.
   - Remove existing fallback branches from the migrated path.
   - Replace unavailable/failed dependencies with explicit error or unavailable states.

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
   - Keep baseline and snapshot behavior, but improve storage/indexing as needed using extension-managed storage only.

7. **Type safety**
   - Keep strict TypeScript behavior.
   - Avoid `any` in graph/state/cache models.
   - If `any` is unavoidable for third-party interop, isolate it in adapter modules and document why.

8. **Validation-first implementation**
   - Each checkpoint must compile before moving to the next checkpoint.
   - Do not ignore failing tests.
   - If a test becomes obsolete, update it to validate new behavior instead of removing coverage.

---

## 6. Target Architecture

### 6.1 Extension host responsibilities

The extension host owns:

- VS Code activation and command registration.
- Deterministic scanner backend selection.
- Workspace file indexing.
- File-level analysis cache.
- Git status enrichment through VS Code Git API.
- Python import/dependency graph building.
- Feature classification.
- Risk scoring.
- Baseline and snapshot storage.
- Dashboard state production.
- Message handling from the webview.
- Export snapshot command.
- Webview asset URI generation.
- Performance timing collection.

The extension host must not own:

- React component rendering.
- React Flow canvas state.
- Node dragging/selection UI.
- CSS dashboard layout.
- SVG path routing logic.

### 6.2 React webview responsibilities

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
- Webview-side layout cache.

### 6.3 Shared model boundary

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
src/core/analysisTiming.ts
src/core/fileAnalysisCache.ts
src/core/workspaceIndex.ts
src/git/gitProvider.ts
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

Recommended performance model additions:

```ts
export interface AnalysisTimingSummary {
  totalMs: number;
  scannerMs: number;
  fileReadMs: number;
  parseMs: number;
  dependencyResolveMs: number;
  featureMapMs: number;
  gitStatusMs: number;
  graphViewModelMs: number;
  cacheReadMs: number;
  cacheWriteMs: number;
}

export interface AnalysisRefreshContext {
  reason: 'initial' | 'manual' | 'watcher' | 'modeChange' | 'baseline' | 'branchChange' | 'configurationChange';
  changedPaths?: string[];
  forceFull?: boolean;
}
```

---

## 7. Performance Architecture

### 7.1 Correct split: watcher/cache vs Git

Use this split:

```text
Watcher + file cache
  -> fast path for real-time incremental analysis

Git provider
  -> semantic changed-file status and branch information
```

Do not use Git as the only real-time change detector.
Do not use watcher alone as the semantic source for modified/added/deleted/staged/untracked status.

Target behavior:

```text
File saved or created
  -> watcher batches changedPaths
  -> stateManager.refresh({ reason: 'watcher', changedPaths })
  -> changed paths invalidate file cache entries
  -> only affected files are read/parsed when possible
  -> Git API enriches changed file status
  -> affected graph views/layouts update
```

### 7.2 File-level analysis cache

Create a file-level cache in extension-managed storage or memory plus extension-managed persistence.

Recommended file:

```text
src/core/fileAnalysisCache.ts
```

Cache key:

```text
workspaceKey + relativePath + mtime + size + optional content hash
```

Cached value:

```ts
export interface CachedFileAnalysis {
  relativePath: string;
  moduleId?: string;
  language: 'python' | 'config' | 'markdown' | 'unknown';
  mtimeMs?: number;
  sizeBytes?: number;
  contentHash?: string;
  imports: ParsedImport[];
  classCount: number;
  functionCount: number;
  isEntryPoint: boolean;
  isTest: boolean;
  featureId: string;
  classificationReason?: ClassificationReason;
  riskLevel: RiskLevel;
  analyzedAtIso: string;
}
```

Rules:

- Read/parse a file only when its cache key changed.
- Deleted files must remove cache entries.
- Renamed files should be represented as delete + add unless Git rename information is available.
- Cache must not be written into inspected workspace.
- Cache corruption must become an explicit cache error or cache invalidation event, not a hidden fallback.

### 7.3 Workspace index

Create a workspace index abstraction:

```text
src/core/workspaceIndex.ts
```

Responsibilities:

- Track indexed files.
- Track Python modules.
- Track import records.
- Track module id maps.
- Track reverse dependencies.
- Track feature blocks.
- Expose full rebuild and incremental update APIs.

Recommended APIs:

```ts
buildWorkspaceIndex(context): Promise<WorkspaceIndexResult>
updateWorkspaceIndex(previousIndex, changedPaths, context): Promise<WorkspaceIndexResult>
```

Full rebuild should happen only for:

- first workspace open;
- manual full refresh;
- branch change;
- settings/exclude globs change;
- cache schema version change;
- too many changed paths in one batch;
- explicit cache invalidation command.

### 7.4 Import resolver index

Current suffix-matching import resolution can become expensive. Add an index:

```text
src/graph/importResolverIndex.ts
```

Recommended indexes:

- exact module id map;
- suffix-to-module ids map;
- parent package map;
- top-level package map;
- reverse dependency map.

Rules:

- Build resolver index once per full module set.
- Incrementally update resolver index when module ids change.
- Avoid scanning every module id for every import.

### 7.5 Git provider without fallback

Current provider may use VS Code Git API and then Git CLI. v3 policy requires no automatic fallback.

Target behavior:

- Use VS Code Git API as the selected Git provider.
- If VS Code Git extension/API/repository is unavailable, return explicit `gitStatusSource: 'unavailable'` and diagnostic reason.
- Do not automatically call Git CLI as fallback.
- A future explicit user setting may allow `gitProvider: 'vscodeGitApi' | 'disabled' | 'gitCli'`, but do not auto-switch providers.

Required diagnostic state:

```ts
export interface GitUnavailableReason {
  code: 'gitExtensionUnavailable' | 'gitRepositoryNotFound' | 'gitApiError' | 'disabled';
  detail: string;
}
```

### 7.6 Deterministic scanner backend, no fallback

Do not use automatic scanner fallback.

Replace fallback scanner behavior with deterministic scanner backend selection.

Recommended backend policy:

```text
local/native path
  -> selected scanner backend: vscodeFindFiles

UNC/WSL-like path if findFiles is known unreliable
  -> selected scanner backend: directWorkspaceFs

user setting in future
  -> selected scanner backend: configured scanner
```

Rules:

- Decide scanner backend before scanning.
- Log selected backend and reason.
- If selected backend fails, return explicit scanner error state.
- Do not automatically switch to another backend.
- Rename files/classes to remove `Fallback` terminology where practical.

Suggested rename:

```text
src/core/readDirectoryFallbackScanner.ts
  -> src/core/directWorkspaceFsScanner.ts
```

### 7.7 Refresh scheduler

Current watcher calls full refresh. Change it to batch changed paths.

Recommended file:

```text
src/watchers/workspaceWatcher.ts
```

Recommended behavior:

- Collect changed paths in a Set.
- Debounce events.
- Pass changed paths to state manager.
- Use thresholds:
  - small batch: incremental update;
  - large batch: explicit full refresh with reason `tooManyChangedPaths`.

No silent fallback:

- If incremental update cannot proceed, report explicit reason and request/manual full refresh state.
- Do not silently perform full scan as fallback unless the refresh context explicitly says `forceFull: true` or the scheduler explicitly classifies it as full refresh and logs why.

### 7.8 Performance diagnostics

Add timing diagnostics to output channel and dashboard diagnostics.

Required timing phases:

- scanner/index discovery;
- cache read;
- file stat/hash;
- file read;
- parse imports/metrics;
- dependency resolve;
- feature mapping;
- risk scoring;
- Git status;
- graph view model generation;
- cache write;
- total refresh.

Diagnostics should include:

- refresh reason;
- full vs incremental;
- changed path count;
- analyzed file count;
- cache hit count;
- cache miss count;
- dependency edge count;
- graph node/edge count;
- total duration.

---

## 8. Proposed File Layout

Move toward this layout:

```text
src/
  extension.ts

  core/
    analysisEngine.ts
    analysisTiming.ts
    fileAnalysisCache.ts
    workspaceIndex.ts
    workspaceScanner.ts
    directWorkspaceFsScanner.ts
    featureMapper.ts
    riskScorer.ts
    outputChannel.ts

  git/
    gitProvider.ts
    gitStatusParser.ts

  graph/
    dependencyGraph.ts
    graphDiff.ts
    graphViews.ts
    graphGeometry.ts
    importResolverIndex.ts

  storage/
    baselineStore.ts
    snapshotStore.ts
    analysisCacheStore.ts

  watchers/
    workspaceWatcher.ts

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
        PerformanceDiagnostics.tsx
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

Generated build output:

```text
media/webview/
  assets/*.js
  assets/*.css
  .vite/manifest.json
```

Do not put generated webview build output under `src/`.

---

## 9. Build System Plan

### 9.1 Vite config

Create:

```text
webview.vite.config.ts
```

Required behavior:

- Input root: `src/webview-app`.
- Output directory: `media/webview`.
- Generate manifest.
- Use React plugin.
- Use relative/empty base suitable for VS Code webview asset loading.
- Do not start a Vite dev server as part of normal compile/test.

### 9.2 Package scripts

Update `package.json` scripts:

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

If Codex includes `test:vscode` inside `validate`, final report must state that clearly.

### 9.3 VS Code launch/tasks

Review `.vscode/tasks.json` and `.vscode/launch.json` if present.

Rules:

- Prefer npm tasks over nested PowerShell command strings.
- Avoid nested quoting that breaks under `pwsh.exe`.
- F5 must run compile reliably on Windows Native VS Code.

---

## 10. Webview Shell Plan

### 10.1 Replace old HTML string rendering

`src/webview/html.ts` must stop calling `renderDashboardShell(state)`.

It should produce only a shell:

```html
<body>
  <div id="root"></div>
  <script nonce="..." src="...built webview JS..."></script>
</body>
```

CSS assets must also be loaded from the Vite manifest.

### 10.2 Asset manifest loader

Create:

```text
src/webview/webviewAssets.ts
```

Responsibilities:

- Locate Vite manifest under `media/webview`.
- Resolve JS and CSS assets for the React entrypoint.
- Convert paths to webview URIs using `webview.asWebviewUri(...)`.
- Throw an explicit error if bundle is missing.
- Support packaged extension paths, not only dev repo paths.

Missing bundle behavior:

- Show visible error page.
- Error must state that the webview bundle is missing and `npm run compile:webview` or `npm run compile` must be run.
- Do not show mock dashboard data.
- Do not use old renderer.

### 10.3 CSP

Real VS Code webview CSP should allow only:

- images from `webview.cspSource` and `data:` if needed;
- styles from `webview.cspSource` and nonce-based inline critical style only if necessary;
- scripts from nonce and `webview.cspSource`;
- no remote network connections.

### 10.4 Message handshake

Use message handshake:

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

## 11. React App Plan

### 11.1 Bootstrap

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
2. Standalone visual test mode using intentionally injected mock state or message shim.

Components must not directly call `acquireVsCodeApi()`.

### 11.2 Dashboard frame

Implement React components preserving current dashboard structure:

- Top toolbar.
- Mode tabs.
- Action buttons.
- Mode content area.
- Diagnostics panel.
- Performance diagnostics panel or diagnostic rows.
- Graph panels.
- Tables.
- Cards.
- Error and loading states.

### 11.3 Dashboard modes

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

## 12. Graph Model and ELK Layout Plan

### 12.1 Graph view model builders

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

### 12.2 React Flow rendering

Use `@xyflow/react`.

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

### 12.3 Pure ELK layout adapter

Do not implement ELK layout directly inside React components.

Create:

```text
src/webview-app/src/layout/elkLayoutAdapter.ts
```

Responsibilities:

- Convert `ArchitectureGraphViewModel` to ELK graph input.
- Run ELK layered layout.
- Use orthogonal edge routing.
- Convert ELK output to React Flow nodes and edges.
- Keep all ELK options centralized.
- Return explicit layout errors rather than throwing unhandled exceptions into components.
- Be callable from tests without starting VS Code.

### 12.4 Geometry helpers

Create:

```text
src/graph/graphGeometry.ts
```

Use this for pure tests:

- rectangle geometry;
- point and segment helpers;
- edge segment vs node rectangle intersection;
- ignore endpoint source/target nodes when checking edge crossing;
- validate representative layout output.

### 12.5 Layout cache

Add webview-side layout cache:

- Key by graph id + node ids + edge ids + dimensions + layout direction.
- Avoid recomputing ELK on every React render.
- Recompute only when graph data changes.
- Do not persist layout cache to inspected workspace.

---

## 13. Legacy and Fallback Removal Rules

Final implementation must satisfy all of these:

1. `src/webview/html.ts` loads the React bundle, not server-rendered dashboard HTML.
2. Live dashboard does not call `renderDashboardShell(state)`.
3. Live dashboard does not use old `svg.graph-svg` graph stages.
4. `src/webview/renderers.ts` is removed or reduced to unreachable/deprecated code.
5. Old custom graph routing helpers are not reachable:
   - `routeFeatureEdge`
   - `routeOrthogonalPoints`
   - `routeAroundGraph`
   - `directFallbackRoute`
   - direct center-to-center module graph path rendering
6. Git CLI automatic fallback is removed from live Git provider.
7. Scanner automatic fallback is removed from live scanner path.
8. Live analysis mock fallback is removed.
9. Missing webview bundle does not render mock or legacy dashboard.
10. Tests catch accidental use of old graph renderer or fallback states.

Suggested tests:

- Playwright asserts React Flow graph elements exist.
- Playwright asserts `.graph-svg` is not the main graph implementation.
- Unit tests assert Git unavailable state is explicit when VS Code Git API is unavailable.
- Unit tests assert scanner backend selection is deterministic and does not auto-switch after failure.
- Integration tests assert analysis error state is explicit and not mock data.

---

## 14. VSIX Packaging Requirements

### 14.1 Build output inclusion

The packaged VSIX must include:

```text
out/extension.js
package.json
media/webview/...built assets...
media/webview/...manifest...
media/codicon-map.svg
```

It must not require `src/webview-app` or Vite dev server at runtime.

### 14.2 `.vscodeignore` review

Review `.vscodeignore` and update if needed.

Rules:

- Do not exclude `media/webview/**`.
- Do not exclude required Activity Bar icon assets.
- It is okay to exclude `src/**`, `scripts/**`, `test/**`, `visual/**`, and generated test artifacts.
- Document source map inclusion/exclusion decision.

### 14.3 Package content verification

Add either a script or documented manual command to verify VSIX contents.

Preferred script:

```text
scripts/verify-vsix-contents.ts
```

Recommended npm script:

```json
"verify:vsix": "tsc -p ./tsconfig.scripts.json && node ./out-scripts/scripts/verify-vsix-contents.js"
```

The script should verify the generated VSIX contains:

- `extension/package.json`
- `extension/out/extension.js`
- `extension/media/webview/` bundle files
- at least one webview JavaScript asset
- at least one webview CSS asset if Vite emits CSS
- Vite manifest file
- `extension/media/codicon-map.svg`

### 14.4 Installed extension smoke test

After packaging, install into isolated extensions directory and launch against target workspace using Windows Native VS Code.

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

## 15. Implementation Checkpoints

Codex must implement in checkpoints. Do not skip directly to final migration.

### Checkpoint A — Baseline and build pipeline

Tasks:

- Read current README, package, webview, renderer, watcher, scanner, git provider, visual test, and integration test files.
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

Success criteria:

- Extension TypeScript compiles.
- Webview bundle builds.
- `media/webview` contains built assets and manifest.

### Checkpoint B — React webview shell and messaging

Tasks:

- Update `html.ts` to load React assets.
- Add webview asset resolver.
- Add missing-bundle explicit error page.
- Implement ready/state message handshake.
- Keep command messages working.

Validation:

```powershell
npm run compile
npm run test:unit
```

Success criteria:

- Opening dashboard loads React shell.
- React app receives state from extension.
- Refresh and mode message path still works.

### Checkpoint C — React dashboard frame

Tasks:

- Implement toolbar, mode tabs, diagnostics, performance diagnostics, loading/error states.
- Implement basic mode containers.
- Preserve existing command buttons.

Validation:

```powershell
npm run compile
npm run test:unit
npm run visual:render
npm run visual:test
```

Success criteria:

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

Success criteria:

- Graph view models produce valid nodes and edges.
- ELK adapter returns finite positions.
- Geometry tests catch edge-through-node defects on representative graphs.

### Checkpoint E — React Flow graph migration

Tasks:

- Implement `GraphCanvas`.
- Implement custom feature/module/summary nodes.
- Render dashboard graphs with React Flow + ELK.
- Remove live use of old custom SVG graph renderer.
- Add tests that fail if old `.graph-svg` remains the main graph implementation.

Validation:

```powershell
npm run compile
npm run test:unit
npm run visual:render
npm run visual:test
```

Success criteria:

- Feature-level graphs use React Flow + ELK.
- Module/dependency graphs no longer use direct center-to-center SVG paths.
- Old graph renderer is unreachable.

### Checkpoint F — Performance timing and deterministic no-fallback scanner/Git path

Tasks:

- Add `analysisTiming.ts`.
- Add timing diagnostics to state/output channel.
- Replace automatic Git CLI fallback with explicit unavailable state.
- Replace scanner fallback with deterministic scanner backend selection.
- Rename fallback scanner terminology where practical.
- Update tests for explicit unavailable/error states.

Validation:

```powershell
npm run compile
npm run test:unit
```

Success criteria:

- Timing diagnostics are visible in output/diagnostics.
- Git provider does not auto-switch to CLI.
- Scanner does not auto-switch after failure.
- Error/unavailable states are explicit.

### Checkpoint G — File-level cache and incremental refresh

Tasks:

- Add `fileAnalysisCache.ts`.
- Add `workspaceIndex.ts`.
- Add changed-path batching in watcher.
- Add `stateManager.refresh(context)` with refresh reason and changed paths.
- Add cache hit/miss diagnostics.
- Add import resolver index if needed for performance.

Validation:

```powershell
npm run compile
npm run test:unit
npm run visual:render
npm run visual:test
```

Success criteria:

- Small file changes use incremental analysis.
- Cache hit/miss counts are reported.
- Full scan is reserved for explicit reasons.
- No automatic fallback from incremental to full scan without explicit logged reason.

### Checkpoint H — Full dashboard mode migration

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

Success criteria:

- All modes render expected panels.
- Dashboard commands work.
- VS Code integration test passes or limitation is explicitly documented.

### Checkpoint I — Packaging and installed extension

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

Success criteria:

- VSIX includes required webview assets.
- Installed extension loads React dashboard.
- No inspected target workspace files are written.

---

## 16. Testing Plan

### 16.1 Unit tests

Add or update:

```text
test/suite/graphViews.test.ts
test/suite/graphGeometry.test.ts
test/suite/messageProtocol.test.ts
test/suite/analysisTiming.test.ts
test/suite/fileAnalysisCache.test.ts
test/suite/workspaceIndex.test.ts
test/suite/gitProvider.test.ts
test/suite/scannerBackendSelection.test.ts
```

Required assertions:

- Graph view model builders produce stable IDs.
- Every graph node has finite width and height.
- Every graph edge references existing source and target node IDs.
- Empty/error graph states are explicit and serializable.
- ELK adapter returns finite positions.
- Geometry tests catch edge-through-node defects.
- Git unavailable state is explicit.
- Scanner backend selection is deterministic.
- File cache invalidates changed/deleted files.
- Incremental update does not reparse unchanged files.
- Timing summary records expected phases.

### 16.2 Playwright visual tests

Update `visual/dashboard.spec.ts`.

Required checks:

- Standalone HTML loads built React bundle.
- Each mode renders expected panels.
- Performance diagnostics are present in diagnostics details or output-derived state.
- React Flow viewport is visible.
- Expected custom nodes are visible.
- Expected edges are visible.
- Fit/zoom controls work.
- No horizontal overflow at 1920x1080.
- Screenshots are generated for all four modes.
- Normal mock snapshots do not show layout failure states.
- Old `.graph-svg` graph stage is not the main graph implementation.

### 16.3 VS Code integration tests

Update `test/vscode/extension.integration.test.ts` if needed.

Required checks:

- Extension activates.
- Activity Bar launcher provider is registered.
- `Live Architecture Map: Open Dashboard` opens a webview panel.
- Dashboard command result reports opened/visible state.
- Refresh command works.
- Missing webview bundle produces explicit error.
- Git unavailable path is explicit if Git API is unavailable.
- No inspected workspace files are written.

---

## 17. Visual Render Script Plan

Update `scripts/render-ui-snapshots.ts`.

New behavior:

1. Ensure webview bundle exists by requiring `npm run compile` before render.
2. Generate standalone HTML files that load the built React bundle.
3. Inject intentional standalone mock dashboard state for each mode.
4. Continue writing:
   - `artifacts/ui/live-changes.html`
   - `artifacts/ui/whole-architecture.html`
   - `artifacts/ui/feature-focus.html`
   - `artifacts/ui/diff-since-baseline.html`
   - screenshots generated by Playwright
   - `artifacts/validation-report.md`

Standalone mock data is allowed only here and in tests. It must not be a runtime fallback for real analysis failure.

---

## 18. Acceptance Criteria

The migration is complete only when all are true:

- `package.json` contains React, React DOM, React Flow, ELKJS, Vite, and React plugin dependencies in correct dependency groups.
- Vite builds webview app into extension-owned static assets.
- `media/webview` contains manifest and JS/CSS assets after compile.
- Real VS Code dashboard loads the Vite-built React app.
- React app receives live dashboard state from extension host.
- All four modes render in React.
- Feature-level architecture graphs use React Flow + ELK layout.
- Module/dependency graphs do not use old direct center-to-center rendering.
- Edges do not visibly pass through unrelated feature blocks in normal views.
- Existing commands still work.
- Baseline capture and diff still work.
- Export snapshot still works.
- Diagnostics show real workspace/scanner/git/performance information.
- No files are written into inspected target workspace.
- Watcher passes changed paths into refresh context.
- File-level cache avoids reparsing unchanged files.
- Git status enriches changed-file semantics through VS Code Git API only.
- Git CLI automatic fallback is removed from live path.
- Scanner automatic fallback is removed from live path.
- Live analysis mock fallback is removed.
- Missing webview bundle shows explicit error.
- ELK failure shows explicit graph error.
- Old renderer is not reachable from live dashboard.
- Visual snapshots are generated for all four modes.
- Unit tests pass.
- Playwright visual tests pass.
- VS Code integration tests pass or limitations are explicitly documented.
- `npm run package` succeeds.
- VSIX contents are verified to include `media/webview` built assets.
- Installed VSIX smoke test confirms React dashboard loads from packaged assets.

---

## 19. Required Validation Commands

Run from Windows Native PowerShell in the extension repository.

Example:

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

## 20. Final Report Format

Codex final response must include:

```text
Summary
- What changed architecturally
- Which dependencies were added
- Which files were added/modified/removed
- Which dashboard modes were migrated
- Which graph types use React Flow + ELK
- Which performance components were added
- Which fallback paths were removed
- Whether any old graph renderer remains reachable

Checkpoints
- Checkpoint A: pass/fail and notes
- Checkpoint B: pass/fail and notes
- Checkpoint C: pass/fail and notes
- Checkpoint D: pass/fail and notes
- Checkpoint E: pass/fail and notes
- Checkpoint F: pass/fail and notes
- Checkpoint G: pass/fail and notes
- Checkpoint H: pass/fail and notes
- Checkpoint I: pass/fail and notes

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

Performance
- Initial full scan time
- Incremental refresh time for one changed Python file
- Cache hit/miss counts
- Git status time
- Graph view model time
- ELK layout time

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
- Any performance work intentionally deferred
```

---

## 21. Important Implementation Notes

- Keep changes focused on React migration, graph rendering architecture, and analysis performance foundation.
- Do not redesign unrelated business logic unless required by this migration.
- Prefer pure functions for graph view model generation, cache invalidation, and geometry tests.
- Do not put VS Code API calls inside React components.
- Do not use webview global state directly except through `vscodeApi.ts`.
- Use stable node and edge IDs for tests and layout caching.
- Preserve text selection behavior for text panels; React Flow canvas may remain interactive/drag-based.
- Keep rendering performant for realistic ABB_ROS2-size projects.
- If graph size is too large, summarize before layout rather than rendering hundreds of nodes by default.
- For large graphs, show top connected/changed/impacted nodes first and expose details in diagnostics or inspector.
- Use explicit errors. Avoid silent fallbacks.
- Do not leave direct center-to-center module edges in production graph rendering.
- Do not declare success until fallback paths are removed or explicitly documented as unreachable deletion targets.
- Do not declare success until VSIX packaging assets are verified.
