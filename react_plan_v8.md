# react_plan_v8.md

## 0. Purpose

This file is the single source of truth for migrating **Live Architecture Map** to the long-term React webview architecture on **native Ubuntu 22.04**, while improving analysis performance, removing fallback-based behavior, fixing F5/debug configuration, and making the development environment reproducible.

This v8 plan supersedes `react_plan_v1.md`, `react_plan_v2.md`, `react_plan_v3.md`, `react_plan_v4.md`, `react_plan_v5.md`, `react_plan_v6.md`, and `react_plan_v7.md` for implementation.

Use this file only unless the user explicitly asks otherwise.

v8 is a merged complete plan:

- It keeps the full implementation scope and hardening from v6.
- It keeps the autonomous-within-pass execution policy from v7.
- It is intended to be usable alone without opening older plan files.

---

## 1. Top-Level Goals

1. Replace the current hand-built HTML/SVG dashboard with a Vite-built React webview app.
2. Replace custom graph rendering/routing with React Flow + ELK.
3. Improve analysis performance using watcher events, file-level cache, graph model cache, layout cache, and Git status enrichment.
4. Remove fallback-style behavior that hides errors and makes debugging difficult.
5. Fix F5/debug configuration for native Ubuntu 22.04.
6. Make the toolchain reproducible with Node policy, lockfile, doctor checks, and repeatable validation.
7. Keep inspected workspaces read-only.
8. Validate everything on native Ubuntu 22.04.

Target long-term flow:

```text
VS Code extension host on native Ubuntu 22.04
  -> deterministic Linux-native scanner backend
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

## 2. Execution Policy: Autonomous Within Each Pass

Codex must not stop at the first normal implementation failure inside a pass.

For each active pass:

```text
1. Implement the checkpoint tasks.
2. Run required validation.
3. If validation fails because of repository code/config/test issues:
   - inspect failure;
   - identify root cause;
   - fix repository code/config/tests;
   - rerun validation;
   - repeat within reasonable scope.
4. Report only when:
   - pass validation succeeds, or
   - a true blocker remains outside safe repository control.
