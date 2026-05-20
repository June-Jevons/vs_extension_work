import * as cp from "child_process";
import * as fs from "fs";
import * as path from "path";

interface VerificationResult {
  name: string;
  ok: boolean;
  detail: string;
}

const repositoryRoot = path.resolve(__dirname, "..", "..");

if (require.main === module) {
  const vsixPath = resolveVsixPath(process.argv[2]);
  const results = verifyVsixContents(vsixPath);
  const report = formatResults(vsixPath, results);
  console.log(report);
  appendValidationReport(vsixPath, results);
  if (results.some((result) => !result.ok)) {
    process.exitCode = 1;
  }
}

export function verifyVsixContents(vsixPath: string): VerificationResult[] {
  const entries = listVsixEntries(vsixPath);
  const entrySet = new Set(entries);
  const manifestPath = "extension/media/webview/.vite/manifest.json";
  const manifest = readVsixText(vsixPath, manifestPath);
  const manifestJson = parseJson(manifest);
  const entry = findManifestEntry(manifestJson);
  const scriptFile = typeof entry?.file === "string" ? `extension/media/webview/${entry.file}` : undefined;
  const styleFiles = Array.isArray(entry?.css)
    ? entry.css.filter((item): item is string => typeof item === "string").map((file) => `extension/media/webview/${file}`)
    : [];

  return [
    check("VSIX file", fs.existsSync(vsixPath), vsixPath),
    check("extension/package.json", entrySet.has("extension/package.json"), "package manifest must be packaged"),
    check("extension/out/extension.js", entrySet.has("extension/out/extension.js"), "compiled extension entry must be packaged"),
    check("webview Vite manifest", entrySet.has(manifestPath), "Vite manifest must be packaged"),
    check("webview JavaScript asset", Boolean(scriptFile && entrySet.has(scriptFile)), scriptFile ?? "manifest entry file is missing"),
    check("webview CSS asset", styleFiles.length === 0 || styleFiles.every((file) => entrySet.has(file)), styleFiles.join(", ") || "no CSS emitted"),
    check("runtime dependency fast-xml-parser", entrySet.has("extension/node_modules/fast-xml-parser/package.json"), "fast-xml-parser must be packaged for extension-host ROS XML parsing"),
    check("runtime dependency strnum", entrySet.has("extension/node_modules/strnum/package.json"), "strnum must be packaged as fast-xml-parser runtime dependency"),
    check("runtime dependency yaml", entrySet.has("extension/node_modules/yaml/package.json"), "yaml must be packaged for extension-host ROS config parsing"),
    check("Activity Bar icon", entrySet.has("extension/media/codicon-map.svg"), "Activity Bar icon must be packaged")
  ];
}

function resolveVsixPath(argument: string | undefined): string {
  if (argument) {
    return path.resolve(repositoryRoot, argument);
  }

  const candidates = fs.readdirSync(repositoryRoot)
    .filter((entry) => entry.endsWith(".vsix"))
    .map((entry) => path.join(repositoryRoot, entry))
    .sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs);
  if (candidates[0]) {
    return candidates[0];
  }
  return path.join(repositoryRoot, "live-architecture-map-0.0.1.vsix");
}

function listVsixEntries(vsixPath: string): string[] {
  try {
    return cp.execFileSync("unzip", ["-Z1", vsixPath], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).split(/\r?\n/).filter(Boolean);
  } catch {
    return [];
  }
}

function readVsixText(vsixPath: string, entryPath: string): string {
  try {
    return cp.execFileSync("unzip", ["-p", vsixPath, entryPath], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch {
    return "";
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function findManifestEntry(manifest: unknown): { file?: unknown; css?: unknown } | undefined {
  if (typeof manifest !== "object" || manifest === null || Array.isArray(manifest)) {
    return undefined;
  }
  const entries = manifest as Record<string, { file?: unknown; css?: unknown; isEntry?: unknown }>;
  return entries["src/webview-app/main.tsx"] ?? Object.values(entries).find((entry) => entry.isEntry === true);
}

function check(name: string, ok: boolean, detail: string): VerificationResult {
  return {
    name,
    ok,
    detail: ok ? "ok" : detail
  };
}

function formatResults(vsixPath: string, results: readonly VerificationResult[]): string {
  return [
    `VSIX: ${path.relative(repositoryRoot, vsixPath)}`,
    ...results.map((result) => `${result.ok ? "PASS" : "FAIL"} ${result.name}: ${result.detail}`)
  ].join("\n");
}

function appendValidationReport(vsixPath: string, results: readonly VerificationResult[]): void {
  const artifactsRoot = path.join(repositoryRoot, "artifacts");
  fs.mkdirSync(artifactsRoot, { recursive: true });
  fs.appendFileSync(
    path.join(artifactsRoot, "validation-report.md"),
    `
## VSIX Verification

Result: ${results.every((result) => result.ok) ? "passed" : "failed"}.

VSIX: ${path.relative(repositoryRoot, vsixPath)}

${results.map((result) => `- ${result.ok ? "PASS" : "FAIL"} ${result.name}: ${result.detail}`).join("\n")}
`,
    "utf8"
  );
}
