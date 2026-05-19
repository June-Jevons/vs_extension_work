# react_plan_v5.md

## 0. Purpose

This file is the single source of truth for migrating **Live Architecture Map** to the long-term React webview architecture on **native Ubuntu 22.04**, while improving analysis performance, removing fallback-based behavior, and fixing F5/debug project configuration.

This v5 plan supersedes `react_plan_v1.md`, `react_plan_v2.md`, `react_plan_v3.md`, and `react_plan_v4.md` for implementation.

Use this file only unless the user explicitly asks otherwise.

Major v5 additions over v4:

1. Native Ubuntu 22.04 first-time environment bootstrap.
2. `.vscode/launch.json` F5 debug migration from Windows/WSL to native Ubuntu paths.
3. `.vscode/tasks.json` migration from `powershell.exe` to npm/Bash-compatible tasks.
4. README and documentation migration away from Windows Native / WSL UNC instructions.
5. Linux-native path kind and storage/path tests.
6. Explicit environment doctor/checks so missing dependencies fail clearly.

---

## 1. Native Ubuntu 22.04 Environment Policy

Implementation and validation environment:

```text
Native Ubuntu 22.04 desktop or Ubuntu 22.04 machine with a working display/session.
Not WSL.
Not Remote-WSL.
Not Windows Native VS Code.
Not Windows VS Code opening a WSL UNC path.
```

Use Linux-native paths:

```text
/home/jevons/vs_extension_work
/home/jevons/ABB_ROS2
/tmp/vscode-lam-...
```

Do not use:

```text
C:\...
PowerShell
powershell.exe
code.cmd
\\wsl.localhost\...
\\wsl$\...
Remote-WSL workflow
Windows Native VS Code workflow
```

Required shell style:

```text
Bash-compatible Ubuntu commands only.
```

---

## 2. First-Time Ubuntu Setup Requirements

Because this is a new native Ubuntu environment, Codex must verify prerequisites before implementation.

### 2.1 Required system tools

Check and install if missing:

```bash
sudo apt update
sudo apt install -y \
  git \
  curl \
  ca-certificates \
  build-essential \
  unzip \
  xdg-utils \
  libsecret-1-dev \
  xvfb
```

Notes:

- `git`: repository and Git status integration.
- `curl` / `ca-certificates`: common install/download support.
- `build-essential`: native Node package build support if any dependency requires it.
- `unzip`: VSIX content verification.
- `xdg-utils` / `libsecret-1-dev`: common VS Code/Linux integration support.
- `xvfb`: explicit headless test option if no GUI display is available.

If the environment has a normal desktop session, do not force headless mode. Use headless/Xvfb only as an explicitly selected test mode.

### 2.2 Required development tools

Codex must verify:

```bash
node --version
npm --version
git --version
code --version
```

If any are missing, stop and report the missing dependency explicitly. Do not hide missing tools by changing validation scope.

Node/npm requirements:

- Use a modern Node.js version compatible with the repository's TypeScript/Vite/VS Code extension tooling.
- Do not pin a random Node version inside source code.
- Record the tested `node --version` and `npm --version` in the final report.

VS Code requirements:

- `code` command must be available in PATH.
- VS Code must be able to launch an Extension Development Host on native Ubuntu.
- If `code --version` is unavailable, stop and report that VS Code CLI setup is missing.

### 2.3 Playwright / browser dependencies

Run after npm dependencies are installed:

```bash
npx playwright install --with-deps chromium
```

If sudo/system dependency installation is not allowed, run:

```bash
npx playwright install chromium
```

Then run `npm run visual:test`. If browser/system libraries are missing, report the exact missing dependency error.

Do not replace Playwright validation with mock-only screenshots.

### 2.4 Optional environment doctor

Add a project-level environment doctor script if practical:

```text
scripts/doctor-ubuntu.ts
```

Recommended npm script:

```json
"doctor:ubuntu": "tsc -p ./tsconfig.scripts.json && node ./out-scripts/scripts/doctor-ubuntu.js"
```

