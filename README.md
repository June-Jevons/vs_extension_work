# Live Architecture Map

Live Architecture Map is a Windows Native VS Code extension for visually inspecting Python and ROS2-style workspaces. It renders a real VS Code Activity Bar view, sidebar tree, and editor webview dashboard with live workspace scanning, git status, baselines, and baseline diffs.

This repository is the extension project. It is not a script inside the inspected workspace.

## Windows Native Workflow

Run from PowerShell:

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

This is not a WSL workflow. Do not run implementation or validation from `/home/...`, Ubuntu, Remote-WSL, or a WSL-backed VS Code window.

Use Windows Native VS Code through:

```powershell
& "$env:LOCALAPPDATA\Programs\Microsoft VS Code\bin\code.cmd"
```

## Run From Source

Launch the Extension Development Host against the ABB_ROS2 UNC workspace from Windows Native VS Code:

```powershell
& "$env:LOCALAPPDATA\Programs\Microsoft VS Code\bin\code.cmd" "\\wsl.localhost\Ubuntu-22.04\home\jevons\ABB_ROS2" `
  --new-window `
  --extensionDevelopmentPath=C:\Users\Junekim\Work\99.vs_workspace\vs_extension_work `
  --user-data-dir=C:\tmp\vscode-lam-user-data `
  --extensions-dir=C:\tmp\vscode-lam-extensions `
  --disable-gpu
```

The target path is a WSL UNC path, but the VS Code process must be Windows Native. Do not use Remote-WSL for this validation.

## Validate ABB_ROS2

In the launched VS Code window:

- Confirm the Live Architecture Map Activity Bar icon and sidebar are visible.
- Run **Live Architecture Map: Open Dashboard** from the Command Palette.
- Confirm the dashboard reports `Live workspace data`.
- Confirm Python file, module, dependency, changed file, git branch, git status source, scanner, path type, baseline, and updated diagnostics are visible.
- Use **Refresh**, **Configure**, **Timeline**, **Capture Baseline**, **Diff Since Baseline**, and **Export Snapshot** from the dashboard or Command Palette.
- Confirm no files are created in `\\wsl.localhost\Ubuntu-22.04\home\jevons\ABB_ROS2`.

Open **View: Toggle Output**, choose **Live Architecture Map**, and inspect activation, workspace path, UNC/WSL detection, scanner counts, git source, changed file count, and fallback reasons.

## Visual Artifacts

`artifacts/` is ignored and generated during validation.

Generate standalone dashboard HTML:

```powershell
npm run visual:render
```

Run Playwright visual checks and screenshots:

```powershell
npm run visual:test
```

Inspect:

```text
artifacts/ui/live-changes.html
artifacts/ui/whole-architecture.html
artifacts/ui/feature-focus.html
artifacts/ui/diff-since-baseline.html
artifacts/ui/live-changes.png
artifacts/ui/whole-architecture.png
artifacts/ui/feature-focus.png
artifacts/ui/diff-since-baseline.png
artifacts/validation-report.md
```

## Package VSIX

Build the installable extension:

```powershell
npm run package
```

The generated `.vsix` is ignored and should not be committed unless a release process explicitly asks for it.

## Install VSIX

Install into an isolated VS Code extensions directory:

```powershell
& "$env:LOCALAPPDATA\Programs\Microsoft VS Code\bin\code.cmd" --install-extension .\live-architecture-map-0.0.1.vsix --force --extensions-dir C:\tmp\vscode-lam-installed-extensions
```

Launch ABB_ROS2 with the installed VSIX:

```powershell
& "$env:LOCALAPPDATA\Programs\Microsoft VS Code\bin\code.cmd" "\\wsl.localhost\Ubuntu-22.04\home\jevons\ABB_ROS2" `
  --new-window `
  --user-data-dir=C:\tmp\vscode-lam-installed-user-data `
  --extensions-dir=C:\tmp\vscode-lam-installed-extensions `
  --disable-gpu
```

Confirm installation from PowerShell:

```powershell
& "$env:LOCALAPPDATA\Programs\Microsoft VS Code\bin\code.cmd" --list-extensions --extensions-dir C:\tmp\vscode-lam-installed-extensions
```

Look for `local-tools.live-architecture-map`.

## Safety Guarantee

The inspected workspace is read-only by default. The extension reads files, reads git status, watches for file changes, and stores snapshots/baselines only in VS Code extension-managed storage (`workspaceState`, `globalState`, or VS Code extension storage locations).

It does not write `.vscode/settings.json`, `architecture/`, `docs/live/`, cache files, generated metadata, source files, tests, or git state into the inspected workspace.

Export writes JSON only after the user explicitly chooses a save path in the Save Dialog. The default export location is outside the inspected workspace.

## Known Limitations

- The scanner uses textual Python import parsing and does not execute target Python code.
- Workspace compile, style, and test checks are reported as not run or unknown unless a future command explicitly wires them.
- Full installed-VSIX UI validation may still require human inspection because VS Code desktop Activity Bar/sidebar visibility is not fully observable from command-line automation.
- Git status uses the VS Code Git API when available and falls back to `git status --porcelain=v1 --branch`.
