# plan.md — VS Code Live Architecture Map Extension

## 0. Mission

Build a standalone VS Code extension named **Live Architecture Map**.

The extension is a visual inspection dashboard for Python/ROS2-style repositories such as `ABB_ROS2`. Its purpose is to let the user see:

- the whole project architecture when Codex is not editing,
- which feature area Codex is currently modifying,
- which files/modules are affected,
- how dependency relationships change,
- how the current structure differs from a captured baseline.

This must be implemented as a real VS Code extension, not as a script inside the target repository.

The attached mockup images are the visual source of truth. The goal is not merely to create a functional MVP; the goal is to implement an extension that visually matches the mockup dashboard structure as closely as practical.

---

## 1. Non-Negotiable Rules

### 1.1 Do not modify the target workspace

The extension must never create, update, or delete files inside the inspected target project unless the user explicitly runs an export command and chooses a location.

Forbidden by default:

- creating `.vscode/settings.json` in the target project,
- creating `architecture/`,
- creating `docs/live/`,
- creating cache files in the target workspace,
- writing generated metadata into the target repository,
- modifying source files,
- modifying test files,
- modifying git state.

Allowed:

- reading workspace files,
- reading git status/diff,
- watching file changes,
- storing extension metadata in extension-managed storage,
- writing files inside the extension repository being developed,
- asking the user for an export destination if they explicitly run an export command.

### 1.2 Use extension-managed storage only

Store baseline snapshots, feature mappings, cached graphs, and per-workspace state using only:

- `context.workspaceState`,
- `context.globalState`,
- `context.storageUri`,
- `context.globalStorageUri`,
- in-memory state.

Do not rely on VS Code workspace settings if doing so creates or edits `.vscode/settings.json` in the inspected target workspace.

Feature mappings should be stored in extension-managed storage keyed by workspace root.

### 1.3 Mockup fidelity override

The attached mockup images are the primary UI source of truth.

Do not create a generic dashboard. Do not replace the mockup with:

- a simple list view,
- raw Markdown,
- raw JSON,
- text-only panels,
- placeholder boxes without the intended layout,
- a dashboard that only has the same feature names but a different structure.

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

If the mockup images are attached to the Codex session, inspect them first and treat them as the UI contract. If the images are not available, do not invent a different layout; implement only the structure described in this plan and report that the mockup images were unavailable.

### 1.4 UI-first implementation order

Implement the visual mockup shell before implementing all real analysis logic.

Required order:

1. Build the VS Code extension shell.
2. Build the sidebar and Webview dashboard using static mock data.
3. Reproduce all four mockup modes visually.
4. Capture screenshots from the Extension Development Host for comparison.
5. Only after the mockup shell is accepted, wire real repository analysis data into the same UI.

Do not start with a backend-heavy analyzer that leaves the UI as a future polish task.

### 1.5 Extension repo is separate from the inspected project

Develop this extension in its own repository/folder, for example:

```text
~/tools/vscode-live-architecture-map/
```

The target project, for example `ABB_ROS2`, is only opened and inspected by the extension.

---

## 2. Mockup UI Contract

### 2.1 Real VS Code shell, not a fake browser app

The final result should be a real VS Code extension. Use actual VS Code extension contributions where possible:

- Activity Bar container from `package.json` contributions,
- Sidebar Tree View from `TreeDataProvider`,
- main dashboard as a Webview panel/editor,
- commands exposed through Command Palette,
- VS Code settings contributed by the extension.

Do not draw a fake VS Code Activity Bar or fake VS Code Sidebar inside the Webview. The Webview should render the central dashboard area. The native VS Code shell should provide the outer Activity Bar and Sidebar.

### 2.2 Required main screenshots / modes

The extension must implement these four dashboard modes as real screen states:

1. **Live Changes Mode** — for Codex/user edits currently in progress.
2. **Whole Architecture Mode** — for viewing the entire project structure.
3. **Feature Focus Mode** — for inspecting one selected feature area.
4. **Diff Since Baseline Mode** — for comparing current architecture against a saved baseline.

Mode switching must be visible inside the dashboard and also accessible from the Sidebar tree.

### 2.3 Live Changes Mode visual layout

Live Changes Mode must match the annotated mockup structure.

Required visible structure:

