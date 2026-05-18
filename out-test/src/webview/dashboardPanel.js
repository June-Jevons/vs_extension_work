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
const html_1 = require("./html");
const messageProtocol_1 = require("./messageProtocol");
class DashboardPanel {
    panel;
    static currentPanel;
    disposables = [];
    callbacks;
    state;
    extensionUri;
    static createOrShow(extensionUri, state, callbacks) {
        const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;
        if (DashboardPanel.currentPanel) {
            DashboardPanel.currentPanel.callbacks = callbacks;
            DashboardPanel.currentPanel.setState(state);
            DashboardPanel.currentPanel.panel.reveal(column);
            return DashboardPanel.currentPanel;
        }
        const panel = vscode.window.createWebviewPanel("liveArchitectureMap.dashboard", "Live Architecture Map", column, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [extensionUri]
        });
        DashboardPanel.currentPanel = new DashboardPanel(panel, extensionUri, state, callbacks);
        return DashboardPanel.currentPanel;
    }
    constructor(panel, extensionUri, state, callbacks) {
        this.panel = panel;
        this.extensionUri = extensionUri;
        this.state = state;
        this.callbacks = callbacks;
        this.panel.iconPath = vscode.Uri.joinPath(this.extensionUri, "media", "icon.svg");
        this.updateHtml();
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
        this.panel.webview.onDidReceiveMessage((message) => {
            if (!(0, messageProtocol_1.isWebviewToExtensionMessage)(message)) {
                return;
            }
            switch (message.type) {
                case "ready":
                    void this.panel.webview.postMessage({ type: "state", state: this.state });
                    return;
                case "setMode":
                    this.callbacks.setMode(message.mode);
                    return;
                case "selectFeature":
                    this.callbacks.selectFeature(message.featureId);
                    return;
                case "refresh":
                    this.callbacks.refresh();
                    return;
                case "captureBaseline":
                    this.callbacks.captureBaseline();
                    return;
                case "showDiffSinceBaseline":
                    this.callbacks.showDiffSinceBaseline();
                    return;
                case "exportSnapshot":
                    this.callbacks.exportSnapshot();
                    return;
            }
        }, null, this.disposables);
    }
    setState(state) {
        this.state = state;
        this.updateHtml();
    }
    dispose() {
        DashboardPanel.currentPanel = undefined;
        while (this.disposables.length > 0) {
            const disposable = this.disposables.pop();
            disposable?.dispose();
        }
    }
    updateHtml() {
        this.panel.title = this.state.ui.modeLabels[this.state.mode];
        this.panel.webview.html = (0, html_1.getDashboardHtml)(this.panel.webview, this.state);
    }
}
exports.DashboardPanel = DashboardPanel;
//# sourceMappingURL=dashboardPanel.js.map