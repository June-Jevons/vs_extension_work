# react_plan_v7.md

## 0. Purpose

This file is the implementation control plan for the native Ubuntu 22.04 migration of **Live Architecture Map**.

This v7 plan supersedes `react_plan_v1.md`, `react_plan_v2.md`, `react_plan_v3.md`, `react_plan_v4.md`, `react_plan_v5.md`, and `react_plan_v6.md` for implementation.

v7 keeps the v6 architecture and hardening requirements, but changes execution behavior:

```text
Codex should autonomously fix code/config/test failures inside each active pass.
Codex should stop only for true environment, permission, system dependency, or user-action blockers.
```

The goal is to avoid stopping after every normal implementation error while still keeping the no-fallback policy.

---

## 1. Main Rule: Autonomous Within A Pass

For each active pass, Codex must:

```text
1. Implement the checkpoint tasks.
2. Run the required validation commands.
3. If validation fails because of code/config/test issues:
   - inspect the failure;
   - identify the root cause;
   - fix the repository code/config/tests;
   - rerun the same validation;
   - repeat within reasonable scope.
4. Report only when:
   - the pass validation succeeds, or
   - a true blocker remains that cannot be fixed safely inside the repository.
```

Codex must not stop at the first ordinary compile/test/config failure.

---

## 2. True Blockers That Still Require Stopping

Stop and report only for blockers Codex cannot safely resolve inside the repository:

- `node`, `npm`, `git`, `code`, or `unzip` missing from PATH after the user says the environment is installed;
- wrong native environment, such as WSL/Windows path usage;
- missing system package requiring sudo/user approval;
- sudo unavailable when a required system package must be installed;
- network/package registry unavailable;
- permission errors outside the repository;
- VS Code CLI cannot launch because of system/display/session issues;
- no desktop display and no explicit headless command requested;
- `/home/jevons/ABB_ROS2` missing for manual/smoke validation;
- any failure that requires changing the user environment rather than repository files.

When stopping, provide exact command output and the next command the user should run.

---

## 3. Failures Codex Should Fix Without Asking

Within the active pass, Codex should fix these autonomously:

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

Do not ask the user before fixing these within the active pass.

---

## 4. No-Fallback Policy Still Applies

Autonomous fixing does not mean adding fallback behavior.

Do not fix failures by:

- silently falling back to old string/SVG renderer;
- silently falling back to mock dashboard data;
- silently falling back from ELK to custom routing;
- silently falling back from VS Code Git API to Git CLI;
- silently falling back from the selected scanner backend to another backend;
- hiding missing bundle errors;
- weakening tests to pass;
- deleting tests instead of updating them;
- running hidden `npm install` or `npm ci` from F5/tasks;
- silently switching to headless validation when normal desktop validation fails.

Fix the root cause or report a true blocker.

---

## 5. Native Ubuntu 22.04 Environment Policy

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

---

## 6. Environment Verification

The user has installed Node/npm and verified versions. Codex must still record versions at the start of Pass 1.

Run:

```bash
uname -a
lsb_release -a || cat /etc/os-release
node --version
npm --version
git --version
code --version
unzip -v | head -n 2
```

If these pass, continue Pass 1.

If any are missing, stop and report the missing dependency explicitly.

---

## 7. Toolchain Reproducibility

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

---

## 8. Mandatory Ubuntu Doctor

Add:

```text
scripts/doctor-ubuntu.ts
```

Add npm script:

```json
"doctor:ubuntu": "tsc -p ./tsconfig.scripts.json && node ./out-scripts/scripts/doctor-ubuntu.js"
```

Doctor responsibilities:

- verify Linux platform;
- verify Node/npm versions satisfy `package.json` engines;
- verify `git`, `code`, and `unzip` are available;
- verify repository path is native Linux, not WSL UNC;
- verify target workspace path exists if configured;
- verify `.vscode/launch.json` and `.vscode/tasks.json` have no Windows/WSL/PowerShell entries;
- verify `package-lock.json` exists after dependency migration;
- verify `media/webview` bundle exists after compile when requested;
- print actionable failures.

Doctor must not install dependencies, rewrite files, or silently fix the environment.

---

## 9. Pass 1 Scope: Ubuntu Environment, F5, Docs, Path Tests

Pass 1 includes only Checkpoint 0 and Checkpoint A.

Tasks:

- verify native Ubuntu environment;
- record Node/npm/Git/VS Code/unzip versions;
- add `.nvmrc`;
- add `package.json` engines;
- update `.vscode/launch.json` to native Ubuntu F5 config;
- update `.vscode/tasks.json` to npm-only tasks;
- remove hidden install logic from tasks;
- update README/docs to Ubuntu Native workflow;
- add/update Linux-native path kind tests;
- add/update storage safety tests for `/home/jevons/ABB_ROS2`;
- add `.vscode` config validation tests;
- add `doctor:ubuntu` if practical;
- run validation and fix code/config/test failures within Pass 1.

Required validation:

```bash
npm install
npm run compile
npm run test:unit
```

If `doctor:ubuntu` is implemented:

```bash
npm run doctor:ubuntu
```

Pass 1 success criteria:

- `.vscode/launch.json` contains no Windows/WSL paths;
- `.vscode/tasks.json` contains no `powershell.exe` and no hidden install commands;
- F5 preLaunchTask is `npm: compile`;
- README active workflow is Ubuntu Native;
- path kind tests include `linux-native`;
- storage tests include native Linux inspected workspace path;
- compile and unit tests pass.

Stop after Pass 1 and report results. Do not proceed to React/Vite migration unless explicitly asked.

---

## 10. Later Passes Summary

Use the same autonomous-within-pass policy for later passes.

```text
Pass 2: React/Vite build pipeline and webview shell.
Pass 3: React dashboard frame, graph models, ELK adapter, React Flow graph migration.
Pass 4: Performance timing, no-fallback scanner/Git path, file cache, incremental refresh.
Pass 5: Full mode migration, VS Code integration, VSIX packaging, installed smoke test.
```

Do not start a later pass unless the user explicitly asks.

---

## 11. Final Report Format For Each Pass

Codex final response for each pass must include:

```text
Environment
- native Ubuntu confirmation
- node --version
- npm --version
- code --version
- git --version

Pass scope
- which pass/checkpoints were attempted

Changes
- files added/modified/removed
- key implementation decisions

Autonomous fixes performed
- compile/test/config failures encountered
- root causes
- fixes made
- validation reruns

Validation
- each command run
- pass/fail result

Remaining blockers
- only true environment/system/user-action blockers

Safety
- confirm no inspected target workspace files were written
```
