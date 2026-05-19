import * as cp from "child_process";
import * as fs from "fs";
import * as path from "path";

export interface DoctorCheck {
  name: string;
  ok: boolean;
  detail: string;
}

export interface DoctorOptions {
  repositoryRoot: string;
  platform?: NodeJS.Platform;
  nodeVersion?: string;
  npmVersion?: string;
  requireWebviewBundle?: boolean;
  commandExists?: (command: string, args: string[]) => boolean;
  pathExists?: (candidatePath: string) => boolean;
}

interface PackageJson {
  engines?: {
    node?: string;
    npm?: string;
  };
}

interface LaunchJson {
  configurations?: Array<{
    args?: string[];
    preLaunchTask?: string;
  }>;
}

const FORBIDDEN_WINDOWS_OR_WSL = /(powershell(?:\.exe)?|code\.cmd|C:\\|\\\\wsl\.localhost|\\\\wsl\$)/i;

export function runUbuntuDoctor(options: DoctorOptions): DoctorCheck[] {
  const repositoryRoot = options.repositoryRoot;
  const platform = options.platform ?? process.platform;
  const packageJson = readJson<PackageJson>(path.join(repositoryRoot, "package.json"));
  const launchJson = readJson<LaunchJson>(path.join(repositoryRoot, ".vscode", "launch.json"));
  const taskText = readText(path.join(repositoryRoot, ".vscode", "tasks.json"));
  const launchText = readText(path.join(repositoryRoot, ".vscode", "launch.json"));
  const commandExists = options.commandExists ?? defaultCommandExists;
  const pathExists = options.pathExists ?? fs.existsSync;
  const npmVersion = options.npmVersion ?? readCommandOutput("npm", ["--version"]).trim();
  const requireWebviewBundle = options.requireWebviewBundle ?? (
    process.argv.includes("--require-webview-bundle") || process.env.LAM_REQUIRE_WEBVIEW_BUNDLE === "1"
  );

  const checks: DoctorCheck[] = [
    check("platform", platform === "linux", `expected linux, got ${platform}`),
    check(
      "repository path",
      isNativeLinuxPath(repositoryRoot),
      `repository must be a native Linux path, got ${repositoryRoot}`
    ),
    check(
      "package-lock",
      fs.existsSync(path.join(repositoryRoot, "package-lock.json")),
      "package-lock.json must exist after dependency migration"
    ),
    check(
      ".nvmrc",
      readText(path.join(repositoryRoot, ".nvmrc")).trim() === "20",
      ".nvmrc must exist and contain 20"
    ),
    checkEngine("node engine", options.nodeVersion ?? process.version, packageJson.engines?.node, "node"),
    checkEngine("npm engine", npmVersion, packageJson.engines?.npm, "npm"),
    check("git command", commandExists("git", ["--version"]), "git must be available on PATH"),
    check("code command", commandExists("code", ["--version"]), "code must be available on PATH"),
    check("unzip command", commandExists("unzip", ["-v"]), "unzip must be available on PATH"),
    check(
      "VS Code config paths",
      !FORBIDDEN_WINDOWS_OR_WSL.test(`${launchText}\n${taskText}`),
      ".vscode/launch.json and .vscode/tasks.json must not contain Windows, WSL UNC, PowerShell, or code.cmd entries"
    ),
    check(
      "F5 preLaunchTask",
      launchJson.configurations?.every((configuration) => configuration.preLaunchTask === "npm: compile") === true,
      "every launch configuration must use preLaunchTask npm: compile"
    )
  ];

  for (const workspacePath of getConfiguredWorkspacePaths(launchJson)) {
    checks.push(check(
      `target workspace ${workspacePath}`,
      pathExists(workspacePath),
      `configured target workspace does not exist: ${workspacePath}`
    ));
  }

  if (requireWebviewBundle) {
    const webviewRoot = path.join(repositoryRoot, "media", "webview");
    const manifestPath = path.join(webviewRoot, ".vite", "manifest.json");
    const hasBundle = fs.existsSync(manifestPath) && hasBuiltAsset(webviewRoot, ".js");
    checks.push(check(
      "webview bundle",
      hasBundle,
      "media/webview must contain the Vite manifest and at least one JavaScript asset after webview build"
    ));
  }

  return checks;
}

export function formatDoctorReport(checks: readonly DoctorCheck[]): string {
  return checks
    .map((item) => `${item.ok ? "PASS" : "FAIL"} ${item.name}: ${item.detail}`)
    .join("\n");
}

export function hasDoctorFailures(checks: readonly DoctorCheck[]): boolean {
  return checks.some((item) => !item.ok);
}

if (require.main === module) {
  const repositoryRoot = path.resolve(__dirname, "..", "..");
  const checks = runUbuntuDoctor({ repositoryRoot });
  console.log(formatDoctorReport(checks));
  if (hasDoctorFailures(checks)) {
    process.exitCode = 1;
  }
}

function check(name: string, ok: boolean, detail: string): DoctorCheck {
  return {
    name,
    ok,
    detail: ok ? "ok" : detail
  };
}

function checkEngine(name: string, actual: string, range: string | undefined, label: string): DoctorCheck {
  if (!range) {
    return check(name, false, `package.json engines.${label} is required`);
  }
  const minimum = parseMinimumMajor(range);
  if (minimum === undefined) {
    return check(name, false, `unsupported ${label} engine range: ${range}`);
  }
  const actualMajor = parseMajorVersion(actual);
  return check(
    name,
    actualMajor !== undefined && actualMajor >= minimum,
    `${label} ${actual} does not satisfy ${range}`
  );
}

function parseMinimumMajor(range: string): number | undefined {
  const match = /^>=\s*(\d+)/.exec(range.trim());
  return match ? Number(match[1]) : undefined;
}

function parseMajorVersion(version: string): number | undefined {
  const match = /^v?(\d+)/.exec(version.trim());
  return match ? Number(match[1]) : undefined;
}

function isNativeLinuxPath(value: string): boolean {
  return value.startsWith("/") && !value.includes("\\\\wsl.localhost\\") && !value.includes("\\\\wsl$\\");
}

function getConfiguredWorkspacePaths(launchJson: LaunchJson): string[] {
  const paths: string[] = [];
  const optionsWithPathValues = new Set(["--user-data-dir", "--extensions-dir", "--extensionDevelopmentPath"]);
  for (const configuration of launchJson.configurations ?? []) {
    const args = configuration.args ?? [];
    for (let index = 0; index < args.length; index += 1) {
      const argument = args[index] ?? "";
      if (optionsWithPathValues.has(argument)) {
        index += 1;
        continue;
      }
      if ([...optionsWithPathValues].some((option) => argument.startsWith(`${option}=`))) {
        continue;
      }
      if (argument.startsWith("/") && !argument.startsWith("--")) {
        paths.push(argument);
      } else if (argument.startsWith("file:///")) {
        paths.push(fileUriToPath(argument));
      }
    }
  }
  return paths;
}

function fileUriToPath(uri: string): string {
  try {
    return decodeURIComponent(new URL(uri).pathname);
  } catch {
    return uri;
  }
}

function hasBuiltAsset(root: string, extension: string): boolean {
  if (!fs.existsSync(root)) {
    return false;
  }
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else if (entry.isFile() && entry.name.endsWith(extension)) {
        return true;
      }
    }
  }
  return false;
}

function defaultCommandExists(command: string, args: string[]): boolean {
  try {
    cp.execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    return true;
  } catch {
    return false;
  }
}

function readCommandOutput(command: string, args: string[]): string {
  try {
    return cp.execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch {
    return "";
  }
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readText(filePath)) as T;
}

function readText(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}
