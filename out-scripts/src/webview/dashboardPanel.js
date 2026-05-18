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
exports.DashboardPanel = void 0;
const vscode = __importStar(require("vscode"));
const mockDashboardState_1 = require("../mockData/mockDashboardState");
const html_1 = require("./html");
const messageProtocol_1 = require("./messageProtocol");
class DashboardPanel {
    context;
    panel;
    static currentPanel;
    state = (0, mockDashboardState_1.createMockDashboardState)();
    constructor(context, panel) {
        this.context = context;
        this.panel = panel;
        this.panel.onDidDispose(() => {
            DashboardPanel.currentPanel = undefined;
        }, undefined, this.context.subscriptions);
        this.panel.webview.onDidReceiveMessage(async (message) => {
            await this.handleMessage(message);
        }, undefined, this.context.subscriptions);
    }
    static show(context, mode = "liveChanges", selectedFeatureId) {
        const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;
        if (!DashboardPanel.currentPanel) {
            const panel = vscode.window.createWebviewPanel("liveArchitectureMap.dashboard", "Live Architecture Map", column, {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [context.extensionUri]
            });
            DashboardPanel.currentPanel = new DashboardPanel(context, panel);
        }
        else {
            DashboardPanel.currentPanel.panel.reveal(column);
        }
        DashboardPanel.currentPanel.setMode(mode, selectedFeatureId);
        return DashboardPanel.currentPanel.getCommandResult();
    }
    static refresh(context) {
        if (!DashboardPanel.currentPanel) {
            return DashboardPanel.show(context);
        }
        DashboardPanel.currentPanel.render();
        return DashboardPanel.currentPanel.getCommandResult();
    }
    setMode(mode, selectedFeatureId) {
        this.state = (0, mockDashboardState_1.createMockDashboardState)(mode, selectedFeatureId ?? this.state.selectedFeatureId);
        this.panel.title = `Live Architecture Map: ${mode}`;
        this.render();
    }
    async handleMessage(message) {
        if (!(0, messageProtocol_1.isWebviewToExtensionMessage)(message)) {
            await this.panel.webview.postMessage({
                type: "error",
                message: "Invalid dashboard message."
            });
            return;
        }
        switch (message.type) {
            case "ready":
                await this.panel.webview.postMessage({ type: "state", state: this.state });
                return;
            case "setMode":
                this.setMode(message.mode);
                return;
            case "selectFeature":
                this.setMode("featureFocus", message.featureId);
                return;
            case "captureBaseline":
            case "showDiffSinceBaseline":
                this.setMode("diffSinceBaseline");
                return;
            case "refresh":
                this.render();
                return;
            case "exportSnapshot":
                await this.panel.webview.postMessage({
                    type: "loading",
                    message: "Export is intentionally not wired in the mock UI foundation."
                });
                return;
        }
    }
    render() {
        this.panel.webview.html = (0, html_1.getDashboardWebviewHtml)(this.panel.webview, this.state, (0, html_1.getNonce)());
    }
    getCommandResult() {
        return {
            opened: true,
            mode: this.state.mode,
            selectedFeatureId: this.state.selectedFeatureId,
            panelTitle: this.panel.title,
            viewType: this.panel.viewType,
            visible: this.panel.visible,
            active: this.panel.active,
            wroteWorkspaceFiles: false
        };
    }
}
exports.DashboardPanel = DashboardPanel;
//# sourceMappingURL=dashboardPanel.js.map