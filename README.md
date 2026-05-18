# Live Architecture Map

Live Architecture Map is a standalone VS Code extension that renders a dark, visual architecture dashboard for Python and ROS2-style workspaces.

This first implementation intentionally uses static mock data only. It implements the VS Code extension shell, Activity Bar contribution, Sidebar Tree View, and all four dashboard modes from the mockups. Real repository analysis, git status wiring, storage-backed baselines, and watcher updates are later phases.

## Development Test

```bash
cd /home/jevons/vs_extension_work
npm install
npm run compile
code .
```

Then press `F5`, open a target workspace such as `ABB_ROS2` in the Extension Development Host window, click the Live Architecture Map Activity Bar icon, and run `Live Architecture Map: Open Dashboard`.

## VSIX Packaging

```bash
npx @vscode/vsce package
```

## Install From VSIX

```bash
code --install-extension live-architecture-map-0.0.1.vsix
```

Or use the Extensions panel, choose `...`, select `Install from VSIX...`, and choose the generated package.

## Normal Use Preview

1. Open a Python workspace in VS Code.
2. Open Live Architecture Map from the Activity Bar.
3. Use Whole Architecture Mode for the full structure preview.
4. Use Live Changes Mode to inspect the mocked current change area.
5. Use Feature Focus Mode for selected feature detail.
6. Use Diff Since Baseline Mode for the mocked baseline comparison.

## Current Limitations

- Dashboard data is mock data by design for Phase 0 through Phase 3.
- No real scanner, git status parser, file watcher, baseline store, or risk engine is wired yet.
- The extension does not create files in an inspected target workspace.
