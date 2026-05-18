import * as vscode from "vscode";
import { DashboardMode, DashboardState, dashboardModes } from "../webview/dashboardState";
import { ArchitectureTreeItem } from "./treeItems";

type RootSection = "changedFeatures" | "changedFiles" | "impactedModules" | "suggestedTests" | "baseline" | "actions" | "modes";

const rootSections: { id: RootSection; label: string; count?: (state: DashboardState) => number }[] = [
  { id: "changedFeatures", label: "Changed Features", count: (state) => state.ui.impactedFeatures.filter((feature) => feature.changedFileCount > 0).length },
  { id: "changedFiles", label: "Changed Files", count: (state) => state.ui.changedFiles.length },
  { id: "impactedModules", label: "Impacted Modules", count: (state) => state.snapshot.modules.filter((module) => module.featureId && ["config-system", "operator-startup", "launcher-env", "ros-runtime"].includes(module.featureId)).length },
  { id: "suggestedTests", label: "Suggested Tests", count: (state) => state.ui.suggestedTests.length },
  { id: "baseline", label: "Baseline" },
  { id: "actions", label: "Actions" },
  { id: "modes", label: "Modes" }
];

export class SidebarProvider implements vscode.TreeDataProvider<ArchitectureTreeItem> {
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<ArchitectureTreeItem | undefined | null | void>();
  public readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  public constructor(private state: DashboardState) {}

  public updateState(state: DashboardState): void {
    this.state = state;
    this.onDidChangeTreeDataEmitter.fire();
  }

  public getTreeItem(element: ArchitectureTreeItem): vscode.TreeItem {
    return element;
  }

  public getChildren(element?: ArchitectureTreeItem): ArchitectureTreeItem[] {
    if (!vscode.workspace.workspaceFolders?.length && !this.state.isMockData) {
      return [messageItem("Open a workspace to inspect architecture.")];
    }

    if (!element) {
      return rootSections.map((section) => {
        const suffix = section.count ? ` (${section.count(this.state)})` : "";
        const item = new ArchitectureTreeItem(`${section.label}${suffix}`, "section", vscode.TreeItemCollapsibleState.Expanded, section.id);
        item.iconPath = new vscode.ThemeIcon(iconForSection(section.id));
        return item;
      });
    }

    if (element.value?.startsWith("moduleGroup:")) {
      const featureId = element.value.replace("moduleGroup:", "");
      return this.state.snapshot.modules
        .filter((module) => module.featureId === featureId)
        .map((module) => {
          const item = new ArchitectureTreeItem(module.name, "module");
          item.description = module.riskLevel;
          item.tooltip = module.path;
          item.iconPath = new vscode.ThemeIcon("symbol-method", themeColorForRisk(module.riskLevel));
          return item;
        });
    }

    switch (element.value as RootSection | undefined) {
      case "modes":
        return this.modeItems();
      case "changedFeatures":
        return this.changedFeatureItems();
      case "changedFiles":
        return this.changedFileItems();
      case "impactedModules":
        return this.impactedModuleItems();
      case "suggestedTests":
        return this.suggestedTestItems();
      case "baseline":
        return this.baselineItems();
      case "actions":
        return this.actionItems();
      default:
        return [];
    }
  }

  private modeItems(): ArchitectureTreeItem[] {
    return dashboardModes.map((mode) => {
      const item = new ArchitectureTreeItem(labelForMode(mode), "mode", vscode.TreeItemCollapsibleState.None, mode);
      item.iconPath = new vscode.ThemeIcon(mode === this.state.mode ? "eye" : "circle-outline");
      item.command = {
        command: "liveArchitectureMap.openDashboard",
        title: `Open ${labelForMode(mode)}`,
        arguments: [mode]
      };
      return item;
    });
  }

  private changedFeatureItems(): ArchitectureTreeItem[] {
    const changed = this.state.ui.impactedFeatures.filter((feature) => feature.changedFileCount > 0);
    if (changed.length === 0) {
      return [messageItem("No modified files - use Whole Architecture Mode.")];
    }

    return changed.map((feature) => {
      const item = new ArchitectureTreeItem(feature.label, "feature", vscode.TreeItemCollapsibleState.None, feature.featureId);
      item.description = capitalize(feature.riskLevel);
      item.tooltip = feature.reason;
      item.iconPath = new vscode.ThemeIcon("symbol-class", themeColorForRisk(feature.riskLevel));
      item.command = {
        command: "liveArchitectureMap.focusFeature",
        title: "Focus Feature",
        arguments: [feature.featureId]
      };
      return item;
    });
  }

