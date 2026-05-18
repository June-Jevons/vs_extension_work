"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SidebarProvider = void 0;
const vscode = __importStar(require("vscode"));
const dashboardState_1 = require("../webview/dashboardState");
const treeItems_1 = require("./treeItems");
const rootSections = [
    { id: "changedFeatures", label: "Changed Features", count: (state) => state.ui.impactedFeatures.filter((feature) => feature.changedFileCount > 0).length },
    { id: "changedFiles", label: "Changed Files", count: (state) => state.ui.changedFiles.length },
    { id: "impactedModules", label: "Impacted Modules", count: (state) => state.snapshot.modules.filter((module) => module.featureId && ["config-system", "operator-startup", "launcher-env", "ros-runtime"].includes(module.featureId)).length },
    { id: "suggestedTests", label: "Suggested Tests", count: (state) => state.ui.suggestedTests.length },
    { id: "baseline", label: "Baseline" },
    { id: "actions", label: "Actions" },
    { id: "modes", label: "Modes" }
];
class SidebarProvider {
    state;
    onDidChangeTreeDataEmitter = new vscode.EventEmitter();
    onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;
    constructor(state) {
        this.state = state;
    }
    updateState(state) {
        this.state = state;
        this.onDidChangeTreeDataEmitter.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!vscode.workspace.workspaceFolders?.length && !this.state.isMockData) {
            return [messageItem("Open a workspace to inspect architecture.")];
        }
        if (!element) {
            return rootSections.map((section) => {
                const suffix = section.count ? ` (${section.count(this.state)})` : "";
                const item = new treeItems_1.ArchitectureTreeItem(`${section.label}${suffix}`, "section", vscode.TreeItemCollapsibleState.Expanded, section.id);
                item.iconPath = new vscode.ThemeIcon(iconForSection(section.id));
                return item;
            });
        }
        if (element.value?.startsWith("moduleGroup:")) {
            const featureId = element.value.replace("moduleGroup:", "");
            return this.state.snapshot.modules
                .filter((module) => module.featureId === featureId)
                .map((module) => {
                const item = new treeItems_1.ArchitectureTreeItem(module.name, "module");
                item.description = module.riskLevel;
                item.tooltip = module.path;
                item.iconPath = new vscode.ThemeIcon("symbol-method", themeColorForRisk(module.riskLevel));
                return item;
            });
        }
        switch (element.value) {
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
    modeItems() {
        return dashboardState_1.dashboardModes.map((mode) => {
            const item = new treeItems_1.ArchitectureTreeItem(labelForMode(mode), "mode", vscode.TreeItemCollapsibleState.None, mode);
            item.iconPath = new vscode.ThemeIcon(mode === this.state.mode ? "eye" : "circle-outline");
            item.command = {
                command: "liveArchitectureMap.openDashboard",
                title: `Open ${labelForMode(mode)}`,
                arguments: [mode]
            };
            return item;
        });
    }
    changedFeatureItems() {
        const changed = this.state.ui.impactedFeatures.filter((feature) => feature.changedFileCount > 0);
        if (changed.length === 0) {
            return [messageItem("No modified files - use Whole Architecture Mode.")];
        }
        return changed.map((feature) => {
            const item = new treeItems_1.ArchitectureTreeItem(feature.label, "feature", vscode.TreeItemCollapsibleState.None, feature.featureId);
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
    changedFileItems() {
        return this.state.ui.changedFiles.map((file) => {
            const item = new treeItems_1.ArchitectureTreeItem(lastPathPart(file.path), "file", vscode.TreeItemCollapsibleState.None, file.path);
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
    impactedModuleItems() {
        const grouped = new Map();
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
            const item = new treeItems_1.ArchitectureTreeItem(labelForFeature(featureId), "module", vscode.TreeItemCollapsibleState.Collapsed, `moduleGroup:${featureId}`);
            item.description = `${modules.length}`;
            item.iconPath = new vscode.ThemeIcon("symbol-module");
            item.tooltip = modules.join("\n");
            return item;
        });
    }
    suggestedTestItems() {
        return this.state.ui.suggestedTests.map((file) => {
            const item = new treeItems_1.ArchitectureTreeItem(file.path, "test", vscode.TreeItemCollapsibleState.None, file.path);
            item.iconPath = new vscode.ThemeIcon("beaker");
            item.tooltip = file.reason;
            return item;
        });
    }
    baselineItems() {
        return [
            itemWithCommand("baseline_2026-05-15", "baseline", "database", "liveArchitectureMap.showDiffSinceBaseline"),
            itemWithCommand("Capture Baseline", "action", "add", "liveArchitectureMap.captureBaseline")
        ];
    }
    actionItems() {
        return [
            itemWithCommand("Open Dashboard", "action", "graph", "liveArchitectureMap.openDashboard"),
            itemWithCommand("Refresh", "action", "refresh", "liveArchitectureMap.refresh"),
            itemWithCommand("Export Snapshot", "action", "export", "liveArchitectureMap.exportSnapshot"),
            itemWithCommand("Clear Workspace Cache", "action", "trash", "liveArchitectureMap.clearWorkspaceCache")
        ];
    }
}
exports.SidebarProvider = SidebarProvider;
function itemWithCommand(label, kind, icon, command) {
    const item = new treeItems_1.ArchitectureTreeItem(label, kind);
    item.iconPath = new vscode.ThemeIcon(icon);
    item.command = {
        command,
        title: label
    };
    return item;
}
function messageItem(label) {
    const item = new treeItems_1.ArchitectureTreeItem(label, "message");
    item.iconPath = new vscode.ThemeIcon("info");
    return item;
}
function iconForSection(section) {
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
function labelForMode(mode) {
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
function labelForFeature(featureId) {
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
function lastPathPart(path) {
    const parts = path.split("/");
    return parts[parts.length - 1] ?? path;
}
function statusShort(status) {
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
function themeColorForRisk(risk) {
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
function capitalize(value) {
    return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}
//# sourceMappingURL=sidebarProvider.js.map