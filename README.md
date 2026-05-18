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

Run the extension against an inspected Python workspace with isolated VS Code state:

```powershell
code C:\Users\Junekim\Work\ABB_ROS2 `
  --new-window `
  --extensionDevelopmentPath=C:\Users\Junekim\Work\99.vs_workspace\vs_extension_work `
  --user-data-dir=C:\tmp\vscode-lam-user-data `
  --extensions-dir=C:\tmp\vscode-lam-extensions `
  --disable-gpu
```

The inspected workspace is read-only by default. This first pass uses mock data only and does not write `.vscode/settings.json`, `architecture/`, `docs/live/`, metadata, caches, source files, tests, or git state into the inspected workspace.

## Package and Install

Build a VSIX:

```powershell
npm run package
```

Install the generated VSIX:

```powershell
code --install-extension .\live-architecture-map-0.0.1.vsix
```
