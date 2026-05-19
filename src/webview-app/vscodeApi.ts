import { WebviewToExtensionMessage } from "../webview/messageProtocol";

interface VsCodeApi {
  postMessage(message: WebviewToExtensionMessage): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare global {
  interface Window {
    acquireVsCodeApi?: () => VsCodeApi;
  }
}

let api: VsCodeApi | undefined;

export function postToExtension(message: WebviewToExtensionMessage): void {
  getApi()?.postMessage(message);
}

function getApi(): VsCodeApi | undefined {
  if (!api && typeof window.acquireVsCodeApi === "function") {
    api = window.acquireVsCodeApi();
  }
  return api;
}
