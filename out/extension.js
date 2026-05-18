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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const analysisEngine_1 = require("./core/analysisEngine");
const commandRegistry_1 = require("./commands/commandRegistry");
const sidebarProvider_1 = require("./tree/sidebarProvider");
const dashboardPanel_1 = require("./webview/dashboardPanel");
function activate(context) {
    const output = vscode.window.createOutputChannel("Live Architecture Map");
    const engine = new analysisEngine_1.AnalysisEngine();
    let state = engine.getMockState("liveChanges");
    const sidebarProvider = new sidebarProvider_1.SidebarProvider(state);
    output.appendLine("Live Architecture Map activated in mock UI mode.");
    output.appendLine(`Workspace root: ${vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? "none"}`);
    context.subscriptions.push(output);
    context.subscriptions.push(vscode.window.registerTreeDataProvider("liveArchitectureMap.sidebar", sidebarProvider));
    const commandDisposables = (0, commandRegistry_1.registerCommands)({
        context,
        output,
        engine,
        sidebarProvider,
        getState: () => state,
        setState: (nextState) => {
            state = nextState;
        }
    });
    context.subscriptions.push(...commandDisposables);
    const configuration = vscode.workspace.getConfiguration("liveArchitectureMap");
    if (configuration.get("autoOpenDashboard", false)) {
        dashboardPanel_1.DashboardPanel.createOrShow(context.extensionUri, state, {
            setMode: (mode) => void vscode.commands.executeCommand("liveArchitectureMap.openDashboard", mode),
            selectFeature: (featureId) => void vscode.commands.executeCommand("liveArchitectureMap.focusFeature", featureId),
            refresh: () => void vscode.commands.executeCommand("liveArchitectureMap.refresh"),
            captureBaseline: () => void vscode.commands.executeCommand("liveArchitectureMap.captureBaseline"),
            showDiffSinceBaseline: () => void vscode.commands.executeCommand("liveArchitectureMap.showDiffSinceBaseline"),
            exportSnapshot: () => void vscode.commands.executeCommand("liveArchitectureMap.exportSnapshot")
        });
    }
}
function deactivate() {
    return;
}
//# sourceMappingURL=extension.js.map