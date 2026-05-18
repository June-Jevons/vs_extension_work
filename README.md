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

## Package and Install

Build a VSIX:

```powershell
npm run package
```

Install the generated VSIX:

```powershell
code --install-extension .\live-architecture-map-0.0.1.vsix
```