The doctor should check:

- running platform is Linux;
- Node and npm are available;
- Git is available;
- VS Code CLI `code` is available;
- `unzip` is available;
- extension repository path is native Linux, not WSL UNC;
- target workspace path exists if configured;
- no Windows-only `.vscode` entries remain.

This is a fail-fast diagnostic tool, not a fallback mechanism.

---

## 3. Critical Policy: No Fallback Features

Do not add fallback behavior for new features.

Fallback means an automatic alternate path that silently replaces the intended implementation when something fails or is unavailable.

Forbidden examples:

- Do not silently show mock/sample dashboard data when live analysis fails.
- Do not silently fall back from React dashboard to old string/SVG renderer.
- Do not silently fall back from ELK layout to custom graph routing.
- Do not silently fall back from VS Code Git API to Git CLI.
- Do not silently fall back from one scanner backend to another.
- Do not silently treat missing webview bundle as a usable dashboard.
- Do not run hidden `npm install` or `npm ci` from F5/debug tasks.
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

- Standalone visual tests may use intentional mock state.
- Unit tests may use fixtures/mock state intentionally.
- A user-facing explicit mode/setting may select a backend, but this must be deterministic selection, not automatic fallback.
- Headless validation may be explicitly selected with a separate command, but it must not silently replace normal desktop validation.

Terminology rule:

- Avoid naming new code paths `fallback` unless the code is a temporary deletion target.
- Prefer names such as `explicitErrorState`, `selectedScannerBackend`, `unavailableGitState`, `standaloneMockState`, or `directWorkspaceFsScanner`.

---

## 4. Existing Ubuntu Migration Issues To Fix

Current repository still contains Windows/WSL assumptions that must be changed.

### 4.1 README

Current README is Windows Native / PowerShell / WSL UNC oriented.

Required update:

- Replace top-level workflow with Native Ubuntu 22.04 workflow.
- Replace PowerShell code blocks with Bash code blocks.
- Replace `C:\...` paths with `/home/jevons/...` examples.
- Replace `code.cmd` with `code`.
- Replace `\\wsl.localhost\...` with `/home/jevons/ABB_ROS2`.
- Replace WSL UNC validation text with native Linux path validation.
- Replace references to fallback reasons with explicit error/unavailable state wording.
- Keep historical Windows/WSL notes only if clearly marked obsolete or removed entirely.

### 4.2 `.vscode/launch.json`

Current launch config uses Windows temp paths and WSL UNC target path.

Required target config:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Live Architecture Map on ABB_ROS2 (Ubuntu Native)",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}",
        "--user-data-dir=/tmp/vscode-lam-dev-user-data",
        "--extensions-dir=/tmp/vscode-lam-dev-extensions",
        "--disable-gpu",
        "/home/jevons/ABB_ROS2"
      ],
      "outFiles": [
        "${workspaceFolder}/out/**/*.js"
      ],
      "preLaunchTask": "npm: compile"
    }
  ]
}
```

Rules:

- No `C:\` paths.
- No `\\wsl.localhost` paths.
- No `\\wsl$` paths.
- No `code.cmd`.
- F5 must open the target Linux path `/home/jevons/ABB_ROS2` or clearly documented configured Linux path.
- F5 must not perform hidden dependency installation.
- F5 prelaunch must run compile only and fail clearly if dependencies are missing.

### 4.3 `.vscode/tasks.json`

Current tasks call `powershell.exe` and run hidden dependency install logic.

Required target config:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "type": "npm",
      "script": "compile",
      "group": "build",
      "problemMatcher": "$tsc",
      "label": "npm: compile"
    },
    {
      "type": "npm",
      "script": "watch",
      "group": "build",
      "problemMatcher": "$tsc-watch",
      "label": "npm: watch"
    }
  ]
}
```

Rules:

- Remove `powershell.exe` task.
- Remove hidden `npm ci` / `npm install` logic from F5 prelaunch.
- Use npm tasks only.
- Missing `node_modules` must fail explicitly with an npm error.

### 4.4 Optional `.vscode/settings.json`

A settings file is optional. If added, keep it Linux-safe only:

```json
{
  "npm.packageManager": "npm",
  "typescript.tsdk": "node_modules/typescript/lib",
  "terminal.integrated.defaultProfile.linux": "bash"
}
```

Do not add Windows-only settings.

### 4.5 Path kind and storage tests

Current code/test coverage contains WSL/Windows-oriented path expectations.

Required updates:

- `describePathKind` must support native Linux paths explicitly, for example `linux-native`.
- Windows/UNC/WSL path handling may remain as historical parsing support, but active Ubuntu workflow/tests must use Linux-native paths.
- Storage safety tests must include `/home/jevons/ABB_ROS2` as inspected workspace path.
- Extension-managed storage safety must be tested against native Linux VS Code storage paths.
- Tests must confirm the inspected workspace path itself is not considered extension-managed storage.

Example native path expectations:

```text
/home/jevons/ABB_ROS2                       -> linux-native
/home/jevons/.config/Code/User/globalStorage/local-tools.live-architecture-map -> extension-managed storage
/home/jevons/ABB_ROS2/.vscode               -> not extension-managed storage
```

---

## 5. Target Stack

### 5.1 Runtime dependencies

Install as production dependencies:

```bash
npm install react react-dom @xyflow/react elkjs
```

Reason:

- `react` and `react-dom`: webview UI framework.
- `@xyflow/react`: React Flow package for interactive node and edge canvas.
- `elkjs`: automatic layout engine for layered architecture diagrams and orthogonal edge routing.

### 5.2 Development dependencies

Install as dev dependencies:

```bash
npm install -D vite @vitejs/plugin-react @types/react @types/react-dom
```

Optional only if tests remain stable:

```bash
npm install -D vitest jsdom
```

Do not add D3, Cytoscape, Mermaid, Graphviz, canvas rendering, or a large state management library in this pass.

---

## 6. Target Architecture

### 6.1 Extension host responsibilities

The extension host owns:

- VS Code activation and command registration.
- Deterministic Linux-native scanner backend selection.
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
  -> VS Code Git API enriches changed file status
  -> affected graph views/layouts update
```

### 7.2 File-level analysis cache

Create:

```text
src/core/fileAnalysisCache.ts
```

Cache key:

```text
workspaceKey + relativePath + mtime + size + optional content hash
```

Rules:

- Read/parse a file only when its cache key changed.
- Deleted files must remove cache entries.
- Renamed files should be represented as delete + add unless Git rename information is available.
- Cache must not be written into inspected workspace.
- Cache corruption must become an explicit cache error or cache invalidation event, not a hidden fallback.

### 7.3 Workspace index

Create:

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

Full rebuild should happen only for:

- first workspace open;
- manual full refresh;
- branch change;
- settings/exclude globs change;
- cache schema version change;
- too many changed paths in one batch;
- explicit cache invalidation command.

### 7.4 Import resolver index

Create:

```text
src/graph/importResolverIndex.ts
```

Recommended indexes:

- exact module id map;
- suffix-to-module ids map;
- parent package map;
- top-level package map;
- reverse dependency map.

### 7.5 Git provider without fallback

Target behavior:

- Use VS Code Git API as the selected Git provider.
- If VS Code Git extension/API/repository is unavailable, return explicit `gitStatusSource: 'unavailable'` and diagnostic reason.
- Do not automatically call Git CLI as fallback.
- A future explicit user setting may allow `gitProvider: 'vscodeGitApi' | 'disabled' | 'gitCli'`, but do not auto-switch providers.

### 7.6 Deterministic native Linux scanner backend

Native Ubuntu 22.04 default:

```text
selected scanner backend: vscodeFindFiles
path kind: linux-native
```

Rules:

- Decide scanner backend before scanning.
- Log selected backend and reason.
- If selected backend fails, return explicit scanner error state.
- Do not automatically switch to another backend.
- Rename fallback scanner terminology where practical:

```text
src/core/readDirectoryFallbackScanner.ts
  -> src/core/directWorkspaceFsScanner.ts
