# plan_v3.md — Live Architecture Map VS Code Extension

## 0. Mission

Build a standalone VS Code extension named **Live Architecture Map** in the existing repository:

```text
GitHub repository: June-Jevons/vs_extension_work
Current working branch: restart/windows-native-validation
Local Windows path: C:\Users\Junekim\Work\99.vs_workspace\vs_extension_work
```

The extension is a visual inspection dashboard for Python/ROS2-style repositories such as `ABB_ROS2`.

Its purpose is to let the user see:

- the whole project architecture when Codex is not editing,
- which feature area Codex is currently modifying,
- which files/modules are affected,
- how dependency relationships change,
- how the current structure differs from a captured baseline.

This is a real VS Code extension. It must not be implemented as a script inside the inspected target repository.

The attached mockup images are the visual source of truth:

```text
mockups/mockup_1.png
mockups/mockup_2.png
```

The current branch is a clean restart. Treat the repository as intentionally reset. The first implementation must be validation-first and Windows-native.

---

## 1. Current Clean-Restart Repository State

At the start of this plan, the branch should contain only the clean restart assets:

```text
vs_extension_work/
├── .gitignore
├── plan_v3.md
└── mockups/
    ├── mockup_1.png
    └── mockup_2.png
```

If `plan_v2.md` is still present, it may be kept only as historical reference, but **Codex must use `plan_v3.md` as the source of truth**.

Do not restore the previous WSL-generated scaffold.

Do not reuse previously generated `src/`, `out/`, `out-test/`, `node_modules/`, or old README content unless this plan explicitly says to recreate them.

---

## 2. Non-Negotiable Rules

### 2.1 Windows Native Only for Visual Validation

The previous WSL-based attempt had unreliable GUI/screenshot validation. This restart must assume Windows Native VS Code.

Required:

```text
Use Windows Native path:
C:\Users\Junekim\Work\99.vs_workspace\vs_extension_work

Do not use:
- WSL paths
- /home/jevons/...
- Remote-WSL VS Code windows
- Linux-only screenshot assumptions
```

When documenting commands, use PowerShell-friendly examples first.

### 2.2 Do Not Modify the Inspected Target Workspace

The extension repository is separate from the inspected workspace.

The inspected workspace, for example `ABB_ROS2`, is read-only unless the user explicitly runs an export command and chooses a destination.

Forbidden by default:

- creating `.vscode/settings.json` in the inspected target project,
- creating `architecture/`,
- creating `docs/live/`,
- creating cache files in the inspected target workspace,
- writing generated metadata into the inspected target repository,
- modifying source files,
- modifying test files,
- modifying git state.

Allowed:

- reading workspace files,
- reading git status/diff,
- watching file changes,
- storing extension metadata in extension-managed storage,
- writing files inside this extension repository,
- writing generated visual validation artifacts inside this extension repository under ignored `artifacts/`,
- asking the user for an export destination if they explicitly run an export command.

### 2.3 Extension-Managed Storage Only

Store baseline snapshots, feature mappings, cached graphs, and per-workspace state using only:

- `context.workspaceState`,
- `context.globalState`,
- `context.storageUri`,
- `context.globalStorageUri`,
- in-memory state.

Do not write workspace settings into the inspected target project.

### 2.4 Mockup Fidelity Override

The mockup images are the primary UI source of truth.

Do not create:

- a generic dashboard,
- a plain list view,
- raw Markdown dashboard,
- raw JSON dashboard,
- text-only panels,
- placeholder boxes without the intended layout,
- a fake browser app pretending to be VS Code.

The implementation must visually reproduce the mockup direction:

- real VS Code Activity Bar contribution,
- real VS Code Sidebar / Tree View contribution,
- main editor Webview dashboard,
- dark VS Code-like theme,
- compact card layout,
- four dashboard modes,
- feature impact graph,
- dependency graph,
- changed files table,
- risk summary cards,
- validation status cards,
- architecture health cards,
- baseline diff cards.

### 2.5 Validation-First Implementation Order

This restart must not rely only on live VS Code screenshots.

Required order:

1. Create the minimal TypeScript VS Code extension scaffold.
2. Build deterministic Webview renderers with static mock data.
3. Add stable `data-testid` coverage for required panels.
4. Add standalone HTML snapshot generation for all four dashboard modes.
5. Add Playwright visual tests that render the standalone HTML and produce screenshots.
6. Add VS Code integration tests for command/sidebar/webview registration.
7. Only then run or document Extension Development Host validation.
8. Only after UI validation is accepted, implement real scanner/git/watcher/baseline logic.

---

## 3. Required `.gitignore`

The repository must keep the existing `.gitignore` or replace it with an equivalent one:

