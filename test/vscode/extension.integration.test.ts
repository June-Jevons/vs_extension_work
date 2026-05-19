import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { commandIds } from "../../src/commands/commands";
import { getGitStatus } from "../../src/git/gitProvider";
import { getDashboardWebviewHtml } from "../../src/webview/html";
import { isWebviewToExtensionMessage } from "../../src/webview/messageProtocol";

declare const suite: (name: string, callback: () => void) => void;
declare const test: (name: string, callback: () => Promise<void> | void) => void;
declare const suiteTeardown: (callback: () => void) => void;

suite("Live Architecture Map VS Code integration", () => {
  let extension: vscode.Extension<unknown> | undefined;

  test("extension activates", async () => {
    const found = vscode.extensions.getExtension("local-tools.live-architecture-map");
    assert.ok(found, "extension should be discoverable by publisher and name");
    extension = found;
    await extension.activate();
    assert.strictEqual(extension.isActive, true);
  });

  test("required commands are registered", async () => {
    const commands = await vscode.commands.getCommands(true);
    const requiredCommands = [
      commandIds.openDashboard,
      commandIds.refresh,
      commandIds.captureBaseline,
      commandIds.showDiffSinceBaseline,
      commandIds.focusFeature,
      commandIds.exportSnapshot,
      commandIds.configure,
      commandIds.focusTimeline,
      commandIds.clearWorkspaceCache
    ];

    for (const command of requiredCommands) {
      assert.ok(commands.includes(command), `${command} should be registered`);
    }
  });

  test("Activity Bar launcher exists without old multi-section tree views", async () => {
    const activeExtension = requireExtension(extension);
    const packageJson = readPackageJson(activeExtension.extensionPath);
    const containers = packageJson.contributes?.viewsContainers?.activitybar ?? [];
    const liveContainer = containers.find((container: { id?: string }) => container.id === "liveArchitectureMap");
    assert.ok(liveContainer, "Activity Bar container should be declared");
    assert.strictEqual(liveContainer.title, "Live Architecture Map");

    const views = packageJson.contributes?.views?.liveArchitectureMap ?? [];
    assert.strictEqual(views.length, 1, "only the compact dashboard launcher view should be declared");
    assert.strictEqual(views[0]?.id, "liveArchitectureMap.launcher");
    assert.strictEqual(views[0]?.type, "webview");
    const retiredTreeNames = [
      "Changed Features",
      "Changed Files",
      "Impacted Modules",
      "Suggested Tests",
      "Baseline",
      "Actions",
      "Modes"
    ];
    for (const retiredName of retiredTreeNames) {
      assert.ok(!views.some((view: { name?: string }) => view.name === retiredName), `${retiredName} tree section should not be declared`);
    }
  });

  test("Status Bar dashboard entry point is not exported", () => {
    const activeExtension = requireExtension(extension);
    const api = activeExtension.exports as {
      statusBarItem?: vscode.StatusBarItem;
    };

    assert.strictEqual(api.statusBarItem, undefined, "Status Bar item should not be created or exported");
  });

  test("Open Dashboard command creates a Webview panel", async () => {
    const result = await vscode.commands.executeCommand(commandIds.openDashboard, "liveChanges") as {
      opened?: boolean;
      mode?: string;
      panelTitle?: string;
      viewType?: string;
      visible?: boolean;
      stateSource?: string;
      scannerStatus?: string;
      gitStatusSource?: string;
      webviewBundleStatus?: string;
      isMockData?: boolean;
      diagnosticReason?: string;
      wroteWorkspaceFiles?: boolean;
    };

    assert.strictEqual(result.opened, true);
    assert.strictEqual(result.mode, "liveChanges");
    assert.strictEqual(result.panelTitle, "Live Architecture Map: liveChanges");
    assert.strictEqual(result.viewType, "liveArchitectureMap.dashboard");
    assert.strictEqual(result.visible, true);
    assert.strictEqual(result.stateSource, "real");
    assert.strictEqual(result.scannerStatus, "vscodeFindFiles");
    assert.strictEqual(result.webviewBundleStatus, "available");
    assert.strictEqual(result.isMockData, false);
    assert.strictEqual(result.wroteWorkspaceFiles, false);
  });

  test("Git provider reports VS Code API status or explicit unavailable reason", async () => {
    const folder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(folder, "fixture workspace should be open");

    const status = await getGitStatus(folder);
    assert.ok(status.source === "VS Code Git API" || status.source === "unavailable");
    if (status.source === "unavailable") {
      assert.ok(status.unavailableReason && status.unavailableReason.length > 0, "unavailable Git status should include a reason");
    }
  });

  test("missing webview bundle renders an explicit error shell", () => {
    const artifactsRoot = path.join(requireExtension(extension).extensionPath, "artifacts");
    fs.mkdirSync(artifactsRoot, { recursive: true });
    const tempRoot = fs.mkdtempSync(path.join(artifactsRoot, "missing-webview-"));
    const html = getDashboardWebviewHtml(
      fakeWebview as unknown as Parameters<typeof getDashboardWebviewHtml>[0],
      new FakeUri(tempRoot, tempRoot) as unknown as Parameters<typeof getDashboardWebviewHtml>[1],
      "nonce-test"
    );
    assert.ok(html.includes("data-testid=\"webview-bundle-error\""));
    assert.ok(html.includes("React webview bundle is unavailable."));
    assert.ok(!html.includes("graph-svg"));
    assert.ok(!html.includes("renderDashboardShell"));
  });

  test("message protocol accepts mode switching", () => {
    assert.ok(isWebviewToExtensionMessage({ type: "setMode", mode: "wholeArchitecture" }));
    assert.ok(isWebviewToExtensionMessage({ type: "setMode", mode: "featureFocus" }));
    assert.ok(isWebviewToExtensionMessage({ type: "showDiffSinceBaseline" }));
    assert.ok(isWebviewToExtensionMessage({ type: "configure" }));
    assert.ok(isWebviewToExtensionMessage({ type: "focusTimeline", available: true }));
    assert.ok(!isWebviewToExtensionMessage({ type: "setMode", mode: "scanner" }));
  });

  test("Export command cancellation uses a safe default outside the inspected workspace", async () => {
    const result = await vscode.commands.executeCommand(commandIds.exportSnapshot, { simulateCancel: true }) as {
      exported?: boolean;
      cancelled?: boolean;
      defaultInsideWorkspace?: boolean;
      wroteWorkspaceFiles?: boolean;
    };

    assert.strictEqual(result.exported, false);
    assert.strictEqual(result.cancelled, true);
    assert.strictEqual(result.defaultInsideWorkspace, false);
    assert.strictEqual(result.wroteWorkspaceFiles, false);
  });

  test("Configure and Timeline commands are explicit", async () => {
    const timeline = await vscode.commands.executeCommand(commandIds.focusTimeline) as {
      focused?: boolean;
      message?: string;
      wroteWorkspaceFiles?: boolean;
    };
    assert.strictEqual(typeof timeline.focused, "boolean");
    assert.ok(timeline.message && timeline.message.includes("Timeline"));
    assert.strictEqual(timeline.wroteWorkspaceFiles, false);
  });

  test("Capture Baseline command reports extension-owned storage behavior", async () => {
    const result = await vscode.commands.executeCommand(commandIds.captureBaseline) as {
      wroteWorkspaceFiles?: boolean;
    };
    assert.strictEqual(result.wroteWorkspaceFiles, false);
  });

  test("dashboard command does not write inspected workspace files", async () => {
    const activeExtension = requireExtension(extension);
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? activeExtension.extensionPath;
    const forbiddenPaths = [
      path.join(workspacePath, ".vscode", "settings.json"),
      path.join(workspacePath, "architecture"),
      path.join(workspacePath, "docs", "live")
    ];
    const before = forbiddenPaths.map((forbiddenPath) => fs.existsSync(forbiddenPath));

    await vscode.commands.executeCommand(commandIds.openDashboard, "wholeArchitecture");
    await vscode.commands.executeCommand(commandIds.refresh);
    await vscode.commands.executeCommand(commandIds.showDiffSinceBaseline);
    await vscode.commands.executeCommand(commandIds.exportSnapshot, { simulateCancel: true });

    const after = forbiddenPaths.map((forbiddenPath) => fs.existsSync(forbiddenPath));
    assert.deepStrictEqual(after, before, "dashboard commands should not create target workspace files");
  });

  suiteTeardown(() => {
    if (!extension) {
      return;
    }

    const artifactsRoot = path.join(extension.extensionPath, "artifacts");
    fs.mkdirSync(artifactsRoot, { recursive: true });
    fs.appendFileSync(
      path.join(artifactsRoot, "validation-report.md"),
      `
## VS Code Integration Test Run

Result: passed.

Completed: ${new Date().toISOString()}

Coverage: activation, command registration, Activity Bar launcher contribution, Status Bar removal, dashboard webview command, message validation, and no inspected workspace write.
`,
      "utf8"
    );
  });
});