```

`directWorkspaceFsScanner` may remain as an explicit future backend, but it must not be invoked automatically as a fallback.

### 7.7 Refresh scheduler

Change watcher to batch changed paths.

Recommended behavior:

- Collect changed paths in a Set.
- Debounce events.
- Pass changed paths to state manager.
- Use thresholds:
  - small batch: incremental update;
  - large batch: explicit full refresh with reason `tooManyChangedPaths`.

No silent fallback from incremental to full scan.

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
    "test:vscode:headless": "xvfb-run -a npm run test:vscode",
    "validate": "npm run compile && npm run test:unit && npm run visual:render && npm run visual:test",
    "validate:full": "npm run validate && npm run test:vscode && npm run package",
    "package": "npm run compile && vsce package"
  }
}
```

Rules:

- `test:vscode:headless` is an explicit command only.
- Do not silently use headless mode when normal `test:vscode` fails.
- If headless is used, final report must say so.

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

---

## 11. React App and Graph Plan

Implement:

- `src/webview-app/src/main.tsx`
- `src/webview-app/src/App.tsx`
- `src/webview-app/src/vscodeApi.ts`
- `src/webview-app/src/styles.css`
- dashboard shell components;
- all four dashboard modes;
- React Flow graph canvas;
- custom feature/module/summary nodes;
- pure ELK adapter;
- graph view model builders;
- graph geometry tests;
- layout cache.

Do not put VS Code API calls inside React components. Use `vscodeApi.ts` only.

---

## 12. Legacy and Fallback Removal Rules

Final implementation must satisfy:

1. `src/webview/html.ts` loads React bundle, not server-rendered dashboard HTML.
2. Live dashboard does not call `renderDashboardShell(state)`.
3. Live dashboard does not use old `svg.graph-svg` graph stages.
4. `src/webview/renderers.ts` is removed or reduced to unreachable/deprecated code.
5. Old custom graph routing helpers are not reachable.
6. Git CLI automatic fallback is removed from live Git provider.
7. Scanner automatic fallback is removed from live scanner path.
8. Live analysis mock fallback is removed.
9. Missing webview bundle does not render mock or legacy dashboard.
10. F5/debug tasks do not run hidden install fallback.
11. Tests catch accidental use of old graph renderer or fallback states.

---

## 13. VSIX Packaging Requirements

The packaged VSIX must include:

```text
out/extension.js
package.json
media/webview/...built assets...
media/webview/...manifest...
media/codicon-map.svg
```

Review `.vscodeignore`:

- Do not exclude `media/webview/**`.
- Do not exclude required Activity Bar icon assets.
- It is okay to exclude `src/**`, `scripts/**`, `test/**`, `visual/**`, and generated test artifacts.

Add either a script or documented manual command to verify VSIX contents.

Preferred script:

```text
scripts/verify-vsix-contents.ts
```

Recommended npm script:

```json
"verify:vsix": "tsc -p ./tsconfig.scripts.json && node ./out-scripts/scripts/verify-vsix-contents.js"
```

Ubuntu-compatible manual inspection example:

```bash
unzip -l live-architecture-map-*.vsix | grep 'extension/media/webview'
unzip -l live-architecture-map-*.vsix | grep 'extension/out/extension.js'
unzip -l live-architecture-map-*.vsix | grep 'extension/package.json'
```

Installed extension smoke test:

```bash
code --install-extension ./live-architecture-map-0.0.1.vsix \
  --force \
  --extensions-dir /tmp/vscode-lam-installed-extensions

code /home/jevons/ABB_ROS2 \
  --new-window \
  --user-data-dir=/tmp/vscode-lam-installed-user-data \
  --extensions-dir=/tmp/vscode-lam-installed-extensions \
  --disable-gpu
```

