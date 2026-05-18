import * as vscode from "vscode";

const CHANNEL_NAME = "Live Architecture Map";

let outputChannel: vscode.OutputChannel | undefined;

export function getLiveArchitectureOutputChannel(): vscode.OutputChannel {
  outputChannel ??= vscode.window.createOutputChannel(CHANNEL_NAME);
  return outputChannel;
}

export function logInfo(message: string): void {
  getLiveArchitectureOutputChannel().appendLine(`[${new Date().toISOString()}] ${message}`);
}

export function describePathKind(fsPath: string | undefined): "unc-wsl" | "unc" | "local" | "unknown" {
  if (!fsPath) {
    return "unknown";
  }

  const normalized = fsPath.replaceAll("/", "\\").toLowerCase();
  if (normalized.startsWith("\\\\wsl.localhost\\") || normalized.startsWith("\\\\wsl$\\")) {
    return "unc-wsl";
  }
  if (normalized.startsWith("\\\\")) {
    return "unc";
  }
  return "local";
}

export function disposeLiveArchitectureOutputChannel(): void {
  outputChannel?.dispose();
  outputChannel = undefined;
}