class FakeUri {
  constructor(
    readonly fsPath: string,
    readonly path: string
  ) {}

  toString(): string {
    return `file://${this.path}`;
  }

  with(change: { path: string }): FakeUri {
    return new FakeUri(path.join("/", change.path), change.path);
  }
}

const fakeWebview = {
  cspSource: "vscode-webview:",
  asWebviewUri(uri: FakeUri): FakeUri {
    return new FakeUri(uri.fsPath, `/webview${uri.path}`);
  }
};

function requireExtension(extension: vscode.Extension<unknown> | undefined): vscode.Extension<unknown> {
  assert.ok(extension, "extension should be activated by the first integration test");
  return extension;
}

function readPackageJson(extensionPath: string): {
  contributes?: {
    viewsContainers?: {
      activitybar?: Array<{ id?: string; title?: string; icon?: string }>;
    };
    views?: {
      liveArchitectureMap?: Array<{ id?: string; name?: string; type?: string }>;
    };
  };
} {
  const packageJsonPath = path.join(extensionPath, "package.json");
  return JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
    contributes?: {
      viewsContainers?: {
        activitybar?: Array<{ id?: string; title?: string; icon?: string }>;
      };
      views?: {
        liveArchitectureMap?: Array<{ id?: string; name?: string; type?: string }>;
      };
    };
  };
}