  private changedFileItems(): ArchitectureTreeItem[] {
    return this.state.ui.changedFiles.map((file) => {
      const item = new ArchitectureTreeItem(lastPathPart(file.path), "file", vscode.TreeItemCollapsibleState.None, file.path);
      item.description = statusShort(file.status);
      item.tooltip = `${file.path}\n${file.reason}`;
      item.iconPath = new vscode.ThemeIcon("file-code", themeColorForRisk(file.riskLevel));
      item.command = {
        command: "liveArchitectureMap.openChangedFile",
        title: "Open Changed File",
        arguments: [file.path]
      };
      return item;
    });
  }

  private impactedModuleItems(): ArchitectureTreeItem[] {
    const grouped = new Map<string, string[]>();
    for (const module of this.state.snapshot.modules) {
      if (!module.featureId || !["config-system", "operator-startup", "launcher-env", "ros-runtime"].includes(module.featureId)) {
        continue;
      }
      const label = module.featureId;
      const list = grouped.get(label) ?? [];
      list.push(module.name);
      grouped.set(label, list);
    }

    return Array.from(grouped.entries()).map(([featureId, modules]) => {
      const item = new ArchitectureTreeItem(labelForFeature(featureId), "module", vscode.TreeItemCollapsibleState.Collapsed, `moduleGroup:${featureId}`);
      item.description = `${modules.length}`;
      item.iconPath = new vscode.ThemeIcon("symbol-module");
      item.tooltip = modules.join("\n");
      return item;
    });
  }

  private suggestedTestItems(): ArchitectureTreeItem[] {
    return this.state.ui.suggestedTests.map((file) => {
      const item = new ArchitectureTreeItem(file.path, "test", vscode.TreeItemCollapsibleState.None, file.path);
      item.iconPath = new vscode.ThemeIcon("beaker");
      item.tooltip = file.reason;
      return item;
    });
  }

  private baselineItems(): ArchitectureTreeItem[] {
    return [
      itemWithCommand("baseline_2026-05-15", "baseline", "database", "liveArchitectureMap.showDiffSinceBaseline"),
      itemWithCommand("Capture Baseline", "action", "add", "liveArchitectureMap.captureBaseline")
    ];
  }

  private actionItems(): ArchitectureTreeItem[] {
    return [
      itemWithCommand("Open Dashboard", "action", "graph", "liveArchitectureMap.openDashboard"),
      itemWithCommand("Refresh", "action", "refresh", "liveArchitectureMap.refresh"),
      itemWithCommand("Export Snapshot", "action", "export", "liveArchitectureMap.exportSnapshot"),
      itemWithCommand("Clear Workspace Cache", "action", "trash", "liveArchitectureMap.clearWorkspaceCache")
    ];
  }
}

function itemWithCommand(label: string, kind: "action" | "baseline", icon: string, command: string): ArchitectureTreeItem {
  const item = new ArchitectureTreeItem(label, kind);
  item.iconPath = new vscode.ThemeIcon(icon);
  item.command = {
    command,
    title: label
  };
  return item;
}

function messageItem(label: string): ArchitectureTreeItem {
  const item = new ArchitectureTreeItem(label, "message");
  item.iconPath = new vscode.ThemeIcon("info");
  return item;
}

function iconForSection(section: RootSection): string {
  switch (section) {
    case "modes":
      return "layout";
    case "changedFeatures":
      return "symbol-class";
    case "changedFiles":
      return "files";
    case "impactedModules":
      return "symbol-module";
    case "suggestedTests":
      return "beaker";
    case "baseline":
      return "database";
    case "actions":
      return "tools";
  }
}

function labelForMode(mode: DashboardMode): string {
  switch (mode) {
    case "liveChanges":
      return "Live Changes";
    case "wholeArchitecture":
      return "Whole Architecture";
    case "featureFocus":
      return "Feature Focus";
    case "diffSinceBaseline":
      return "Diff Since Baseline";
  }
}

function labelForFeature(featureId: string): string {
  switch (featureId) {
    case "config-system":
      return "abb_common.config";
    case "operator-startup":
      return "operator_panel";
    case "launcher-env":
      return "launch";
    case "ros-runtime":
      return "ros_runtime";
    default:
      return featureId;
  }
}

function lastPathPart(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] ?? path;
}

function statusShort(status: string): string {
  switch (status) {
    case "modified":
      return "M";
    case "added":
      return "A";
    case "deleted":
      return "D";
    case "renamed":
      return "R";
    case "untracked":
      return "U";
    default:
      return "";
  }
}

function themeColorForRisk(risk: string): vscode.ThemeColor {
  switch (risk) {
    case "high":
      return new vscode.ThemeColor("testing.iconFailed");
    case "medium":
      return new vscode.ThemeColor("testing.iconQueued");
    case "low":
      return new vscode.ThemeColor("testing.iconPassed");
    default:
      return new vscode.ThemeColor("foreground");
  }
}

function capitalize(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}