```text
VS Code Activity Bar
  ↓
Live Architecture Map Sidebar
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
    - current feature path / breadcrumb
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

The Live Changes Mode is not accepted if it only shows a list of changed files. It must show the dashboard panels above.

### 2.4 Whole Architecture Mode visual layout

Whole Architecture Mode must visually match the mockup with a full architecture diagram.

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

### 2.5 Feature Focus Mode visual layout

Feature Focus Mode must visually match the mockup for a selected feature.

Required panels:

- feature selector near the top,
- selected feature detail title,
- module composition panel,
- internal dependency graph panel,
- related external dependencies panel,
- related tests panel,
- left sidebar state that shows selected feature and related modules.

### 2.6 Diff Since Baseline Mode visual layout

Diff Since Baseline Mode must visually match the baseline comparison mockup.

Required panels:

- baseline selector,
- button/action to save a new baseline,
- button/action to compare,
- summary cards for:
  - added modules,
  - removed modules,
  - changed modules,
  - added dependencies,
  - removed dependencies,
- before/after dependency comparison graph,
- top changes table,
- structural timeline panel.

If no baseline exists, show a polished empty state with a clear **Capture Baseline** action instead of raw text.

### 2.7 Sidebar visual contract

The Sidebar must be useful even when the dashboard is closed.

Required root sections in the mockup direction:

```text
LIVE ARCHITECTURE MAP

Changed Features
  - Config System       High
  - Operator Panel      Medium
  - Tests / Config      Low

Changed Files
  - runtime_config.py   M
  - launcher.py         M
  - env_loader.py       M
  - ...

Impacted Modules
  - abb_common.config
    - runtime_config
    - config_loader
    - env_loader
  - operator_panel
    - launcher
    - startup

Suggested Tests
  - tests/config/test_runtime_config.py
  - tests/config/test_config_loader.py
  - tests/operator_panel/test_launcher.py
```

Also support clean workspace state:

```text
No modified files — use Whole Architecture Mode.
```

### 2.8 Visual quality requirements

Use:

- VS Code CSS variables where possible,
- dark background,
- subtle card borders,
- compact panels,
- readable typography,
- clear section headers,
- badges for risk and file status,
- SVG/HTML/CSS graph panels,
- no external CDN,
- no internet runtime dependency.

The dashboard must work at 1920x1080 and must not have visibly cropped or broken panels. Smaller editor widths should degrade gracefully with scrolling or stacked panels.

### 2.9 Screenshot validation requirement

After UI implementation, Codex must provide screenshot evidence from the Extension Development Host if the environment supports screenshots.

Required screenshots:

1. Live Changes Mode
2. Whole Architecture Mode
3. Feature Focus Mode
4. Diff Since Baseline Mode

The UI phase is not complete unless screenshots or an explicit screenshot-unavailable explanation is provided.

Screenshot acceptance checklist:

```text
[ ] Activity Bar visible
[ ] Live Architecture Map Activity Bar icon visible/selected
[ ] Sidebar visible
[ ] Webview dashboard visible
[ ] Four modes available
[ ] Live Changes Mode has Current Change Area panel
[ ] Live Changes Mode has High/Medium/Low risk cards
[ ] Live Changes Mode has Architecture Impact Graph
[ ] Live Changes Mode has Changed Files table
[ ] Live Changes Mode has Dependency Graph
[ ] Live Changes Mode has Validation Status row
[ ] Whole Architecture Mode has feature-level architecture diagram
[ ] Feature Focus Mode has feature selector and feature detail panels
[ ] Diff Since Baseline Mode has baseline summary cards and before/after graph
[ ] No raw Markdown/JSON/text dump is used as the dashboard
[ ] No broken or cropped panels at 1920x1080
```

---

## 3. Expected User Workflow

### 3.1 Normal startup

```text
User opens VS Code
  ↓
User opens ABB_ROS2 or another Python workspace
  ↓
Extension activates quietly
  ↓
Activity Bar shows Live Architecture Map icon
  ↓
File watcher starts if autoWatch is enabled
  ↓
Dashboard does not auto-open by default
```

### 3.2 Before Codex edits

```text
User opens Live Architecture Map
  ↓
Whole Architecture Mode shows current structure
  ↓
User runs "Live Architecture Map: Capture Baseline"
  ↓
Baseline is saved in extension storage, not in the target repo
```

### 3.3 During Codex edits

```text
Codex modifies files
  ↓
Extension detects file watcher events and/or git status changes
  ↓
Changed files are mapped to feature blocks
  ↓
Live Changes Mode updates
  ↓
User sees impacted feature areas and risks without opening every file
```

### 3.4 After Codex edits

```text
User runs "Live Architecture Map: Show Diff Since Baseline"
  ↓
Diff Since Baseline Mode compares current graph to saved baseline
  ↓
