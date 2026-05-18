import * as vscode from "vscode";
import { commandIds } from "../commands/commands";
import { LiveArchitectureStateManager } from "../core/analysisEngine";
import { createMockDashboardState } from "../mockData/mockDashboardState";
import { DashboardMode, DashboardState, getModeLabel } from "../webview/dashboardState";
import { SidebarItem } from "./treeItems";

export const REQUIRED_ROOT_SECTIONS = [
  "Changed Features",
  "Changed Files",
  "Impacted Modules",
  "Suggested Tests",
  "Baseline",
  "Actions",
  "Modes"
] as const;

type RootSection = (typeof REQUIRED_ROOT_SECTIONS)[number];

type SidebarNode =
  | { type: "root"; label: RootSection }
  | { type: "feature"; label: string; featureId: string; risk: "low" | "medium" | "high" }
  | { type: "file"; label: string; path: string; risk: "low" | "medium" | "high" }
  | { type: "module"; label: string; moduleId: string; risk: "low" | "medium" | "high" }
  | { type: "test"; label: string; path: string }
  | { type: "baseline"; label: string }
  | { type: "action"; label: string; command: string }
  | { type: "mode"; label: string; mode: DashboardMode };

export class LiveArchitectureSidebarProvider implements vscode.TreeDataProvider<SidebarNode> {
  private readonly changeEmitter = new vscode.EventEmitter<SidebarNode | undefined>();
  readonly onDidChangeTreeData = this.changeEmitter.event;

  private readonly fallbackState = createMockDashboardState();

  constructor(private readonly stateManager?: LiveArchitectureStateManager) {
    this.stateManager?.onDidChangeState(() => this.refresh());
  }

  refresh(): void {
    this.changeEmitter.fire(undefined);
  }

  getRootSectionLabels(): string[] {
    return [...REQUIRED_ROOT_SECTIONS];
  }

  getTreeItem(element: SidebarNode): vscode.TreeItem {
    if (element.type === "root") {
      const item = new SidebarItem(element.label, "section", vscode.TreeItemCollapsibleState.Expanded);
      item.iconPath = new vscode.ThemeIcon(getRootIcon(element.label));
      item.tooltip = element.label;
      return item;
    }

    if (element.type === "feature") {
      const item = new SidebarItem(element.label, "feature");
      item.description = capitalize(element.risk);
      item.iconPath = new vscode.ThemeIcon("symbol-class");
      item.command = {
        command: commandIds.focusFeature,
        title: "Focus Feature",
        arguments: [element.featureId]
      };
      return item;
    }

    if (element.type === "file") {
      const item = new SidebarItem(element.label, "file");
      item.description = element.risk.slice(0, 1).toUpperCase();
      item.iconPath = new vscode.ThemeIcon("file-code");
      item.tooltip = element.path;
      item.command = {
        command: commandIds.openWorkspaceFile,
        title: "Open Changed File",
        arguments: [element.path]
      };
      return item;
    }

    if (element.type === "module") {
      const item = new SidebarItem(element.label, "module");
      item.description = capitalize(element.risk);
      item.iconPath = new vscode.ThemeIcon("symbol-module");
      return item;
    }

    if (element.type === "test") {
      const item = new SidebarItem(element.label, "test");
      item.iconPath = new vscode.ThemeIcon("beaker");
      item.tooltip = element.path;
      return item;
    }

    if (element.type === "baseline") {
      const item = new SidebarItem(element.label, "baseline");
      item.iconPath = new vscode.ThemeIcon("history");
      item.command = {
        command: commandIds.showDiffSinceBaseline,
        title: "Show Diff Since Baseline"
      };
      return item;
    }

    if (element.type === "action") {
      const item = new SidebarItem(element.label, "action");
      item.iconPath = new vscode.ThemeIcon(element.command === commandIds.refresh ? "refresh" : "save-as");
      item.command = {
        command: element.command,
        title: element.label
      };
      return item;
    }

    const item = new SidebarItem(element.label, "mode");
    item.iconPath = new vscode.ThemeIcon("layout");
    item.command = {
      command: commandIds.openDashboard,
      title: `Open ${element.label}`,
      arguments: [element.mode]
    };
    return item;
  }

  getChildren(element?: SidebarNode): SidebarNode[] {
    const state = this.getState();
    if (!element) {
      return REQUIRED_ROOT_SECTIONS.map((label) => ({ type: "root", label }));
    }

    if (element.type !== "root") {
      return [];
    }

    switch (element.label) {
      case "Changed Features":
        return state.snapshot.impactedFeatures.slice(0, 6).map((feature) => ({
          type: "feature",
          label: feature.label,
          featureId: feature.featureId,
          risk: feature.riskLevel
        }));
      case "Changed Files":
        return state.snapshot.changedFiles.map((file) => ({
          type: "file",
          label: file.path.split("/").at(-1) ?? file.path,
          path: file.path,
          risk: file.riskLevel
        }));
      case "Impacted Modules":
        return state.snapshot.modules
          .filter((moduleNode) => state.snapshot.impactedFeatures.some((feature) => feature.featureId === moduleNode.featureId))
          .slice(0, 9)
          .map((moduleNode) => ({
            type: "module",
            label: moduleNode.name,
            moduleId: moduleNode.id,
            risk: moduleNode.riskLevel
          }));
      case "Suggested Tests":
        return state.snapshot.modules
          .filter((moduleNode) => moduleNode.isTest)
          .slice(0, 8)
          .map((moduleNode) => ({
            type: "test",
            label: moduleNode.path,
            path: moduleNode.path
          }));
      case "Baseline":
        return [
          {
            type: "baseline",
            label: state.baselineDiff ? `baseline_${state.baselineDiff.baselineCapturedAtIso.slice(0, 10)}` : "No baseline captured"
          }
        ];
      case "Actions":
        return [
          {
            type: "action",
            label: "Refresh",
            command: commandIds.refresh
          },
          {
            type: "action",
            label: "Capture Baseline",
            command: commandIds.captureBaseline
          }
        ];
      case "Modes":
        return [
          {
            type: "mode",
            label: getModeLabel("liveChanges"),
            mode: "liveChanges"
          },
          {
            type: "mode",
            label: getModeLabel("wholeArchitecture"),
            mode: "wholeArchitecture"
          },
          {
            type: "mode",
            label: getModeLabel("featureFocus"),
            mode: "featureFocus"
          },
          {
            type: "mode",
            label: getModeLabel("diffSinceBaseline"),
            mode: "diffSinceBaseline"
          }
        ];
    }
  }

  private getState(): DashboardState {
    return this.stateManager?.getState() ?? this.fallbackState;
  }
}

function getRootIcon(section: RootSection): string {
  switch (section) {
    case "Changed Features":
      return "symbol-class";
    case "Changed Files":
      return "files";
    case "Impacted Modules":
      return "symbol-module";
    case "Suggested Tests":
      return "beaker";
    case "Baseline":
      return "history";
    case "Actions":
      return "tools";
    case "Modes":
      return "layout";
  }
}

function capitalize(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}