```gitignore
# Dependencies
node_modules/
.pnpm-store/
.yarn/
.npm/

# TypeScript / VS Code extension build outputs
out/
out-test/
dist/
build/
coverage/

# VS Code extension test runtime
.vscode-test/
.vscode-test-web/
test-workspace/
test-fixtures/.tmp/

# Visual validation / Playwright outputs
artifacts/
playwright-report/
test-results/
screenshots/
videos/
traces/

# Packaged extension artifacts
*.vsix

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
pnpm-debug.log*

# Environment / secrets
.env
.env.*
!.env.example

# OS files
.DS_Store
Thumbs.db
Desktop.ini

# Editor local state
.history/
*.swp
*.swo

# VS Code local-only settings
.vscode/settings.json

# Keep these VS Code project files trackable if added later
!.vscode/launch.json
!.vscode/tasks.json
!.vscode/extensions.json
```

`package-lock.json` should be tracked after `npm install`/`npm ci` creates it.

The mockup images must remain tracked.

---

## 4. Mockup UI Contract

### 4.1 Real VS Code Shell

Use real VS Code extension contributions:

- Activity Bar container from `package.json`,
- Sidebar Tree View from `TreeDataProvider`,
- Webview dashboard in the main editor area,
- commands exposed through Command Palette,
- extension settings contributed through `package.json`.

Do not draw a fake VS Code Activity Bar or fake VS Code Sidebar inside the Webview.

### 4.2 Dashboard Modes

Implement these four modes as real screen states:

1. **Live Changes Mode**
2. **Whole Architecture Mode**
3. **Feature Focus Mode**
4. **Diff Since Baseline Mode**

Mode switching must be visible inside the dashboard and accessible from the Sidebar.

### 4.3 Live Changes Mode Layout

Required visible structure:

```text
Native VS Code Activity Bar
Native Live Architecture Map Sidebar
  - Changed Features
  - Changed Files
  - Impacted Modules
  - Suggested Tests

Main Webview Dashboard
  Top toolbar
    - Refresh
    - Export
    - Configure
    - Timeline

  Current Change Area panel
    - feature path / breadcrumb
    - last updated timestamp
    - auto refresh status
    - High / Medium / Low risk cards on the right

  Architecture Impact Graph panel
    - largest central panel
    - feature blocks as colored nodes
    - dependency/impact arrows
    - changed or impacted features highlighted
    - layout/zoom controls visible

  Lower split row
    - Changed Files table on the left
    - Dependency Graph on the right

  Bottom row
    - Validation Status cards
    - syntax / compile / changed tests / full tests / config scanner / style checks
```

### 4.4 Whole Architecture Mode Layout

Required panels:

- Feature-level architecture diagram as the largest panel,
- left navigation/summary area with:
  - Feature Blocks,
  - Entry Points,
  - Architecture Views,
- architecture overview cards:
  - total Python files,
  - total modules,
  - total classes,
  - total functions,
- architecture health cards:
  - circular dependency count,
  - high-risk module count,
  - orphan module count,
  - estimated test coverage,
- visible controls for layout and zoom.

### 4.5 Feature Focus Mode Layout

Required panels:

- feature selector near the top,
- selected feature detail title,
- module composition panel,
- internal dependency graph panel,
- related external dependencies panel,
- related tests panel,
- sidebar state showing selected feature and related modules.

### 4.6 Diff Since Baseline Mode Layout

Required panels:

- baseline selector,
- action to save/capture a new baseline,
- action to compare,
- summary cards for:
  - added modules,
  - removed modules,
  - changed modules,
  - added dependencies,
  - removed dependencies,
- before/after dependency comparison graph,
- top changes table,
- structural timeline panel.

If no baseline exists, show a polished empty state with a clear **Capture Baseline** action.

---

## 5. Required `data-testid` Coverage

Every dashboard renderer must include stable `data-testid` attributes so the UI can be validated without relying on subjective screenshots.

Required IDs:

```text
dashboard-root
mode-liveChanges
mode-wholeArchitecture
mode-featureFocus
mode-diffSinceBaseline

current-change-area
risk-card-high
risk-card-medium
risk-card-low
architecture-impact-graph
changed-files-table
dependency-graph
validation-status-row

whole-architecture-diagram
architecture-overview-cards
architecture-health-cards

feature-selector
module-composition-panel
internal-dependency-graph
related-external-dependencies
related-tests

baseline-selector
baseline-summary-cards
before-after-graph
top-changes-table
structural-timeline
```

Playwright visual tests must fail if any required `data-testid` is missing.

---

## 6. Dashboard Snapshot Validation

### 6.1 Purpose