User sees added/removed/changed modules and dependency edges
```

---

## 4. VS Code Contributions

Implement VS Code extension contributions through `package.json`.

### 4.1 Extension identity

Suggested values:

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

### 4.2 Activation events

Use explicit activation events that support automatic monitoring without using the universal `"*"` activation event.

Required:

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

Notes:

- Do not use `"*"` unless all other activation strategies fail.
- Activation should be quiet.
- Do not auto-open the dashboard by default.
- Start watching automatically if `liveArchitectureMap.autoWatch` is true.

### 4.3 Commands

Implement these commands:

```text
Live Architecture Map: Open Dashboard
Live Architecture Map: Refresh
Live Architecture Map: Capture Baseline
Live Architecture Map: Show Diff Since Baseline
Live Architecture Map: Focus Feature
Live Architecture Map: Export Snapshot
Live Architecture Map: Clear Workspace Cache
```

Suggested command IDs:

```text
liveArchitectureMap.openDashboard
liveArchitectureMap.refresh
liveArchitectureMap.captureBaseline
liveArchitectureMap.showDiffSinceBaseline
liveArchitectureMap.focusFeature
liveArchitectureMap.exportSnapshot
liveArchitectureMap.clearWorkspaceCache
```

### 4.4 Activity Bar and Sidebar

Add a custom Activity Bar container.

Suggested view container ID:

```text
liveArchitectureMap
```

Suggested sidebar view ID:

```text
liveArchitectureMap.sidebar
```

Sidebar sections must follow the mockup contract in Section 2.7.

Click behavior:

- clicking a mode opens dashboard and switches to that mode,
- clicking a feature opens dashboard in Feature Focus Mode,
- clicking a changed file opens that file in the editor,
- clicking Capture Baseline runs the command,
- clicking Refresh runs the command.

### 4.5 Settings

Contribute these settings:

```json
{
  "liveArchitectureMap.autoWatch": {
    "type": "boolean",
    "default": true,
    "description": "Automatically watch workspace changes after activation."
  },
  "liveArchitectureMap.autoOpenDashboard": {
    "type": "boolean",
    "default": false,
    "description": "Automatically open the dashboard when the extension activates."
  },
  "liveArchitectureMap.defaultModeWhenClean": {
    "type": "string",
    "enum": ["wholeArchitecture", "liveChanges"],
    "default": "wholeArchitecture",
    "description": "Dashboard mode to show when there are no modified files."
  },
  "liveArchitectureMap.defaultModeWhenDirty": {
    "type": "string",
    "enum": ["liveChanges", "wholeArchitecture"],
    "default": "liveChanges",
    "description": "Dashboard mode to show when modified files are detected."
  },
  "liveArchitectureMap.maxFilesToAnalyze": {
    "type": "number",
    "default": 2000,
    "description": "Maximum number of workspace files to analyze for architecture graph generation."
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
    ],
    "description": "Glob patterns excluded from architecture analysis."
  }
}
```

Reading extension settings is allowed. Writing workspace settings into the inspected target project is not allowed.

---

## 5. Recommended Repository Structure

Create the extension repository with this structure:

```text
vscode-live-architecture-map/
├── .vscode/
│   ├── launch.json
│   └── tasks.json
├── media/
│   ├── icon.svg
│   └── codicon-map.svg
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
│   └── runTest.ts
├── package.json
├── tsconfig.json
├── eslint.config.js
├── README.md
└── plan.md
```

`mockData/mockDashboardState.ts` is required so the UI can be built to match the mockups before real analysis data is ready.

---

## 6. Data Model

Create a central architecture model that can be serialized and stored.

### 6.1 WorkspaceSnapshot

```ts
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
```

### 6.2 ModuleNode

```ts
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
  riskLevel: "low" | "medium" | "high";
}
```

### 6.3 DependencyEdge

```ts
export interface DependencyEdge {
  from: string;
  to: string;
  kind: "import" | "config" | "test" | "entrypoint" | "unknown";
  confidence: "low" | "medium" | "high";
}
```

### 6.4 FeatureBlock

```ts
export interface FeatureBlock {
  id: string;
  label: string;
  description: string;
  pathPatterns: string[];
  moduleIds: string[];
  incomingEdges: number;
  outgoingEdges: number;
  changedFileCount: number;
  riskLevel: "low" | "medium" | "high";
}
```

### 6.5 ChangedFile

```ts
export interface ChangedFile {
  path: string;
  status: "modified" | "added" | "deleted" | "renamed" | "untracked" | "unknown";
  featureId?: string;
  moduleId?: string;
  riskLevel: "low" | "medium" | "high";
  reason: string;
  lastChangedIso?: string;
}
```

### 6.6 BaselineDiff

```ts
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
```

### 6.7 ValidationStatus

```ts
export interface ValidationStatus {
  id: string;
  label: string;
  state: "passed" | "running" | "failed" | "unknown" | "notRun";
  detail: string;
  durationMs?: number;
}
```

---

## 7. Dashboard State and Mock Data

Create one `DashboardState` shape used by both mock data and real analysis data.

```ts
export type DashboardMode =
  | "liveChanges"
  | "wholeArchitecture"
  | "featureFocus"
  | "diffSinceBaseline";

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

Mock data requirements:

