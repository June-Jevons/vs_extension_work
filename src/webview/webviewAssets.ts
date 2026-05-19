import * as fs from "fs";
import * as path from "path";

interface UriLike {
  fsPath: string;
  path: string;
  toString(): string;
  with(change: { path: string }): UriLike;
}

interface WebviewLike {
  asWebviewUri(uri: UriLike): UriLike;
}

interface ViteManifestEntry {
  file?: string;
  css?: string[];
  isEntry?: boolean;
  src?: string;
}

type ViteManifest = Record<string, ViteManifestEntry>;

export type WebviewAssetResolution =
  | {
    kind: "available";
    scriptUri: string;
    styleUris: string[];
  }
  | {
    kind: "missing";
    message: string;
    detail: string;
  };

export type WebviewBundleStatus =
  | {
    kind: "available";
    scriptFile: string;
    styleFiles: string[];
  }
  | {
    kind: "missing";
    message: string;
    detail: string;
  };

const WEBVIEW_ROOT = ["media", "webview"];
const MANIFEST_SEGMENTS = [...WEBVIEW_ROOT, ".vite", "manifest.json"];
const ENTRY_SOURCE = "src/webview-app/main.tsx";

export function getWebviewAssetUris(webview: WebviewLike, extensionUri: UriLike): WebviewAssetResolution {
  const manifestPath = path.join(extensionUri.fsPath, ...MANIFEST_SEGMENTS);
  const manifest = readManifest(manifestPath);
  if (!manifest) {
    return {
      kind: "missing",
      message: "React webview bundle is unavailable.",
      detail: `Missing or unreadable Vite manifest at ${path.join(...MANIFEST_SEGMENTS)}. Run npm run compile:webview.`
    };
  }

  const entry = manifest[ENTRY_SOURCE] ?? Object.values(manifest).find((candidate) => candidate.isEntry);
  if (!entry?.file) {
    return {
      kind: "missing",
      message: "React webview entry is unavailable.",
      detail: `Vite manifest does not contain an entry for ${ENTRY_SOURCE}. Run npm run compile:webview.`
    };
  }

  return {
    kind: "available",
    scriptUri: webview.asWebviewUri(joinExtensionUri(extensionUri, ...WEBVIEW_ROOT, entry.file)).toString(),
    styleUris: (entry.css ?? []).map((cssFile) => webview.asWebviewUri(joinExtensionUri(extensionUri, ...WEBVIEW_ROOT, cssFile)).toString())
  };
}

export function getWebviewBundleStatus(extensionRoot: string): WebviewBundleStatus {
  const webviewRoot = path.join(extensionRoot, ...WEBVIEW_ROOT);
  const manifestPath = path.join(extensionRoot, ...MANIFEST_SEGMENTS);
  const manifest = readManifest(manifestPath);
  if (!manifest) {
    return {
      kind: "missing",
      message: "React webview bundle is unavailable.",
      detail: `Missing or unreadable Vite manifest at ${path.join(...MANIFEST_SEGMENTS)}. Run npm run compile:webview.`
    };
  }

  const entry = findViteEntry(manifest);
  if (!entry?.file) {
    return {
      kind: "missing",
      message: "React webview entry is unavailable.",
      detail: `Vite manifest does not contain an entry for ${ENTRY_SOURCE}. Run npm run compile:webview.`
    };
  }

  const requiredFiles = [entry.file, ...(entry.css ?? [])];
  const missingFiles = requiredFiles.filter((file) => !fs.existsSync(path.join(webviewRoot, file)));
  if (missingFiles.length > 0) {
    return {
      kind: "missing",
      message: "React webview assets are incomplete.",
      detail: `Missing built asset(s): ${missingFiles.join(", ")}. Run npm run compile:webview.`
    };
  }

  return {
    kind: "available",
    scriptFile: entry.file,
    styleFiles: entry.css ?? []
  };
}

export function findViteEntry(manifest: ViteManifest): ViteManifestEntry | undefined {
  return manifest[ENTRY_SOURCE] ?? Object.values(manifest).find((candidate) => candidate.isEntry);
}

function readManifest(manifestPath: string): ViteManifest | undefined {
  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf8")) as ViteManifest;
  } catch {
    return undefined;
  }
}

function joinExtensionUri(extensionUri: UriLike, ...segments: string[]): UriLike {
  const base = extensionUri.path.replace(/\/+$/, "");
  const suffix = segments.map((segment) => segment.replace(/^\/+|\/+$/g, "")).join("/");
  return extensionUri.with({ path: `${base}/${suffix}` });
}