```

Codex should autonomously fix these within the active pass:

- TypeScript compile errors;
- broken imports or missing exports;
- broken npm scripts;
- invalid Vite config;
- invalid React/React Flow/ELK integration;
- invalid `.vscode/launch.json` or `.vscode/tasks.json`;
- README/docs still referencing Windows/WSL active workflow;
- stale tests caused by intentional behavior changes;
- missing tests required by the active checkpoint;
- Playwright selector failures caused by intended DOM migration;
- package/VSIX verification path mistakes;
- missing required repository files;
- stale fallback code in the live path;
- stale `PowerShell`, `powershell.exe`, `code.cmd`, `C:\`, `\\wsl.localhost`, or `\\wsl$` references in active code/docs/tests;
- React Flow CSS import omissions;
- missing `package-lock.json` after dependencies are changed;
- doctor script failures caused by repository config rather than system environment.

Stop and report only for true blockers Codex cannot safely fix inside the repository:

- `node`, `npm`, `git`, `code`, or `unzip` missing from PATH after the user says the environment is installed;
- wrong native environment, such as WSL/Windows path usage;
- missing system package requiring sudo/user approval;
- sudo unavailable when a required system package must be installed;
- network/package registry unavailable;
- permission errors outside the repository;
- VS Code CLI cannot launch because of system/display/session issues;
- no desktop display and no explicit headless command requested;
- `/home/jevons/ABB_ROS2` missing for manual/smoke validation;
- any failure requiring changes to the user environment rather than repository files.

When stopping, report exact command output and the next command the user should run.

---

## 3. No-Fallback Policy

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
- Do not silently switch to headless validation when normal desktop validation fails.

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
- Headless validation may be explicitly selected with a separate command.

---

## 4. Native Ubuntu 22.04 Environment Policy

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

## 5. First-Time Ubuntu Setup Requirements

Because this is a new native Ubuntu environment, verify prerequisites before implementation.

Required system tools:

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

These setup commands are explicit. They must not be hidden inside F5/tasks.

Verify tools:

```bash
uname -a
lsb_release -a || cat /etc/os-release
node --version
npm --version
git --version
code --version
unzip -v | head -n 2
```

If any required tool is missing, stop and report the missing dependency explicitly.

---

## 6. Toolchain Reproducibility

Use Node 20 LTS or newer unless tooling proves a stricter requirement.

Required files/metadata:

```text
.nvmrc              # content: 20
package.json engines.node >=20
package.json engines.npm >=10
package-lock.json committed after dependency changes
```

Recommended `package.json` entry:

```json
"engines": {
  "node": ">=20",
  "npm": ">=10"
}
```

Dependency policy:

- Use `npm install` when intentionally changing dependencies or the lockfile.
- Use `npm ci` for repeatable validation after `package-lock.json` exists.
- Do not run hidden `npm install` or `npm ci` from F5 or VS Code tasks.

Playwright/browser setup:

```bash
npx playwright install --with-deps chromium
```

If system dependency installation is not allowed:

```bash
npx playwright install chromium
```

If browser/system libraries are missing, report the exact error. Do not replace Playwright validation with mock-only screenshots.

---

## 7. Mandatory Ubuntu Doctor

Add:

```text
scripts/doctor-ubuntu.ts
```

Add npm script:

```json
"doctor:ubuntu": "tsc -p ./tsconfig.scripts.json && node ./out-scripts/scripts/doctor-ubuntu.js"
```

Doctor responsibilities:

- verify `process.platform === 'linux'`;
- verify Node and npm versions satisfy `package.json` engines;
- verify `git`, `code`, and `unzip` are available;
- verify repository path is native Linux, not WSL UNC;
- verify target workspace path exists if configured;
- verify `.vscode/launch.json` and `.vscode/tasks.json` have no Windows/WSL/PowerShell entries;
- verify `package-lock.json` exists after dependency migration;
- verify `media/webview` bundle exists after compile when requested;
- print actionable failures.

Doctor must not install dependencies, rewrite files, or silently fix the environment.

---

## 8. Existing Ubuntu Migration Issues To Fix

### 8.1 README / docs

Update README and docs:

- Replace top-level workflow with Native Ubuntu 22.04 workflow.
- Replace PowerShell code blocks with Bash code blocks.
- Replace `C:\...` with `/home/jevons/...` examples.
- Replace `code.cmd` with `code`.
- Replace `\\wsl.localhost\...` with `/home/jevons/ABB_ROS2`.
- Replace WSL UNC validation text with native Linux path validation.
- Replace fallback wording with explicit error/unavailable state wording.
- Add first-time Ubuntu setup section or `docs/ubuntu_setup.md`.
- Active docs must mention `npm ci` as repeatable install after lockfile exists.

### 8.2 `.vscode/launch.json`

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
- F5 opens `/home/jevons/ABB_ROS2` or a clearly documented Linux target.
- F5 does not perform hidden dependency installation.
- F5 prelaunch runs compile only and fails clearly if dependencies are missing.

### 8.3 `.vscode/tasks.json`

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
- Missing `node_modules` fails explicitly.

### 8.4 Optional `.vscode/settings.json`

If added, keep Linux-safe only:

```json
{
  "npm.packageManager": "npm",
  "typescript.tsdk": "node_modules/typescript/lib",
  "terminal.integrated.defaultProfile.linux": "bash"
}
```

### 8.5 Path kind and storage tests

Required updates:

- `describePathKind` must support native Linux paths explicitly, for example `linux-native`.
- Active Ubuntu tests must use Linux-native paths.
- Storage safety tests must include `/home/jevons/ABB_ROS2` as inspected workspace path.
- Extension-managed storage safety must be tested against native Linux VS Code storage paths.
- Tests must confirm inspected workspace path itself is not considered extension-managed storage.

Example expectations:

```text
/home/jevons/ABB_ROS2                       -> linux-native
/home/jevons/.config/Code/User/globalStorage/local-tools.live-architecture-map -> extension-managed storage
/home/jevons/ABB_ROS2/.vscode               -> not extension-managed storage
```

---

## 9. Target Stack

Runtime dependencies:

```bash
npm install react react-dom @xyflow/react elkjs
```

Development dependencies:

```bash
npm install -D vite @vitejs/plugin-react @types/react @types/react-dom
```

Optional only if stable:

```bash
npm install -D vitest jsdom
```

Do not add D3, Cytoscape, Mermaid, Graphviz, canvas rendering, or large state management libraries in this pass.

React Flow CSS requirement:

- Import `@xyflow/react/dist/style.css` once from the webview app entry or global stylesheet path.
- Do not rely on CDN styles.

---

## 10. Target Architecture

Extension host owns:

- VS Code activation and command registration;
- deterministic Linux-native scanner backend selection;
- workspace file indexing;
- file-level analysis cache;
- Git status enrichment through VS Code Git API;
- Python import/dependency graph building;
- feature classification;
- risk scoring;
- baseline and snapshot storage;
- dashboard state production;
- webview message handling;
- export snapshot command;
- webview asset URI generation;
- performance timing collection.

React webview owns:

- dashboard layout;
- mode tabs and actions;
- React Flow graph canvas;
- ELK layout through a pure adapter;
- graph controls;
- inspector/selection UI;
- standalone visual render mode;
- webview-side layout cache.

Do not put VS Code API calls inside React components. Use `vscodeApi.ts` only.

---

## 11. Performance Architecture

### 11.1 Watcher/cache vs Git split

```text
Watcher + file cache
  -> fast path for real-time incremental analysis

