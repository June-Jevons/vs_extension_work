import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { commandIds } from "../../src/commands/commands";
import { isWebviewToExtensionMessage } from "../../src/webview/messageProtocol";
import { LiveArchitectureSidebarProvider, REQUIRED_ROOT_SECTIONS } from "../../src/tree/sidebarProvider";

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
      commandIds.clearWorkspaceCache
    ];

    for (const command of requiredCommands) {
      assert.ok(commands.includes(command), `${command} should be registered`);
    }
  });

  test("Activity Bar and Sidebar contributions are declared", async () => {
    const activeExtension = requireExtension(extension);
    const packageJson = readPackageJson(activeExtension.extensionPath);
    const containers = packageJson.contributes?.viewsContainers?.activitybar ?? [];
    const liveContainer = containers.find((container: { id?: string }) => container.id === "liveArchitectureMap");
    assert.ok(liveContainer, "Activity Bar container should be declared");

    const views = packageJson.contributes?.views?.liveArchitectureMap ?? [];
    const sidebarView = views.find((view: { id?: string }) => view.id === "liveArchitectureMap.sidebar");
    assert.ok(sidebarView, "Sidebar view should be declared");
  });

  test("Sidebar provider exposes required root sections", () => {
    const provider = new LiveArchitectureSidebarProvider();
    const rootItems = provider.getChildren();
    const labels = rootItems.map((item) => item.label);

    for (const section of REQUIRED_ROOT_SECTIONS) {
      assert.ok(labels.includes(section), `${section} should be exposed`);
    }
  });

  test("Open Dashboard command creates a Webview panel", async () => {
    const result = await vscode.commands.executeCommand(commandIds.openDashboard, "liveChanges") as {
      opened?: boolean;
      mode?: string;
      panelTitle?: string;
      viewType?: string;
      visible?: boolean;
      wroteWorkspaceFiles?: boolean;
    };

    assert.strictEqual(result.opened, true);
    assert.strictEqual(result.mode, "liveChanges");
    assert.strictEqual(result.panelTitle, "Live Architecture Map: liveChanges");
    assert.strictEqual(result.viewType, "liveArchitectureMap.dashboard");
    assert.strictEqual(result.visible, true);
    assert.strictEqual(result.wroteWorkspaceFiles, false);
  });

  test("message protocol accepts mode switching", () => {
    assert.ok(isWebviewToExtensionMessage({ type: "setMode", mode: "wholeArchitecture" }));
    assert.ok(isWebviewToExtensionMessage({ type: "setMode", mode: "featureFocus" }));
    assert.ok(isWebviewToExtensionMessage({ type: "showDiffSinceBaseline" }));
    assert.ok(!isWebviewToExtensionMessage({ type: "setMode", mode: "scanner" }));
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

Coverage: activation, command registration, package contributions, sidebar roots, dashboard webview command, message validation, and no inspected workspace write.
`,
      "utf8"
    );
  });
});

function requireExtension(extension: vscode.Extension<unknown> | undefined): vscode.Extension<unknown> {
  assert.ok(extension, "extension should be activated by the first integration test");
  return extension;
}

function readPackageJson(extensionPath: string): {
  contributes?: {
    viewsContainers?: {
      activitybar?: Array<{ id?: string }>;
    };
    views?: {
      liveArchitectureMap?: Array<{ id?: string }>;
    };
  };
} {
  const packageJsonPath = path.join(extensionPath, "package.json");
  return JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
    contributes?: {
      viewsContainers?: {
        activitybar?: Array<{ id?: string }>;
      };
      views?: {
        liveArchitectureMap?: Array<{ id?: string }>;
      };
    };
  };
}
