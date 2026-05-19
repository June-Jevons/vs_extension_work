import * as vscode from "vscode";
export { describePathKind, PathKind } from "./pathKind";

const CHANNEL_NAME = "Live Architecture Map";

let outputChannel: vscode.OutputChannel | undefined;

export function getLiveArchitectureOutputChannel(): vscode.OutputChannel {
  outputChannel ??= vscode.window.createOutputChannel(CHANNEL_NAME);
  return outputChannel;
}

export function logInfo(message: string): void {
  getLiveArchitectureOutputChannel().appendLine(`[${new Date().toISOString()}] ${message}`);
}

export function disposeLiveArchitectureOutputChannel(): void {
  outputChannel?.dispose();
  outputChannel = undefined;
}