Live VS Code window capture may fail depending on environment. Therefore the central Webview dashboard must be testable as standalone HTML.

The same renderer code used by the VS Code Webview must also be usable by a snapshot script.

### 6.2 Required Script

Create:

```text
scripts/render-ui-snapshots.ts
```

It must render standalone HTML files from mock `DashboardState` into:

```text
artifacts/ui/live-changes.html
artifacts/ui/whole-architecture.html
artifacts/ui/feature-focus.html
artifacts/ui/diff-since-baseline.html
```

The standalone HTML must include:

- the same dashboard markup used by the Webview,
- the same dashboard CSS,
- mock data,
- no remote assets,
- no CDN dependency.

### 6.3 Required Playwright Screenshots

Add Playwright tests that open each standalone HTML file at a 1920x1080 viewport and save:

```text
artifacts/ui/live-changes.png
artifacts/ui/whole-architecture.png
artifacts/ui/feature-focus.png
artifacts/ui/diff-since-baseline.png
```

Tests must also check:

```text
[ ] required data-testid elements exist
[ ] document.body.scrollWidth <= viewport width
[ ] dashboard is not raw Markdown
[ ] dashboard is not raw JSON
[ ] graph SVGs are visible
[ ] key panels have non-zero bounding boxes
```

### 6.4 Validation Report

Create a script or test output that writes:

```text
artifacts/validation-report.md
```

The report must include:

- commands run,
- compile result,
- unit test result,
- visual render result,
- visual test result,
- VS Code integration test result if run,
- generated artifact paths,
- whether live VS Code screenshot capture was attempted,
- if live screenshot capture was unavailable, exact reason,
- confirmation that no inspected target workspace files were written.

---

## 7. VS Code Integration Testing

Add VS Code integration tests using `@vscode/test-cli` and `@vscode/test-electron`.

Required coverage:

```text
[ ] extension activates
[ ] required commands are registered
[ ] Activity Bar view container is declared in package.json
[ ] Sidebar view id is declared in package.json
[ ] Sidebar provider exposes required root sections
[ ] Open Dashboard command creates a Webview panel
[ ] message protocol accepts mode switching
[ ] dashboard command does not write into inspected target workspace
```

These tests validate extension behavior. They do not replace Playwright visual snapshot validation.

---

## 8. Optional Full VS Code Shell E2E

A full VS Code Desktop UI test may be added later using WebdriverIO VS Code service.

This is optional for the first pass.

Do not block Phase 0-3 completion on WebdriverIO if it is too heavy or unreliable in the current environment.

If added, it must launch VS Code with isolated user data and extensions directories:

```powershell
code C:\Users\Junekim\Work\ABB_ROS2 `
  --new-window `
  --extensionDevelopmentPath=C:\Users\Junekim\Work\99.vs_workspace\vs_extension_work `
  --user-data-dir=C:\tmp\vscode-lam-user-data `
  --extensions-dir=C:\tmp\vscode-lam-extensions `
  --disable-gpu