---

## 14. Implementation Checkpoints

### Checkpoint 0 — Ubuntu environment bootstrap and repo hygiene

Tasks:

- Verify native Ubuntu 22.04 environment.
- Verify required tools: `node`, `npm`, `git`, `code`, `unzip`.
- Install system packages if missing.
- Install Playwright Chromium/deps.
- Confirm repository is in a Linux-native path.
- Search and list active Windows/WSL instructions in README, `.vscode`, tests, and source.

Validation:

```bash
uname -a
lsb_release -a || cat /etc/os-release
node --version
npm --version
git --version
code --version
unzip -v | head -n 2
```

If added:

```bash
npm run doctor:ubuntu
```

Success criteria:

- Environment is native Ubuntu 22.04.
- Required tools are available.
- Missing tool failures are explicit.

### Checkpoint A — Ubuntu `.vscode` and documentation migration

Tasks:

- Update `.vscode/launch.json` to native Ubuntu F5 config.
- Update `.vscode/tasks.json` to npm-only tasks.
- Remove PowerShell/Windows/WSL UNC instructions from active README workflow.
- Update path kind and storage tests to native Linux.
- Ensure F5 uses `preLaunchTask: npm: compile`.

Validation:

```bash
npm run compile
npm run test:unit
```

Success criteria:

- `.vscode` contains no `powershell.exe`, `C:\`, `\\wsl.localhost`, or `\\wsl$`.
- F5 debug config points to Linux target workspace.
- Unit tests pass.

### Checkpoint B — React/Vite build pipeline

Tasks:

- Install React/React Flow/ELK/Vite dependencies.
- Add Vite config.
- Add minimal React app.
- Add compile scripts.
- Confirm webview bundle builds into `media/webview`.

Validation:

```bash
npm install
npm run compile
```

Success criteria:

- Extension TypeScript compiles.
- Webview bundle builds.
- `media/webview` contains built assets and manifest.

### Checkpoint C — React webview shell and messaging

Tasks:

- Update `html.ts` to load React assets.
- Add webview asset resolver.
- Add missing-bundle explicit error page.
- Implement ready/state message handshake.
- Keep command messages working.

Validation:

```bash
npm run compile
npm run test:unit
```

### Checkpoint D — React dashboard frame

Tasks:

- Implement toolbar, mode tabs, diagnostics, performance diagnostics, loading/error states.
- Implement basic mode containers.
- Preserve existing command buttons.

Validation:

```bash
npm run compile
npm run test:unit
npm run visual:render
npm run visual:test
```

### Checkpoint E — Graph view models and ELK adapter

Tasks:

- Create graph view model types.
- Create graph view builders.
- Create pure ELK layout adapter.
- Create graph geometry tests.

Validation:

```bash
npm run compile
npm run test:unit
```

### Checkpoint F — React Flow graph migration

Tasks:

- Implement graph canvas and custom nodes.
- Render dashboard graphs with React Flow + ELK.
- Remove live use of old custom SVG graph renderer.
- Add tests that fail if old `.graph-svg` remains the main graph implementation.

Validation:

```bash
npm run compile
npm run test:unit
npm run visual:render
npm run visual:test
```

### Checkpoint G — Performance timing and deterministic no-fallback scanner/Git path

Tasks:

- Add analysis timing.
- Add timing diagnostics to state/output channel.
- Remove automatic Git CLI fallback.
- Replace scanner fallback with deterministic native Linux scanner backend.
- Rename fallback scanner terminology where practical.

Validation:

```bash
npm run compile
npm run test:unit
```

### Checkpoint H — File-level cache and incremental refresh

Tasks:

- Add file analysis cache.
- Add workspace index.
- Add changed-path batching in watcher.
- Add `stateManager.refresh(context)` with refresh reason and changed paths.
- Add cache hit/miss diagnostics.
- Add import resolver index if needed.

Validation:

```bash
npm run compile
npm run test:unit
npm run visual:render
npm run visual:test
```

### Checkpoint I — Full dashboard mode migration

Tasks:

- Finish all four mode views.
- Port changed files table.
- Port validation cards.
- Port summary/health/metric cards.
- Port feature focus panels.
- Port diff/baseline panels.
- Port structural timeline.

Validation:

```bash
npm run compile
npm run test:unit
npm run visual:render
npm run visual:test
npm run test:vscode
```

### Checkpoint J — Package and installed extension validation

Tasks:

- Review `.vscodeignore`.
- Package VSIX.
- Verify VSIX contains React webview bundle.
- Install VSIX into isolated extension dir.
- Smoke test against target workspace.

Validation:

```bash
npm run package
```

If implemented:

```bash
npm run verify:vsix
```

---

## 15. Testing Plan

Add/update tests:

```text
test/suite/graphViews.test.ts
test/suite/graphGeometry.test.ts
test/suite/messageProtocol.test.ts
test/suite/analysisTiming.test.ts
test/suite/fileAnalysisCache.test.ts
test/suite/workspaceIndex.test.ts
test/suite/gitProvider.test.ts
test/suite/scannerBackendSelection.test.ts
test/suite/ubuntuPathKind.test.ts
test/suite/vscodeConfigUbuntu.test.ts
```

Required assertions:

- Native Linux paths are detected as `linux-native`.
- `.vscode` debug/tasks contain no Windows/WSL/PowerShell paths.
- F5 preLaunch task is `npm: compile`.
- Graph view model builders produce stable IDs.
- ELK adapter returns finite positions.
- Geometry tests catch edge-through-node defects.
- Git unavailable state is explicit.
- Scanner backend selection is deterministic.
- File cache invalidates changed/deleted files.
- Incremental update does not reparse unchanged files.
- Timing summary records expected phases.

Playwright visual tests must check:

- Standalone HTML loads built React bundle.
- Each mode renders expected panels.
- Performance diagnostics are visible.
- React Flow viewport is visible.
- Expected nodes/edges are visible.
- No horizontal overflow at 1920x1080.
- Old `.graph-svg` graph stage is not the main graph implementation.

VS Code integration tests must check:

- Extension activates on native Ubuntu.
- Dashboard opens in Extension Development Host.
- Missing webview bundle produces explicit error.
- Git unavailable path is explicit if Git API is unavailable.
- No inspected workspace files are written.

---

## 16. Acceptance Criteria

Migration is complete only when all are true:

- Native Ubuntu 22.04 workflow was used.
- First-time environment setup requirements are documented and verified.
- README active workflow is Ubuntu Native, not Windows/WSL.
- `.vscode/launch.json` uses Linux paths and opens `/home/jevons/ABB_ROS2` or documented Linux target.
- `.vscode/tasks.json` uses npm tasks only and no `powershell.exe`.
- No Windows, PowerShell, WSL, WSL UNC, or Remote-WSL workflow remains in active instructions/tests.
- `package.json` contains React, React DOM, React Flow, ELKJS, Vite, and React plugin dependencies in correct dependency groups.
- Vite builds webview app into extension-owned static assets.
- Real VS Code dashboard loads the Vite-built React app.
- All four modes render in React.
- Graphs use React Flow + ELK layout.
- Diagnostics show real workspace/scanner/git/performance information.
- No files are written into inspected target workspace.
- Watcher passes changed paths into refresh context.
- File-level cache avoids reparsing unchanged files.
- Git status enriches changed-file semantics through VS Code Git API only.
- Git CLI automatic fallback is removed from live path.
- Scanner automatic fallback is removed from live path.
- Live analysis mock fallback is removed.
- Missing webview bundle shows explicit error.
- Old renderer is not reachable from live dashboard.
- Unit tests pass.
- Playwright visual tests pass.
- VS Code integration tests pass or limitations are explicitly documented.
- `npm run package` succeeds.
- VSIX contents are verified to include `media/webview` built assets.
- Installed VSIX smoke test confirms React dashboard loads from packaged assets on native Ubuntu.

---

## 17. Required Validation Commands

Run from native Ubuntu 22.04 Bash shell:

```bash
cd /home/jevons/vs_extension_work
npm install
npx playwright install --with-deps chromium
npm run compile
npm run test:unit
npm run visual:render
npm run visual:test
npm run test:vscode
npm run validate
npm run package
```

If implemented:

```bash
npm run doctor:ubuntu
npm run verify:vsix
npm run validate:full
```

If no desktop display is available and headless mode is explicitly selected:

```bash
npm run test:vscode:headless
```

Do not run implementation or validation from WSL.

---

## 18. Final Report Format

Codex final response must include:

```text
Environment
- Confirm native Ubuntu 22.04 workflow was used
- node --version
- npm --version
- code --version
- git --version
- Whether desktop or explicit headless mode was used