- Must resemble the attached screenshots.
- Include Config System, Operator Panel Startup, Tests / Config Scanner, Launcher / Subprocess Env, ROS Launch / Runtime.
- Include Motion Planning, GUI Layer, Task Runner, Safety Layer, Robot I/O Layer, Config System, Utils / Common, ABB Controller for Whole Architecture Mode.
- Include realistic changed file paths and risk levels.
- Include validation cards with passed/running states.
- Include a realistic baseline diff summary.

Acceptance:

```text
[ ] The full UI can render using only mockDashboardState.
[ ] The four modes work before the scanner/watcher is complete.
[ ] Replacing mock state with real state does not require changing the layout.
```

---

## 8. Feature Mapping Strategy

Implement feature mapping in this order.

### 8.1 Built-in path heuristics

Use path-based mapping first.

Suggested defaults for Python/ROS2 repositories:

```ts
const DEFAULT_FEATURE_PATTERNS = [
  {
    id: "gui",
    label: "GUI",
    patterns: ["**/gui/**", "**/operator_panel/**", "**/*panel*.py", "**/*view*.py", "**/*tab*.py"]
  },
  {
    id: "motion",
    label: "Motion Planning",
    patterns: ["**/motion/**", "**/moveit/**", "**/*motion*.py", "**/*planner*.py", "**/*trajectory*.py"]
  },
  {
    id: "safety",
    label: "Safety Layer",
    patterns: ["**/safety/**", "**/*collision*.py", "**/*zone*.py", "**/*guard*.py"]
  },
  {
    id: "config",
    label: "Config System",
    patterns: ["**/config/**", "**/*config*.py", "**/*.yaml", "**/*.yml", "**/*.json", "**/.env*"]
  },
  {
    id: "robot_io",
    label: "Robot I/O",
    patterns: ["**/rws/**", "**/egm/**", "**/*rapid*.py", "**/*robot*.py", "**/*abb*.py"]
  },
  {
    id: "tests",
    label: "Tests",
    patterns: ["tests/**", "**/test_*.py", "**/*_test.py"]
  },
  {
    id: "docs",
    label: "Docs",
    patterns: ["docs/**", "**/*.md"]
  }
];
```

### 8.2 Import-based inference

If path mapping is uncertain:

- parse Python imports,
- map imported modules to feature blocks,
- infer feature by majority neighbor modules,
- mark low-confidence mapping visibly in the UI.

### 8.3 Manual mapping later

Do not implement target-workspace config files for manual mapping in MVP.

Optional later enhancement:

- import mapping from a user-selected JSON file,
- export mapping only to a user-selected location,
- never default to writing inside the target repository.

---

## 9. Python Import Analysis

Implement a lightweight Python import parser.

### 9.1 Scope

Required:

- parse `.py` files,
- detect `import x`,
- detect `import x as y`,
- detect `from x import y`,
- resolve local modules from workspace paths,
- ignore external stdlib/site-packages modules,
- identify test files,
- identify likely entry points.

Do not execute Python code.

Do not import target project modules.

Do not require the target project to have all dependencies installed.

### 9.2 Entry point heuristics

Mark as entry points when:

- file contains `if __name__ == "__main__"`,
- file is under `scripts/`,
- file is under `launch/`,
- file name contains `main`,
- file name contains `app`,
- file name contains `panel`,
- package metadata indicates an entry point, if readable.

### 9.3 Safety

The parser must be read-only and text-based.

If a file cannot be read or parsed, add a warning to the Output Channel and continue.

---

## 10. Git and Change Detection

### 10.1 Git status

Preferred:

- use VS Code Git extension API if available.

Fallback:

- run `git status --porcelain=v1` in the workspace root using `child_process`.

Requirements:

- handle no-git workspaces,
- handle renamed files,
- handle untracked files,
- handle deleted files,
- handle spaces in file names where practical,
- never run destructive git commands.

### 10.2 File watcher

Use `vscode.workspace.createFileSystemWatcher`.

Watch:

```text
**/*.py
**/*.yaml
**/*.yml
**/*.json
**/*.toml
**/*.md
package.xml
setup.py
pyproject.toml
```

Exclude configured globs.

Debounce refreshes to avoid excessive analysis.

Suggested debounce:

```text
500ms to 1500ms
```

### 10.3 Refresh behavior

When files change:

1. update dirty/changed state,
2. update sidebar tree,
3. if dashboard is open, send updated state to webview,
4. do not steal focus,
5. do not auto-open dashboard unless setting is enabled.

---

## 11. Risk Scoring

Implement simple deterministic risk scoring.

### 11.1 High risk

Mark high risk when a changed file matches:

- config loading,
- environment handling,
- launch/startup,
- safety/collision/zone logic,
- motion planning,
- robot I/O,
- dependency/package metadata,
- files imported by many modules.

### 11.2 Medium risk

Mark medium risk when:

- feature module changed,
- related tests changed,
- UI command/control changed,
- non-leaf module changed.

### 11.3 Low risk

Mark low risk when:

- docs changed,
- isolated helper changed,
- test-only fixture changed,
- file has no incoming dependencies.

### 11.4 Explain every risk

Every risk item must include a short reason.

Example:

```text
High — config_loader.py affects startup configuration and is imported by operator_panel.
```

---

## 12. Webview Dashboard Requirements

### 12.1 Webview structure

Use a single Webview panel with mode-based renderers.

Suggested renderer split:

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

### 12.2 Visual style

Use:

- VS Code CSS variables where possible,
- dark background,
- subtle card borders,
- compact panels,
- clear visual hierarchy,
- badges for risk and file status,
- SVG graph panels,
- responsive layout that works on 1920x1080 and smaller editor sizes.

Do not use external CDNs.

Do not require internet access at runtime.

### 12.3 Graph rendering

MVP graph may be simple SVG.

Required:

- feature nodes,
- module nodes,
- dependency edges,
- highlighted changed nodes,
- risk color classes,
- selected node detail panel,
- simple zoom/layout control UI if practical.

Do not spend too much time on perfect graph layout. The layout must be visually clear and must resemble the mockup panel structure.

### 12.4 Webview security

Implement:

- strict Content Security Policy,
- nonce for scripts,
- no inline script without nonce,
- no remote scripts,
- no external CDN,
- sanitized HTML for file paths/module names,
- message validation between extension and webview.

### 12.5 Webview message protocol

Messages from webview to extension:

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

Messages from extension to webview:

```ts
type ExtensionToWebviewMessage =
  | { type: "state"; state: DashboardState }
  | { type: "error"; message: string }
  | { type: "loading"; message: string };
```

---

## 13. Sidebar Tree Requirements

Implement a `TreeDataProvider`.

The sidebar must show useful information even if the dashboard is closed.

Required root sections:

- Changed Features
- Changed Files
- Impacted Modules
- Suggested Tests
- Baseline
- Actions

Optional root sections:

- Workspace
- Modes

Click behavior:

- clicking a mode opens dashboard and switches to that mode,
- clicking a feature opens dashboard in Feature Focus Mode,
- clicking a changed file opens that file in the editor,
- clicking Capture Baseline runs the command,
- clicking Refresh runs the command.

Empty state:

- if no workspace is open, show “Open a workspace to inspect architecture.”
- if no changes exist, show “No modified files — use Whole Architecture Mode.”
- if no baseline exists, show “No baseline captured.”

---

## 14. Storage and Baseline

### 14.1 Workspace key

Create a stable workspace key from:

- workspace root URI,
- workspace name,
- optionally git remote URL if available.

Hash it before using as a storage filename.

### 14.2 Baseline storage

Store baseline snapshots in `context.globalStorageUri` or `context.storageUri`.

Suggested files inside extension storage only:

```text
baselines/<workspaceKey>.json
snapshots/<workspaceKey>/latest.json
```

These are extension storage paths, not target workspace paths.

### 14.3 Clear cache

Implement command:

```text
Live Architecture Map: Clear Workspace Cache
```

It should delete only extension-owned cache for the current workspace.

---

## 15. Output Channel and Diagnostics

Create an Output Channel:

```text
Live Architecture Map
```

Log:

- activation,
- workspace root,
- scan counts,
- skipped files,
- parser warnings,
- git status failures,
- baseline capture success/failure,
- export destination.

Do not spam the user with notifications.

Use notifications only for:

- baseline captured,
- export completed,
- serious analysis failure,
- no workspace open.

---

## 16. Export Snapshot

Implement export as an explicit user action.

Command:

```text
Live Architecture Map: Export Snapshot
```

Behavior:

1. Open Save Dialog.
2. User chooses a file path.
3. Export current snapshot as JSON.
4. Do not default to target workspace.
5. Do not export automatically.

Optional later:

- export as HTML report,
- export as SVG graph.

---

## 17. Implementation Phases

Implement in phases. Do not jump ahead if a phase has failing compile/tests.

### Phase 0 — Baseline project scaffold

Goal:

Create a working TypeScript VS Code extension project.

Tasks:

- create extension repo files,
- set up TypeScript,
- set up ESLint if practical,
- create `src/extension.ts`,
- create `package.json`,
- create basic commands,
- create launch/task config for Extension Development Host,
- add README,
- add this `plan.md` to the extension repository.

Validation:

```bash
npm install
npm run compile
```

Acceptance:

- project compiles,
- Extension Development Host can launch,
- no target workspace is needed yet.

### Phase 1 — VS Code contribution shell

Goal:

Register the Activity Bar, Sidebar Tree View, commands, settings, and Output Channel.

Tasks:

- add Activity Bar view container,
- add sidebar Tree View,
- add command registrations,
- add configuration schema,
- implement Output Channel,
- implement quiet activation behavior,
- implement dashboard open command with placeholder Webview shell.