```

If `ABB_ROS2` is in a different Windows path, document the actual path used.

---

## 9. Recommended Repository Structure After Implementation

```text
vs_extension_work/
├── .gitignore
├── .vscode/
│   ├── launch.json
│   ├── tasks.json
│   └── extensions.json
├── mockups/
│   ├── mockup_1.png
│   └── mockup_2.png
├── media/
│   ├── icon.svg
│   └── codicon-map.svg
├── scripts/
│   ├── render-ui-snapshots.ts
│   └── write-validation-report.ts
├── src/
│   ├── extension.ts
│   ├── commands/
│   │   ├── commandRegistry.ts
│   │   └── commands.ts
│   ├── core/
│   │   ├── analysisEngine.ts
│   │   ├── architectureModel.ts
│   │   ├── eventBus.ts
│   │   ├── featureMapper.ts
│   │   ├── riskScorer.ts
│   │   └── workspaceScanner.ts
│   ├── git/
│   │   ├── gitProvider.ts
│   │   └── gitStatusParser.ts
│   ├── graph/
│   │   ├── dependencyGraph.ts
│   │   ├── graphDiff.ts
│   │   ├── importParser.ts
│   │   └── svgGraphLayout.ts
│   ├── mockData/
│   │   └── mockDashboardState.ts
│   ├── storage/
│   │   ├── baselineStore.ts
│   │   ├── snapshotStore.ts
│   │   └── workspaceKey.ts
│   ├── tree/
│   │   ├── sidebarProvider.ts
│   │   └── treeItems.ts
│   ├── webview/
│   │   ├── dashboardPanel.ts
│   │   ├── dashboardState.ts
│   │   ├── html.ts
│   │   ├── messageProtocol.ts
│   │   ├── renderers.ts
│   │   ├── standaloneHtml.ts
│   │   └── styles.ts
│   └── watchers/
│       └── workspaceWatcher.ts
├── test/
│   ├── suite/
│   │   ├── extension.test.ts
│   │   ├── featureMapper.test.ts
│   │   ├── importParser.test.ts
│   │   ├── graphDiff.test.ts
│   │   └── riskScorer.test.ts
│   └── vscode/
│       └── extension.integration.test.ts
├── visual/
│   └── dashboard.spec.ts
├── package.json
├── package-lock.json
├── playwright.config.ts
├── tsconfig.json
├── tsconfig.test.json
├── tsconfig.scripts.json
├── README.md
└── plan_v3.md
```

The `artifacts/` directory is intentionally ignored and generated during validation.

---

## 10. Required `package.json` Scripts

Use these scripts or equivalent names:

```json
{
  "scripts": {
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "test": "npm run compile && npm run test:unit",
    "test:unit": "tsc -p ./tsconfig.test.json && node ./out-test/test/suite/extension.test.js",
    "visual:render": "npm run compile && tsc -p ./tsconfig.scripts.json && node ./out-scripts/scripts/render-ui-snapshots.js",
    "visual:test": "playwright test",
    "test:vscode": "vscode-test",
    "validate": "npm run compile && npm run test:unit && npm run visual:render && npm run visual:test",
    "package": "vsce package"
  }
}
```

Dependencies should be kept moderate.

Allowed dev dependencies for the first pass:

```text
typescript
@types/node
@types/vscode
@vscode/test-cli
@vscode/test-electron
@playwright/test
@vscode/vsce
```

Avoid React in the first pass unless there is a clear reason. Plain TypeScript + HTML + CSS + SVG is preferred.

---

## 11. VS Code Contributions

### 11.1 Extension Identity

```json
{
  "name": "live-architecture-map",
  "displayName": "Live Architecture Map",
  "description": "Visual architecture and change-impact dashboard for Python workspaces.",
  "version": "0.0.1",
  "publisher": "local-tools",
  "categories": ["Visualization", "Other"],
  "main": "./out/extension.js"
}
```

### 11.2 Activation Events

Use explicit activation events:

```json
{
  "activationEvents": [
    "onStartupFinished",
    "onLanguage:python",
    "onView:liveArchitectureMap.sidebar",
    "onCommand:liveArchitectureMap.openDashboard",
    "onCommand:liveArchitectureMap.refresh",
    "onCommand:liveArchitectureMap.captureBaseline",
    "onCommand:liveArchitectureMap.showDiffSinceBaseline",
    "workspaceContains:**/*.py"
  ]
}
```

Do not use `"*"` unless all other activation strategies fail.

### 11.3 Commands

Implement:

```text
liveArchitectureMap.openDashboard
liveArchitectureMap.refresh
liveArchitectureMap.captureBaseline
liveArchitectureMap.showDiffSinceBaseline
liveArchitectureMap.focusFeature
liveArchitectureMap.exportSnapshot
liveArchitectureMap.clearWorkspaceCache
```

User-facing command titles:

```text
Live Architecture Map: Open Dashboard
Live Architecture Map: Refresh
Live Architecture Map: Capture Baseline
Live Architecture Map: Show Diff Since Baseline
Live Architecture Map: Focus Feature
Live Architecture Map: Export Snapshot
Live Architecture Map: Clear Workspace Cache
```

### 11.4 Activity Bar and Sidebar

Use:

```text
view container id: liveArchitectureMap
sidebar view id: liveArchitectureMap.sidebar
```

Required sidebar root sections:

```text
Changed Features
Changed Files
Impacted Modules
Suggested Tests
Baseline
Actions
Modes
```

Click behavior:

- clicking a mode opens dashboard and switches to that mode,
- clicking a feature opens dashboard in Feature Focus Mode,
- clicking a changed file opens that file in the editor,
- clicking Capture Baseline runs the command,
- clicking Refresh runs the command.

### 11.5 Settings

Contribute at least:

```json
{
  "liveArchitectureMap.autoWatch": {
    "type": "boolean",
    "default": true
  },
  "liveArchitectureMap.autoOpenDashboard": {
    "type": "boolean",
    "default": false
  },
  "liveArchitectureMap.defaultModeWhenClean": {
    "type": "string",
    "enum": ["wholeArchitecture", "liveChanges"],
    "default": "wholeArchitecture"
  },
  "liveArchitectureMap.defaultModeWhenDirty": {
    "type": "string",
    "enum": ["liveChanges", "wholeArchitecture"],
    "default": "liveChanges"
  },
  "liveArchitectureMap.maxFilesToAnalyze": {
    "type": "number",
    "default": 2000
  },
  "liveArchitectureMap.excludeGlobs": {
    "type": "array",
    "default": [
      "**/.git/**",
      "**/.venv/**",
      "**/venv/**",
      "**/__pycache__/**",
      "**/node_modules/**",
      "**/build/**",
      "**/install/**",
      "**/log/**",
      "**/.pytest_cache/**"
    ]
  }
}
```

Reading extension settings is allowed. Writing workspace settings into the inspected target project is not allowed.

---

## 12. Data Model

Create one central data model that can be used by mock data, real analysis, storage, and rendering.

```ts
export type RiskLevel = "low" | "medium" | "high";