Git provider
  -> semantic changed-file status and branch information
```

Do not use Git as the only real-time change detector.
Do not use watcher alone as the semantic source for modified/added/deleted/staged/untracked status.

### 11.2 File-level analysis cache

Create `src/core/fileAnalysisCache.ts`.

Cache key:

```text
schemaVersion + workspaceKey + relativePath + mtime + size + optional content hash
```

Rules:

- Cache schema version is mandatory.
- Read/parse a file only when cache key changed.
- Deleted files remove cache entries.
- Cache must not be written into inspected workspace.
- Cache corruption/incompatibility becomes explicit invalidation/error state.

### 11.3 Workspace index

Create `src/core/workspaceIndex.ts`.

Full rebuild only for:

- first workspace open;
- manual full refresh;
- branch change;
- settings/exclude globs change;
- cache schema version change;
- too many changed paths in one batch;
- explicit cache invalidation command.

### 11.4 Import resolver index

Create `src/graph/importResolverIndex.ts` with exact id, suffix, parent package, top-level package, and reverse dependency indexes.

### 11.5 Git provider without fallback

Target behavior:

- Use VS Code Git API as selected Git provider.
- If unavailable, return explicit unavailable state and diagnostic reason.
- Do not automatically call Git CLI.

### 11.6 Deterministic native Linux scanner backend

Native Ubuntu default:

```text
selected scanner backend: vscodeFindFiles
path kind: linux-native
```

Do not auto-switch to another scanner backend after failure.

### 11.7 Performance diagnostics and budgets

Timing phases:

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
- ELK layout;
- cache write;
- total refresh.

Always report numbers. Use conservative thresholds only when stable.

---

## 12. Build System Plan

Add/update scripts:

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
    "validate:full": "npm run doctor:ubuntu && npm run validate && npm run test:vscode && npm run package && npm run verify:vsix",
    "package": "npm run compile && vsce package",
    "doctor:ubuntu": "tsc -p ./tsconfig.scripts.json && node ./out-scripts/scripts/doctor-ubuntu.js",
    "verify:vsix": "tsc -p ./tsconfig.scripts.json && node ./out-scripts/scripts/verify-vsix-contents.js"
  }
}
```

Rules:

- `test:vscode:headless` is explicit only.
- Do not silently use headless mode when normal `test:vscode` fails.

---

## 13. Webview and Graph Plan

Implement:

- Vite config and React app under `src/webview-app`;
- `src/webview/webviewAssets.ts` manifest loader;
- strict CSP webview shell;
- message handshake;
- all four dashboard modes;
- graph view model builders;
- React Flow graph canvas;
- custom feature/module/summary nodes;
- pure ELK adapter;
- graph geometry tests;
- layout cache.

Missing bundle behavior:

