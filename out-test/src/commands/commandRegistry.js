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
exports.registerCommands = registerCommands;
const vscode = __importStar(require("vscode"));
const dashboardState_1 = require("../webview/dashboardState");
const dashboardPanel_1 = require("../webview/dashboardPanel");
const commands_1 = require("./commands");
function registerCommands(services) {
    const callbacks = {
        setMode: (mode) => setMode(services, mode),
        selectFeature: (featureId) => selectFeature(services, featureId),
        refresh: () => refresh(services),
        captureBaseline: () => captureBaseline(services),
        showDiffSinceBaseline: () => setMode(services, "diffSinceBaseline"),
        exportSnapshot: () => void exportSnapshot(services)
    };
    return [
        vscode.commands.registerCommand("liveArchitectureMap.openDashboard", (arg) => {
            const normalized = (0, commands_1.normalizeOpenDashboardArg)(arg);
            if (normalized.mode && (0, dashboardState_1.isDashboardMode)(normalized.mode)) {
                setMode(services, normalized.mode, false);
            }
            dashboardPanel_1.DashboardPanel.createOrShow(services.context.extensionUri, services.getState(), callbacks);
        }),
        vscode.commands.registerCommand("liveArchitectureMap.refresh", () => refresh(services)),
        vscode.commands.registerCommand("liveArchitectureMap.captureBaseline", () => captureBaseline(services)),
        vscode.commands.registerCommand("liveArchitectureMap.showDiffSinceBaseline", () => {
            setMode(services, "diffSinceBaseline");
            dashboardPanel_1.DashboardPanel.createOrShow(services.context.extensionUri, services.getState(), callbacks);
        }),
        vscode.commands.registerCommand("liveArchitectureMap.focusFeature", async (featureId) => {
            if (!featureId) {
                const pick = await vscode.window.showQuickPick(services.getState().ui.featureBlocks.map((feature) => ({ label: feature.label, description: feature.id, id: feature.id })), { placeHolder: "Select a feature to focus" });
                featureId = pick?.id;
            }
            if (featureId) {
                selectFeature(services, featureId);
                dashboardPanel_1.DashboardPanel.createOrShow(services.context.extensionUri, services.getState(), callbacks);
            }
        }),
        vscode.commands.registerCommand("liveArchitectureMap.exportSnapshot", () => void exportSnapshot(services)),
        vscode.commands.registerCommand("liveArchitectureMap.clearWorkspaceCache", () => {
            services.output.appendLine("Mock cache clear requested. No extension cache exists in Phase 0-3.");
            void vscode.window.showInformationMessage("Live Architecture Map: no mock cache to clear yet.");
        }),
        vscode.commands.registerCommand("liveArchitectureMap.openChangedFile", async (path) => {
            await openChangedFile(path);
        })
    ];
}
function setMode(services, mode, updatePanel = true) {
    const current = services.getState();
    const next = services.engine.getMockState(mode, current.selectedFeatureId);
    services.setState(next);
    services.sidebarProvider.updateState(next);
    if (updatePanel) {
        dashboardPanel_1.DashboardPanel.currentPanel?.setState(next);
    }
}
function selectFeature(services, featureId) {
    const next = services.engine.getMockState("featureFocus", featureId);
    services.setState(next);
    services.sidebarProvider.updateState(next);
    dashboardPanel_1.DashboardPanel.currentPanel?.setState(next);
}
function refresh(services) {
    const current = services.getState();
    const next = services.engine.getMockState(current.mode, current.selectedFeatureId);
    services.output.appendLine(`Refresh requested in ${current.mode} mode. Phase 0-3 uses mock data only.`);
    services.setState(next);
    services.sidebarProvider.updateState(next);
    dashboardPanel_1.DashboardPanel.currentPanel?.setState(next);
}
function captureBaseline(services) {
    services.output.appendLine("Mock baseline capture requested. Real extension storage starts in Phase 4.");
    void vscode.window.showInformationMessage("Live Architecture Map: mock baseline is already loaded for UI preview.");
}
async function exportSnapshot(services) {
    const targetUri = await vscode.window.showSaveDialog({
        title: "Export Live Architecture Map Snapshot",
        filters: {
            JSON: ["json"]
        }
    });
    if (!targetUri) {
        return;
    }
    const bytes = Buffer.from(JSON.stringify(services.getState().snapshot, null, 2), "utf8");
    await vscode.workspace.fs.writeFile(targetUri, bytes);
    services.output.appendLine(`Exported mock snapshot to ${targetUri.fsPath}`);
    void vscode.window.showInformationMessage("Live Architecture Map: snapshot exported.");
}
async function openChangedFile(relativePath) {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri;
    if (!root) {
        void vscode.window.showWarningMessage("Open a workspace before opening changed files.");
        return;
    }
    const uri = vscode.Uri.joinPath(root, relativePath);
    try {
        const document = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(document);
    }
    catch {
        void vscode.window.showWarningMessage(`Mock file is not present in this workspace: ${relativePath}`);
    }
}
//# sourceMappingURL=commandRegistry.js.map