export type DashboardMode =
  | "liveChanges"
  | "wholeArchitecture"
  | "featureFocus"
  | "diffSinceBaseline";

export interface WorkspaceSnapshot {
  workspaceKey: string;
  workspaceName: string;
  rootUri: string;
  capturedAtIso: string;
  git?: GitSummary;
  modules: ModuleNode[];
  dependencies: DependencyEdge[];
  featureBlocks: FeatureBlock[];
  changedFiles: ChangedFile[];
  impactedFeatures: ImpactedFeature[];
  risks: RiskItem[];
  health: ArchitectureHealth;
  validations: ValidationStatus[];
}

export interface ModuleNode {
  id: string;
  name: string;
  path: string;
  language: "python" | "typescript" | "json" | "markdown" | "other";
  packageName?: string;
  featureId?: string;
  imports: string[];
  importedBy: string[];
  isEntryPoint: boolean;
  isTest: boolean;
  isOrphan: boolean;
  riskLevel: RiskLevel;
}

export interface DependencyEdge {
  from: string;
  to: string;
  kind: "import" | "config" | "test" | "entrypoint" | "unknown";
  confidence: "low" | "medium" | "high";
}

export interface FeatureBlock {
  id: string;
  label: string;
  description: string;
  pathPatterns: string[];
  moduleIds: string[];
  incomingEdges: number;
  outgoingEdges: number;
  changedFileCount: number;
  riskLevel: RiskLevel;
}

export interface ChangedFile {
  path: string;
  status: "modified" | "added" | "deleted" | "renamed" | "untracked" | "unknown";
  featureId?: string;
  moduleId?: string;
  riskLevel: RiskLevel;
  reason: string;
  lastChangedIso?: string;
}

export interface BaselineDiff {
  baselineCapturedAtIso: string;
  currentCapturedAtIso: string;
  addedModules: ModuleNode[];
  removedModules: ModuleNode[];
  changedModules: ModuleNode[];
  addedEdges: DependencyEdge[];
  removedEdges: DependencyEdge[];
  changedFeatures: FeatureBlock[];
  riskChanges: RiskItem[];
}

export interface ValidationStatus {
  id: string;
  label: string;
  state: "passed" | "running" | "failed" | "unknown" | "notRun";
  detail: string;
  durationMs?: number;
}

export interface DashboardState {
  mode: DashboardMode;
  workspace: WorkspaceSummary;
  snapshot: WorkspaceSnapshot;
  selectedFeatureId?: string;
  baselineDiff?: BaselineDiff;
  isMockData: boolean;
  isLoading: boolean;
  error?: string;
}
```

---

## 13. Mock Data Requirements

Mock data is required before real analysis.

Mock data must include:

```text
Changed/live feature areas:
- Config System
- Operator Panel Startup
- Tests / Config Scanner
- Launcher / Subprocess Env
- ROS Launch / Runtime

Whole architecture feature areas:
- Motion Planning
- GUI Layer
- Task Runner
- Safety Layer
- Robot I/O Layer
- Config System
- Utils / Common
- ABB Controller
```

Mock changed files must look realistic for ABB_ROS2-style work:

```text
src/abb_common/config/runtime_config.py
src/operator_panel/launcher.py
src/abb_common/config/env_loader.py
tests/config/test_runtime_config.py
```

Mock validations must include at least:

```text
syntax
compile
changed tests
full tests
config scanner
style checks
```

All four modes must render using only `mockDashboardState`.

---

## 14. Webview Rendering Requirements

### 14.1 Pure Renderers

Implement renderers as pure functions where practical:

```text
renderDashboardShell(state)
renderTopToolbar(state)
renderModeTabs(state)
renderLiveChangesMode(state)
renderWholeArchitectureMode(state)
renderFeatureFocusMode(state)
renderDiffSinceBaselineMode(state)
renderFeatureImpactGraph(state)
renderDependencyGraph(state)
renderChangedFilesTable(state)
renderValidationStatus(state)
```

The VS Code Webview and standalone snapshot script must use the same renderers and CSS.

### 14.2 Security

Implement:

- strict Content Security Policy,
- nonce for Webview scripts,
- no remote scripts,
- no external CDN,
- sanitized HTML for file paths/module names,
- message validation between extension and Webview.

Standalone snapshot HTML may use a simpler script setup, but it must still avoid external network dependencies.

### 14.3 Message Protocol

Messages from Webview to extension:

```ts
type WebviewToExtensionMessage =
  | { type: "ready" }
  | { type: "setMode"; mode: DashboardMode }
  | { type: "selectFeature"; featureId: string }
  | { type: "captureBaseline" }
  | { type: "refresh" }
  | { type: "showDiffSinceBaseline" }
  | { type: "exportSnapshot" };