- Show explicit error page.
- Do not show mock dashboard data.
- Do not use old renderer.

---

## 14. Legacy and Fallback Removal Rules

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

## 15. VSIX and Packaging Requirements

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
- `package-lock.json` should be committed to the repo but may be excluded from packaged VSIX if desired.

VSIX verification script must verify:

- `extension/package.json`;
- `extension/out/extension.js`;
- webview JavaScript asset;
- webview CSS asset if emitted;
- Vite manifest;
- Activity Bar icon.

---

## 16. CI / Repeatability

Add `.github/workflows/ubuntu-ci.yml` if practical.

Recommended CI jobs:

- setup Node 20;
- `npm ci`;
- `npx playwright install --with-deps chromium`;
- `npm run doctor:ubuntu` where possible;
- `npm run compile`;
- `npm run test:unit`;
- `npm run visual:render`;
- `npm run visual:test`;
- `xvfb-run -a npm run test:vscode` if stable;
- `npm run package`;
- `npm run verify:vsix`.

If VS Code integration is unstable in CI, document it as optional/manual CI, but local Ubuntu validation must still run it.

---

## 17. Test Fixture Workspace

Add a small fixture workspace:

```text
test/fixtures/python-workspace/
  src/app/main.py
  src/app/config.py
  src/app/robot_io.py
  src/app/motion/planner.py
  tests/test_planner.py
  pyproject.toml
```

Use it for deterministic scanner/graph/cache tests.

Rules:

- Automated tests should not require `/home/jevons/ABB_ROS2`.
- Real ABB_ROS2 remains manual/smoke validation target.
- Fixture must be small and committed.

---

## 18. Implementation Checkpoints

### Checkpoint 0 — Ubuntu environment bootstrap

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

If implemented:

```bash
npm run doctor:ubuntu
```

### Checkpoint A — Ubuntu `.vscode`, README, path tests

Tasks:

- Update `.vscode/launch.json`.
- Update `.vscode/tasks.json`.
- Update README/docs to Ubuntu Native.
- Add/update Linux path kind/storage tests.
- Add `.nvmrc`, optional `.node-version`, `package.json engines`.

Validation:

```bash
npm install
npm run compile
npm run test:unit
```

### Checkpoint B — React/Vite build pipeline

Tasks:

- Install React/React Flow/ELK/Vite dependencies.
- Commit `package-lock.json`.
- Add Vite config.
- Add minimal React app.
- Add compile scripts.

Validation:

```bash
npm ci
npm run compile
```

### Checkpoint C — React webview shell and messaging

Validation:

```bash
npm run compile
npm run test:unit
```

### Checkpoint D — React dashboard frame

Validation:

```bash
npm run compile
npm run test:unit
npm run visual:render
npm run visual:test
```

### Checkpoint E — Graph view models and ELK adapter

Validation:

```bash
npm run compile
npm run test:unit
```

### Checkpoint F — React Flow graph migration

Validation:

```bash
npm run compile
npm run test:unit
npm run visual:render
npm run visual:test
```

### Checkpoint G — Performance timing and deterministic no-fallback scanner/Git path

Validation:

```bash
npm run compile
npm run test:unit
```

### Checkpoint H — File-level cache and incremental refresh

Validation:

```bash
npm run compile
npm run test:unit
npm run visual:render
npm run visual:test
```

### Checkpoint I — Full dashboard mode migration

Validation:

```bash
npm run compile
npm run test:unit
npm run visual:render
npm run visual:test
npm run test:vscode
```

### Checkpoint J — Package, VSIX, installed extension validation

Validation:

```bash
npm run package
npm run verify:vsix
```

Installed smoke test:

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

## 19. Required Tests

Add/update tests:

```text
test/suite/ubuntuPathKind.test.ts
test/suite/vscodeConfigUbuntu.test.ts
test/suite/doctorUbuntu.test.ts
test/suite/graphViews.test.ts
test/suite/graphGeometry.test.ts
test/suite/messageProtocol.test.ts
test/suite/analysisTiming.test.ts
test/suite/fileAnalysisCache.test.ts
test/suite/workspaceIndex.test.ts
test/suite/importResolverIndex.test.ts
test/suite/gitProvider.test.ts
test/suite/scannerBackendSelection.test.ts
```