Validation:

```bash
npm run compile
```

Manual validation:

- press F5,
- Extension Development Host opens,
- Activity Bar icon appears,
- sidebar appears,
- commands appear in Command Palette.

Acceptance:

- extension activates without errors,
- no dashboard auto-popup by default,
- no files written into inspected workspace.

### Phase 2 — Static mockup dashboard with mock data

Goal:

Reproduce the attached mockup UI using mock data before wiring real repository analysis.

Tasks:

- create `mockDashboardState.ts`,
- implement the full dashboard shell,
- implement Live Changes Mode with mock data,
- implement Whole Architecture Mode with mock data,
- implement Feature Focus Mode with mock data,
- implement Diff Since Baseline Mode with mock data,
- implement mode switching,
- implement graph panels using SVG/HTML/CSS,
- implement changed files table,
- implement risk cards,
- implement validation status cards,
- implement architecture overview/health cards,
- implement baseline diff cards,
- implement loading/empty/error states without breaking layout.

Validation:

```bash
npm run compile
```

Manual validation:

- open dashboard,
- switch through all four modes,
- compare against attached mockup images,
- verify UI is not raw Markdown or raw JSON.

Acceptance:

```text
[ ] Live Changes Mode visually matches the annotated mockup layout.
[ ] Whole Architecture Mode visually matches the architecture mockup layout.
[ ] Feature Focus Mode visually matches the feature focus mockup layout.
[ ] Diff Since Baseline Mode visually matches the baseline diff mockup layout.
[ ] Graphs are visible panels, not text dumps.
[ ] Changed Files table is visible.
[ ] Validation Status row is visible.
[ ] Risk cards are visible.
[ ] Sidebar sections are populated.
[ ] No target workspace files are created.
```

### Phase 3 — Screenshot validation and UI correction loop

Goal:

Prove that the mockup UI exists before implementing deeper backend logic.

Tasks:

- run the extension in Extension Development Host,
- open the dashboard,
- capture or provide screenshots for all four modes if the environment supports it,
- inspect for cropped panels, missing sections, broken layout, unreadable text,
- fix UI issues before proceeding.

Validation:

```bash
npm run compile
```

Manual validation:

```text
[ ] Screenshot or clear validation note for Live Changes Mode
[ ] Screenshot or clear validation note for Whole Architecture Mode
[ ] Screenshot or clear validation note for Feature Focus Mode
[ ] Screenshot or clear validation note for Diff Since Baseline Mode
[ ] No visible cropping at 1920x1080
[ ] The implementation is clearly the mockup dashboard, not a generic dashboard
```

Acceptance:

- UI is accepted as mockup-aligned before backend wiring begins.
- If screenshots cannot be captured, Codex must state exactly why and still provide detailed manual validation notes.

### Phase 4 — Workspace state and storage foundation

Goal:

Implement safe extension-managed state.

Tasks:

- implement workspace key generator,
- implement in-memory dashboard state,
- implement snapshot store,
- implement baseline store,
- implement clear workspace cache command,
- verify no writes to target project.

Validation:

```bash
npm run compile
npm test
```

Acceptance:

- baseline store writes only under extension storage,
- no `.vscode/settings.json` is created in target workspace,
- no target project files are created.

### Phase 5 — Workspace scanner and Python import analyzer

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

Validation:

```bash
npm run compile
npm test
```

Acceptance:

- scanner works on a Python workspace,
- unreadable/unparseable files do not crash extension,
- external dependencies are not treated as workspace modules.

### Phase 6 — Git status and watcher

Goal:

Detect active changes.

Tasks:

- implement Git provider,
- parse changed files,
- implement file watcher,
- debounce refresh,
- update dashboard state,
- update sidebar state.

Validation:

```bash
npm run compile
npm test
```

Manual validation:

- open a git workspace,
- modify a `.py` file,
- see changed file appear,
- revert the file,
- see clean state.

Acceptance:

- Live Changes Mode has current changed files,
- watcher does not auto-open dashboard,
- extension does not run destructive git commands.

### Phase 7 — Feature mapping and risk scoring

Goal:

Map changed files/modules to feature areas and risk cards.

Tasks:

- implement built-in feature patterns,
- map files to features,
- infer feature from import graph when needed,
- implement risk scorer,
- add reasons for risk levels,
- update sidebar Changed Features and Impacted Modules.

Validation:

```bash
npm run compile
npm test
```

Acceptance:

- changed config/motion/safety/robot files are high or medium risk,
- every risk includes a reason,
- unmapped files are shown as “Unmapped / Unknown” instead of hidden.

### Phase 8 — Wire real data into the existing mockup UI

Goal:

Replace mock data with real extension state without changing the mockup layout.

Tasks:

- connect scanner output to `DashboardState`,
- connect git/watcher changed files to `DashboardState`,
- connect feature/risk data to sidebar and Webview,
- keep mock-data fallback for development/demo mode if no workspace is open,
- ensure all four modes still render after real data wiring.

Validation:

```bash
npm run compile
npm test
```

Manual validation:

- clean workspace defaults to Whole Architecture Mode,
- dirty workspace defaults to Live Changes Mode,
- changed files appear in table,
- graphs highlight changed/impacted areas,
- layout remains visually aligned with the mockup.

Acceptance:

- real data appears in the mockup dashboard layout,
- no raw data dumps,
- UI does not regress from Phase 3.

### Phase 9 — Feature Focus real behavior

Goal:

Allow focused inspection of one real feature.

Tasks:

- implement feature selector with real features,
- implement feature detail state,
- render internal modules,
- render incoming/outgoing dependencies,
- render related changed files,
- render related tests.

Validation:

```bash
npm run compile
npm test
```

Acceptance:

- selecting a feature changes the graph and details,
- clicking a feature in sidebar opens Feature Focus Mode,
- unknown/unmapped feature state is handled gracefully.

### Phase 10 — Baseline capture and diff mode

Goal:

Implement structural diff since baseline.

Tasks:

- implement Capture Baseline command,
- persist baseline under extension storage,
- implement graph diff,
- render Diff Since Baseline Mode with real data,
- show no-baseline empty state,
- show baseline timestamp.

Validation:

```bash
npm run compile
npm test
```

Manual validation:

- capture baseline,
- edit/add/delete a file,
- refresh,
- show diff since baseline,
- verify added/removed/changed modules and edges appear.

Acceptance:

- baseline does not touch target workspace,
- diff mode works without git commit,
- no-baseline state is clear.

### Phase 11 — Polish, packaging, and usage docs

Goal:

Make the extension usable by the user.

Tasks:

- improve UI spacing and responsiveness,
- re-check screenshot fidelity against the mockup,
- add README usage guide,
- document development test flow,
- document VSIX packaging flow,
- add known limitations,
- run final validation,
- package `.vsix` if possible.

Validation:

```bash
npm run compile
npm test
npx @vscode/vsce package
```

Manual validation:

- `F5` launches Extension Development Host,
- ABB_ROS2 can be opened in the Extension Development Host,
- sidebar appears,
- dashboard opens,
- Capture Baseline works,
- Live Changes updates,
- Diff Since Baseline works,
- no target workspace files are created.

Acceptance:

- extension is usable as a local VS Code extension,
- `.vsix` can be installed,
- README explains how to test and install,
- UI still resembles the attached mockups.

---

## 18. Validation Checklist

Before reporting completion, run as many of these as the environment supports:

```bash
npm install
npm run compile
npm test
npx @vscode/vsce package
```

If a command is unavailable, report exactly why.

Manual checks:

```text
[ ] Extension Development Host launches with F5
[ ] Activity Bar icon is visible
[ ] Sidebar Tree View is visible
[ ] Dashboard opens through command
[ ] Dashboard is a visual Webview, not Markdown/raw JSON
[ ] Four modes are present
[ ] Live Changes Mode matches the annotated mockup structure
[ ] Whole Architecture Mode works with no modified files
[ ] Feature Focus Mode works
[ ] Capture Baseline works
[ ] Diff Since Baseline works after baseline
[ ] Export asks user for location
[ ] No files are created in the target workspace
[ ] No .vscode/settings.json is created in the target workspace
[ ] Watcher does not steal focus
[ ] Dashboard does not auto-open by default
[ ] Output Channel has useful logs
[ ] Screenshot validation was attempted or explained
```

---

## 19. Done Criteria

The task is complete only when all of these are true:

```text
[ ] A standalone VS Code extension project exists.
[ ] The extension compiles.
[ ] Activity Bar contribution exists.
[ ] Sidebar Tree View exists.
[ ] Webview dashboard exists.
[ ] Dashboard is visual and dark-themed.
[ ] Dashboard visually follows the attached mockup images.
[ ] Live Changes Mode is implemented.
[ ] Whole Architecture Mode is implemented.
[ ] Feature Focus Mode is implemented.
[ ] Diff Since Baseline Mode is implemented.
[ ] Changed files are detected.
[ ] Python import graph is generated.
[ ] Feature mapping works.
[ ] Risk scoring works with explanations.
[ ] Validation Status panel exists in Live Changes Mode.
[ ] Baseline is stored in extension storage only.
[ ] Target workspace is not modified.
[ ] README explains development test and VSIX install flow.
```

---

## 20. User-Facing README Requirements

The README must explain the following.

### 20.1 Development test

```bash
cd ~/tools/vscode-live-architecture-map
npm install
npm run compile
code .
```

Then:

```text
Press F5
Open ABB_ROS2 in the Extension Development Host window
Click the Live Architecture Map Activity Bar icon
Open Dashboard
```

