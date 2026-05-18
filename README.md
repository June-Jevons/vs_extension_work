# Live Architecture Map

Live Architecture Map is a Windows Native VS Code extension foundation for a visual architecture and change-impact dashboard for Python and ROS2-style workspaces.

This repository is the extension project. It is not a script inside the inspected workspace.

## Windows Native Workflow

Run from PowerShell:

```powershell
cd C:\Users\Junekim\Work\99.vs_workspace\vs_extension_work
npm install
npm run compile
npm run visual:render
npm run visual:test
npm run test:vscode
npm run validate
npm run package
```

This is not a WSL workflow. Do not run validation from `/home/...`, Ubuntu, Remote-WSL, or a WSL-backed VS Code window.

`npm run test:vscode` launches VS Code with isolated test user-data and extensions directories under `.vscode-test/isolated/` so repeated Windows test runs do not share a profile mutex.

## Visual Validation Artifacts

`artifacts/` is ignored and generated during validation.

Generated standalone HTML and screenshots are written under:

```text
artifacts/ui/
```

Open the generated `.png` files to inspect the dashboard modes:

```text
artifacts/ui/live-changes.png
artifacts/ui/whole-architecture.png
artifacts/ui/feature-focus.png
artifacts/ui/diff-since-baseline.png
```

The validation report is written to:

```text
artifacts/validation-report.md
```

## Extension Development Host

Run the extension against the inspected Python workspace with isolated VS Code state from Windows Native VS Code:

```powershell
& "$env:LOCALAPPDATA\Programs\Microsoft VS Code\bin\code.cmd" "\\wsl.localhost\Ubuntu-22.04\home\jevons\ABB_ROS2" `
  --new-window `
  --extensionDevelopmentPath=C:\Users\Junekim\Work\99.vs_workspace\vs_extension_work `
  --user-data-dir=C:\tmp\vscode-lam-user-data `
  --extensions-dir=C:\tmp\vscode-lam-extensions `
  --disable-gpu
```

The ABB_ROS2 target path is a WSL UNC path, but it must be opened from Windows Native VS Code. Do not use Remote-WSL for validation.

The inspected workspace is read-only by default. The extension uses read-only scanning plus extension-managed storage and does not write `.vscode/settings.json`, `architecture/`, `docs/live/`, metadata, caches, source files, tests, or git state into the inspected workspace.

## Real Workspace Behavior

Open **Live Architecture Map: Open Dashboard** from the Command Palette or the Activity Bar view. The dashboard subtitle reports one of:

- `Live workspace data` when the scanner found real Python modules.
- `Loading workspace data` while refresh is running.
- `Analysis error` if analysis fails.
- `Mock data` only when the extension is using its bundled fallback/sample state.

The diagnostics strip shows the workspace URI, source, Python file count, module count, dependency count, changed file count, git branch, git status source, scanner status, fallback reason, baseline timestamp, and last updated time.

Open **View: Toggle Output**, choose **Live Architecture Map**, and inspect activation, workspace path, UNC/WSL detection, scanner counts, git source, changed file count, and fallback reasons.

## Toolbar Actions

- **Refresh** rescans the active workspace and updates the sidebar and dashboard.
- **Export** opens a Save Dialog and writes the current snapshot as JSON only after you choose a destination. The default export location is outside the inspected workspace.
- **Configure** opens VS Code settings filtered to `liveArchitectureMap`.
- **Timeline** focuses the structural timeline when it is visible, or explains that it appears in Diff Since Baseline mode after a baseline exists.
- **Capture Baseline** stores the baseline in extension-managed VS Code storage only.
- **Clear Workspace Cache** clears extension-owned cached snapshot/baseline state only.

## Baselines and Diffs

Use **Live Architecture Map: Capture Baseline** to capture the current architecture snapshot. It is stored via VS Code extension storage, not in the inspected repository. **Diff Since Baseline** compares the current snapshot against that baseline and shows added, removed, and changed modules and dependencies where the scanner can infer them.

## Package and Install

Build a VSIX:

```powershell
npm run package
```

Install the generated VSIX:

```powershell
& "$env:LOCALAPPDATA\Programs\Microsoft VS Code\bin\code.cmd" --install-extension .\live-architecture-map-0.0.1.vsix
```