```

Messages from extension to Webview:

```ts
type ExtensionToWebviewMessage =
  | { type: "state"; state: DashboardState }
  | { type: "error"; message: string }
  | { type: "loading"; message: string };
```

---

## 15. Implementation Phases

Do not jump ahead if compile/tests fail.

### Phase 0 — Clean Restart Preflight

Goal:

Verify the clean branch state and establish project hygiene.

Tasks:

- confirm branch is `restart/windows-native-validation`,
- confirm current path is `C:\Users\Junekim\Work\99.vs_workspace\vs_extension_work`,
- confirm `.gitignore` exists,
- confirm `mockups/mockup_1.png` and `mockups/mockup_2.png` exist,
- add or rename this plan as `plan_v3.md`,
- do not restore old generated files.

Validation:

```powershell
git status
git branch --show-current
dir
dir mockups
```

Acceptance:

```text
[ ] branch is restart/windows-native-validation
[ ] .gitignore exists
[ ] plan_v3.md exists
[ ] mockups/mockup_1.png exists
[ ] mockups/mockup_2.png exists
[ ] node_modules is not tracked
[ ] out/out-test are not tracked
```

### Phase 1 — TypeScript VS Code Extension Scaffold

Goal:

Create a working TypeScript VS Code extension project.

Tasks:

- create `package.json`,
- create `tsconfig.json`,
- create `tsconfig.test.json`,
- create `tsconfig.scripts.json`,
- create `.vscode/launch.json`,
- create `.vscode/tasks.json`,
- create `src/extension.ts`,
- create command registration skeleton,
- create sidebar provider skeleton,
- create placeholder Webview dashboard,
- add README with Windows Native setup.

Validation:

```powershell
npm install
npm run compile
```

Acceptance:

```text
[ ] package-lock.json is created and tracked
[ ] npm run compile passes
[ ] no target workspace is needed yet
[ ] README uses Windows path, not /home/jevons
```

### Phase 2 — Mock Data and Pure Dashboard Renderers

Goal:

Render all four dashboard modes from mock data.

Tasks:

- create architecture model types,
- create `mockDashboardState.ts`,
- create pure renderers,
- create dashboard CSS,
- create Webview HTML wrapper,
- implement four modes visually,
- add required `data-testid` attributes.

Validation:

```powershell
npm run compile
npm run test:unit
```

Acceptance:

```text
[ ] all four renderers exist
[ ] required data-testid attributes exist in rendered HTML
[ ] UI is dark themed and card based
[ ] graphs are SVG/HTML/CSS panels, not text dumps
```

### Phase 3 — Webview Dashboard and Sidebar Shell

Goal:

Wire the mock dashboard into a real VS Code extension shell.

Tasks:

- add Activity Bar contribution,
- add Sidebar Tree View,
- add commands,
- implement Webview panel,
- implement mode switching,
- implement Webview message handling,
- implement sidebar click behavior with mock state.

Validation:

```powershell
npm run compile
npm run test:unit
```

Manual validation if possible:

```powershell
code . --new-window
```

Then press F5 and open the Extension Development Host.

Acceptance:

```text
[ ] Activity Bar contribution declared
[ ] Sidebar View contribution declared
[ ] Webview dashboard opens
[ ] four modes are available
[ ] no dashboard auto-opens by default
```

### Phase 4 — Standalone Visual Snapshot System

Goal:

Make Webview visual validation independent from live VS Code screenshot capture.

Tasks:

- add `scripts/render-ui-snapshots.ts`,
- add `src/webview/standaloneHtml.ts`,
- add Playwright config,
- add `visual/dashboard.spec.ts`,
- generate standalone HTML for four modes,
- generate PNG screenshots for four modes,
- assert required panels and no horizontal overflow,
- write `artifacts/validation-report.md`.

Validation:

```powershell
npm run visual:render
npm run visual:test
```

Acceptance:

```text
[ ] artifacts/ui/live-changes.html exists
[ ] artifacts/ui/whole-architecture.html exists
[ ] artifacts/ui/feature-focus.html exists
[ ] artifacts/ui/diff-since-baseline.html exists
[ ] artifacts/ui/live-changes.png exists
[ ] artifacts/ui/whole-architecture.png exists
[ ] artifacts/ui/feature-focus.png exists
[ ] artifacts/ui/diff-since-baseline.png exists
[ ] required data-testid assertions pass
[ ] no horizontal overflow at 1920x1080
```

### Phase 5 — VS Code Integration Tests

Goal:

Verify extension behavior through VS Code APIs.

Tasks:

- add `@vscode/test-cli`,
- add `@vscode/test-electron`,
- implement integration tests,
- verify command registration,
- verify sidebar structure,
- verify dashboard command,
- verify no target workspace write.

Validation:

```powershell
npm run test:vscode
```

Acceptance:

```text
[ ] extension activates
[ ] commands are registered
[ ] sidebar root sections are exposed
[ ] dashboard command creates a Webview panel
[ ] no inspected workspace file write occurs
```

### Phase 6 — Manual Windows Native Extension Host Check

Goal:

Confirm the extension can be launched in the real Windows VS Code shell.

Run from the extension repo:

```powershell
code C:\Users\Junekim\Work\ABB_ROS2 `
  --new-window `
  --extensionDevelopmentPath=C:\Users\Junekim\Work\99.vs_workspace\vs_extension_work `
  --user-data-dir=C:\tmp\vscode-lam-user-data `
  --extensions-dir=C:\tmp\vscode-lam-extensions `
  --disable-gpu
```