Required assertions:

- Native Linux paths are detected as `linux-native`.
- `.vscode` debug/tasks contain no Windows/WSL/PowerShell paths.
- F5 preLaunch task is `npm: compile`.
- `package.json` engines exist.
- `.nvmrc` exists.
- Git unavailable state is explicit.
- Scanner backend selection is deterministic.
- File cache invalidates changed/deleted files.
- Incremental update does not reparse unchanged files.
- Timing summary records expected phases.
- Graph view models are valid.
- ELK adapter returns finite positions.
- Geometry tests catch edge-through-node defects.

Playwright visual tests must check:

- Standalone HTML loads built React bundle.
- Each mode renders expected panels.
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

## 20. Acceptance Criteria

Migration is complete only when all are true:

- Native Ubuntu 22.04 workflow was used.
- Node version policy is declared in `.nvmrc` and `package.json` engines.
- `package-lock.json` is committed after dependency changes.
- README active workflow is Ubuntu Native, not Windows/WSL.
- `.vscode/launch.json` uses Linux paths.
- `.vscode/tasks.json` uses npm tasks only and no `powershell.exe`.
- No Windows, PowerShell, WSL, WSL UNC, or Remote-WSL workflow remains in active instructions/tests.
- React/Vite/React Flow/ELK dependencies are in correct dependency groups.
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
- VS Code integration tests pass or limitations are documented.
- `npm run package` succeeds.
- `npm run verify:vsix` succeeds.
- Installed VSIX smoke test confirms React dashboard loads from packaged assets on native Ubuntu.
- Ubuntu CI exists or any CI omission is explicitly justified.

---

## 21. Required Validation Commands

Run from native Ubuntu 22.04 Bash shell:

```bash
cd /home/jevons/vs_extension_work
npm install
npx playwright install --with-deps chromium
npm run doctor:ubuntu
npm run compile
npm run test:unit
npm run visual:render
npm run visual:test
npm run test:vscode
npm run validate
npm run package
npm run verify:vsix
npm run validate:full
```

After lockfile exists and dependencies are not being changed, use:

```bash
npm ci
```

If no desktop display is available and headless mode is explicitly selected:

```bash
npm run test:vscode:headless
```

Do not run implementation or validation from WSL.

---

## 22. Final Report Format

Codex final response must include:

```text
Environment
- Confirm native Ubuntu 22.04 workflow was used
- node --version
- npm --version
- code --version
- git --version
- Whether desktop or explicit headless mode was used

Toolchain
- .nvmrc value
- package.json engines
- package-lock.json status
- npm install/npm ci usage

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
- Checkpoint 0 through J: pass/fail and notes

Validation
- npm install: pass/fail
- npx playwright install --with-deps chromium: pass/fail
- npm run doctor:ubuntu: pass/fail
- npm run compile: pass/fail
- npm run test:unit: pass/fail
- npm run visual:render: pass/fail
- npm run visual:test: pass/fail
- npm run test:vscode: pass/fail
- npm run validate: pass/fail
- npm run package: pass/fail
- npm run verify:vsix: pass/fail
- npm run validate:full: pass/fail

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

CI
- Ubuntu CI added: yes/no
- CI commands covered
- Any CI omissions and why

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

## 23. Execution Guidance

Do not complete the whole migration in one unreviewed pass.

Recommended Codex execution passes:

```text
Pass 1: Checkpoint 0 + A
  Ubuntu environment, .vscode, README/docs, path tests, Node policy.

Pass 2: Checkpoint B + C
  React/Vite build pipeline and webview shell.

Pass 3: Checkpoint D + E + F
  React dashboard frame, graph models, ELK adapter, React Flow graph migration.

Pass 4: Checkpoint G + H
  Performance timing, no-fallback scanner/Git path, file cache, incremental refresh.

Pass 5: Checkpoint I + J
  Full mode migration, VS Code integration, VSIX packaging, installed smoke test.
```

Within each pass, Codex should autonomously fix code/config/test failures and rerun validation. Stop only for true environment blockers or permission issues outside the repository.