Summary
- What changed architecturally
- Which dependencies were added
- Which files were added/modified/removed
- Which .vscode files were changed
- Which README/docs were updated
- Which dashboard modes were migrated
- Which graph types use React Flow + ELK
- Which performance components were added
- Which fallback paths were removed
- Whether any old graph renderer remains reachable

Checkpoints
- Checkpoint 0: pass/fail and notes
- Checkpoint A: pass/fail and notes
- Checkpoint B: pass/fail and notes
- Checkpoint C: pass/fail and notes
- Checkpoint D: pass/fail and notes
- Checkpoint E: pass/fail and notes
- Checkpoint F: pass/fail and notes
- Checkpoint G: pass/fail and notes
- Checkpoint H: pass/fail and notes
- Checkpoint I: pass/fail and notes
- Checkpoint J: pass/fail and notes

Validation
- npm install: pass/fail
- npx playwright install --with-deps chromium: pass/fail
- npm run compile: pass/fail
- npm run test:unit: pass/fail
- npm run visual:render: pass/fail
- npm run visual:test: pass/fail
- npm run test:vscode: pass/fail
- npm run validate: pass/fail
- npm run package: pass/fail
- npm run doctor:ubuntu: pass/fail/not implemented
- npm run verify:vsix: pass/fail/not implemented

F5 Debug
- Confirm F5 launches Extension Development Host on native Ubuntu
- Confirm target workspace path
- Confirm preLaunchTask is npm: compile
- Confirm no hidden npm install fallback is used

Performance
- Initial full scan time
- Incremental refresh time for one changed Python file
- Cache hit/miss counts
- Git status time
- Graph view model time
- ELK layout time

Artifacts
- Generated HTML files
- Generated screenshots
- Validation report path
- Packaged VSIX path
- Whether VSIX webview assets were verified

Safety
- Confirm no inspected target workspace files were written

Known limitations
- Manual VS Code UI inspection still required, if any
- Display/session limitations, if any
- Graph layout limitations, if any
- Performance work intentionally deferred, if any
```

---

## 19. Important Implementation Notes

- Keep changes focused on Ubuntu migration, React migration, graph rendering architecture, and analysis performance foundation.
- Do not redesign unrelated business logic unless required by this migration.
- Prefer pure functions for graph view model generation, cache invalidation, and geometry tests.
- Do not put VS Code API calls inside React components.
- Use `vscodeApi.ts` for webview/extension messaging.
- Use stable node and edge IDs for tests and layout caching.
- Preserve text selection behavior for text panels.
- Keep rendering performant for realistic ABB_ROS2-size projects.
- If graph size is too large, summarize before layout rather than rendering hundreds of nodes by default.
- Use explicit errors. Avoid silent fallbacks.
- Do not leave direct center-to-center module edges in production graph rendering.
- Do not declare success until `.vscode` is Ubuntu-native.
- Do not declare success until fallback paths are removed or explicitly documented as unreachable deletion targets.
- Do not declare success until VSIX packaging assets are verified.