If `ABB_ROS2` path differs, update the command and README.

Acceptance:

```text
[ ] Activity Bar icon visible
[ ] Sidebar visible
[ ] Dashboard opens
[ ] four modes visible
[ ] live screenshot capture attempted or clearly marked unavailable
[ ] Playwright HTML screenshots still exist as the primary visual evidence
```

### Phase 7 — Workspace State and Storage Foundation

Only start after Phase 0-6 pass.

Goal:

Implement safe extension-managed state.

Tasks:

- workspace key generator,
- in-memory dashboard state,
- snapshot store,
- baseline store,
- clear workspace cache command,
- verify no target project writes.

Validation:

```powershell
npm run validate
npm run test:vscode
```

### Phase 8 — Workspace Scanner and Python Import Analyzer

Goal:

Build a read-only architecture snapshot.

Tasks:

- scan workspace files with exclude globs,
- parse Python imports,
- identify modules,
- resolve local dependencies,
- identify entry points,
- identify tests,
- build module nodes and dependency edges,
- handle parser errors gracefully.

Do not execute Python code. Do not import target project modules.

### Phase 9 — Git Status, Watcher, Feature Mapping, Risk Scoring

Goal:

Detect changes and map them to features.

Tasks:

- implement Git provider,
- parse `git status --porcelain=v1`,
- implement file watcher with debounce,
- implement built-in feature path patterns,
- infer feature from import graph when needed,
- implement deterministic risk scoring,
- include risk reasons.

### Phase 10 — Wire Real Data Without UI Regression

Goal:

Replace mock state with real state while keeping the accepted layout.

Requirements:

- clean workspace defaults to Whole Architecture Mode,
- dirty workspace defaults to Live Changes Mode,
- changed files appear in sidebar and table,
- graphs highlight changed/impacted areas,
- the UI snapshot tests still pass.

### Phase 11 — Feature Focus, Baseline Diff, Export, Packaging

Goal:

Finish usable extension behavior.

Tasks:

- real feature selector,
- real feature detail,
- Capture Baseline,
- Diff Since Baseline,
- export snapshot with Save Dialog,
- README usage guide,
- VSIX packaging.

Validation:

```powershell
npm run validate
npm run test:vscode
npm run package
```

---

## 16. Stop Conditions

Stop immediately and report exact failure if:

```text
[ ] npm install fails
[ ] npm run compile fails
[ ] npm run test:unit fails
[ ] npm run visual:render fails
[ ] npm run visual:test fails
[ ] npm run test:vscode fails
[ ] required data-testid is missing
[ ] dashboard has horizontal overflow at 1920x1080
[ ] dashboard is raw Markdown/JSON/text dump
[ ] inspected target workspace is modified unexpectedly
```

Do not proceed to backend wiring if Phase 0-6 validation is not accepted.

---

## 17. README Requirements

README must document Windows Native workflow first.

Required content:

```powershell
cd C:\Users\Junekim\Work\99.vs_workspace\vs_extension_work
npm install
npm run compile
npm run visual:render
npm run visual:test
npm run test:vscode
```

