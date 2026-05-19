import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";

const repositoryRoot = path.resolve(__dirname, "..", "..", "..");
const launchJson = readJson(path.join(repositoryRoot, ".vscode", "launch.json")) as LaunchJson;
const tasksJson = readJson(path.join(repositoryRoot, ".vscode", "tasks.json")) as TasksJson;
const packageJson = readJson(path.join(repositoryRoot, "package.json")) as PackageJson;

const forbidden = /(powershell(?:\.exe)?|code\.cmd|C:\\|\\\\wsl\.localhost|\\\\wsl\$)/i;
const configText = [
  fs.readFileSync(path.join(repositoryRoot, ".vscode", "launch.json"), "utf8"),
  fs.readFileSync(path.join(repositoryRoot, ".vscode", "tasks.json"), "utf8")
].join("\n");

assert.ok(!forbidden.test(configText), "VS Code debug/task config must not reference Windows, PowerShell, code.cmd, or WSL UNC paths.");
assert.strictEqual(launchJson.configurations[0]?.preLaunchTask, "npm: compile");
assert.ok(launchJson.configurations[0]?.args.includes("/home/jevons/ABB_ROS2"), "F5 target must be the native Linux ABB_ROS2 path.");
assert.ok(tasksJson.tasks.every((task) => task.type === "npm"), "F5 build tasks must use npm tasks only.");
assert.ok(tasksJson.tasks.some((task) => task.label === "npm: compile" && task.script === "compile"));
assert.ok(tasksJson.tasks.some((task) => task.label === "npm: watch" && task.script === "watch"));
assert.strictEqual(fs.readFileSync(path.join(repositoryRoot, ".nvmrc"), "utf8").trim(), "20");
assert.strictEqual(packageJson.engines.node, ">=20");
assert.strictEqual(packageJson.engines.npm, ">=10");

console.log("Ubuntu VS Code config checks passed.");

interface LaunchJson {
  configurations: Array<{
    args: string[];
    preLaunchTask?: string;
  }>;
}

interface TasksJson {
  tasks: Array<{
    label?: string;
    script?: string;
    type?: string;
  }>;
}

interface PackageJson {
  engines: {
    node?: string;
    npm?: string;
  };
}

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}