### 20.2 VSIX packaging

```bash
npx @vscode/vsce package
```

### 20.3 Install from VSIX

```bash
code --install-extension live-architecture-map-0.0.1.vsix
```

Or:

```text
Extensions panel
  → ...
  → Install from VSIX...
  → choose live-architecture-map-0.0.1.vsix
```

### 20.4 Normal use

```text
1. Open ABB_ROS2 in VS Code.
2. Open Live Architecture Map from Activity Bar.
3. Use Whole Architecture Mode for the current full structure.
4. Run Capture Baseline before Codex edits.
5. Watch Live Changes Mode while files are edited.
6. Use Diff Since Baseline after edits.
7. Use Feature Focus Mode for detailed review.
```

---

## 21. Important Implementation Notes for Codex

- Read this `plan.md` first.
- Inspect the attached mockup images before implementation.
- Treat UI fidelity as a core requirement, not future polish.
- Build the static mockup UI with mock data before real analyzer wiring.
- Keep the first implementation small but visually complete.
- Prefer TypeScript types and pure functions for analyzers.
- Do not introduce heavy dependencies unless clearly justified.
- Avoid network access and external runtime assets.
- Avoid React unless needed; plain TypeScript + HTML + CSS + SVG is acceptable for MVP.
- Do not use raw Markdown as the dashboard UI.
- Do not silently write files into the target workspace.
- Report all skipped validations clearly.
- If tests fail, stop and report the failure before continuing.
- If screenshot capture is unavailable, say so explicitly and provide manual validation details.
- If a feature is too large, complete the earlier phases first and leave clear TODOs for later phases.

---

## 22. Recommended Codex Execution Strategy

Do not ask Codex to implement all phases in one pass.

### First Codex pass — UI foundation only

Use this first prompt after placing this file in the extension repository and attaching the mockup images:

```text
Read plan.md and inspect the attached mockup images.

Implement Phase 0 through Phase 3 only.

Goal:
Create a standalone VS Code extension named Live Architecture Map and reproduce the attached mockup UI using static mock data.

Non-negotiable:
- The attached mockup images are the UI source of truth.
- Do not create a generic dashboard.
- Do not implement the dashboard as raw Markdown, raw JSON, or text-only panels.
- Use a real VS Code Activity Bar contribution, Sidebar Tree View, and Webview dashboard.
- Implement all four modes visually: Live Changes, Whole Architecture, Feature Focus, Diff Since Baseline.
- Use mockDashboardState first; do not wire real repository analysis yet.
- Do not modify any inspected target workspace.
- Store extension data only in extension-managed storage.

After implementation, run:
npm install
npm run compile
npm test

Then launch the Extension Development Host if possible and provide screenshots or detailed validation notes for:
1. Live Changes Mode
2. Whole Architecture Mode
3. Feature Focus Mode
4. Diff Since Baseline Mode

If any command fails, stop and report the exact failure.
```

### Second Codex pass — real analysis wiring

Use after the UI shell has been visually accepted:

```text
Read plan.md again.

Implement Phase 4 through Phase 8.

Keep the existing mockup-matching dashboard layout unchanged.
Replace mock data with real extension state where available:
- extension-managed storage,
- workspace scanner,
- Python import analyzer,
- git status,
- file watcher,
- feature mapping,
- risk scoring.

The UI must not regress from the accepted mockup layout.

After implementation, run:
npm run compile
npm test

Then validate with a Python workspace:
- clean workspace shows Whole Architecture Mode,
- dirty workspace shows Live Changes Mode,
- changed files appear in the table and sidebar,
- feature/risk cards update,
- no files are written into the inspected target workspace.
```

### Third Codex pass — baseline diff and polish

Use after real analysis wiring works:

```text
Read plan.md again.

Implement Phase 9 through Phase 11.

Focus on:
- Feature Focus Mode with real feature data,
- Capture Baseline,
- Diff Since Baseline with real graph diff,
- export snapshot,
- README usage guide,
- VSIX packaging,
- final UI polish against the attached mockups.

After implementation, run:
npm run compile
npm test
npx @vscode/vsce package

Provide final validation notes and screenshots if available.
```

---

## 23. Final Acceptance Summary

The project is successful when the user can:

```text
1. Open VS Code.
2. Open ABB_ROS2 or another Python workspace.
3. See the Live Architecture Map icon in the Activity Bar.
4. Open the Live Architecture Map Sidebar.
5. Open the Webview dashboard.
6. See a dashboard that visually matches the attached mockups.
7. View Whole Architecture Mode when no changes are active.
8. Capture a baseline before Codex edits.
9. Watch Live Changes Mode while Codex edits files.
10. Use Feature Focus Mode to inspect one function area.
11. Use Diff Since Baseline Mode after Codex edits.
12. Confirm no files were created in the inspected target workspace.
```