Extension Development Host command:

```powershell
code C:\Users\Junekim\Work\ABB_ROS2 `
  --new-window `
  --extensionDevelopmentPath=C:\Users\Junekim\Work\99.vs_workspace\vs_extension_work `
  --user-data-dir=C:\tmp\vscode-lam-user-data `
  --extensions-dir=C:\tmp\vscode-lam-extensions `
  --disable-gpu
```

README must also explain:

- this is not a WSL workflow,
- `artifacts/` is ignored and generated,
- how to inspect generated dashboard screenshots,
- how to package VSIX,
- how to install from VSIX,
- that the inspected workspace is read-only by default.

---

## 18. First Codex Pass Prompt

Use this prompt for the first implementation pass.

```text
Read plan_v3.md first and inspect mockups/mockup_1.png and mockups/mockup_2.png.

You are working in:
C:\Users\Junekim\Work\99.vs_workspace\vs_extension_work

GitHub repository:
June-Jevons/vs_extension_work

Branch:
restart/windows-native-validation

This is a clean restart. Do not restore the previous WSL-generated scaffold.

Implement Phase 0 through Phase 6 only.

Goal:
Create a validation-first Windows Native VS Code extension foundation for Live Architecture Map.

Non-negotiable:
- Use the attached mockup images as the UI source of truth.
- Use a real VS Code Activity Bar contribution.
- Use a real Sidebar Tree View.
- Use a real Webview dashboard.
- Implement all four modes visually with mock data:
  1. Live Changes
  2. Whole Architecture
  3. Feature Focus
  4. Diff Since Baseline
- Do not wire real scanner/git/watcher/baseline logic yet.
- Do not modify any inspected target workspace.
- Do not use raw Markdown, raw JSON, or text-only panels as the dashboard.
- Do not rely only on live VS Code screenshot capture.

Validation-first requirements:
- Add stable data-testid attributes for all required panels.
- Add scripts/render-ui-snapshots.ts.
- Generate standalone HTML files under artifacts/ui/.
- Add Playwright tests that open the standalone HTML at 1920x1080.
- Save screenshots under artifacts/ui/.
- Fail tests if required panels are missing or horizontal overflow exists.
- Add VS Code integration tests with @vscode/test-cli and @vscode/test-electron.
- Write artifacts/validation-report.md.

Required commands:
npm install
npm run compile
npm run test:unit
npm run visual:render
npm run visual:test
npm run test:vscode

If any command fails, stop and report the exact failure.

Final response must include:
- changed files summary
- commands run and exact results
- generated artifact paths
- whether live VS Code screenshot capture was attempted
- if live screenshot capture failed or was unavailable, exact reason
- confirmation that no inspected target workspace files were written
```

---

## 19. Second Codex Pass Prompt

Use only after Phase 0-6 are accepted.

```text
Read plan_v3.md again.

Implement Phase 7 through Phase 10.

Keep the accepted mockup-matching UI layout unchanged.

Add real extension-managed storage, workspace scanner, Python import analyzer, git status parsing, file watcher, feature mapping, and risk scoring.

Do not modify the inspected target workspace.

After implementation, run:
npm run validate
npm run test:vscode

Then validate with a Python workspace:
- clean workspace shows Whole Architecture Mode
- dirty workspace shows Live Changes Mode
- changed files appear in table and sidebar
- feature/risk cards update
- no inspected target workspace files are written
```

---

## 20. Third Codex Pass Prompt

Use only after real analysis wiring works.

```text
Read plan_v3.md again.

Implement Phase 11.

Focus on:
- Feature Focus Mode with real feature data
- Capture Baseline
- Diff Since Baseline with real graph diff
- Export Snapshot
- README usage guide
- VSIX packaging
- final UI polish against mockups

After implementation, run:
npm run validate
npm run test:vscode
npm run package

Provide final validation notes and artifacts.
```

---

## 21. Final Done Criteria

The project is successful when:

```text
[ ] standalone VS Code extension project exists
[ ] extension compiles
[ ] Activity Bar contribution exists
[ ] Sidebar Tree View exists
[ ] Webview dashboard exists
[ ] dashboard is visual and dark-themed
[ ] dashboard visually follows mockups
[ ] four modes are implemented
[ ] data-testid validation passes
[ ] standalone HTML snapshots are generated
[ ] Playwright PNG screenshots are generated
[ ] VS Code integration tests pass
[ ] no inspected target workspace files are created
[ ] README explains Windows Native validation
[ ] package-lock.json is tracked
[ ] node_modules/out/out-test/artifacts are ignored
[ ] VSIX can be packaged
```
