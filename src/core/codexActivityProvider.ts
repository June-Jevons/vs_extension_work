import * as cp from "child_process";
import * as vscode from "vscode";
import {
  ChangedFile,
  CodexActivity,
  ConfidenceLevel,
  ImpactedFeature,
  ValidationStatus
} from "../webview/dashboardState";

export interface CodexActivityInput {
  changedFiles: readonly ChangedFile[];
  impactedFeatures: readonly ImpactedFeature[];
  validations: readonly ValidationStatus[];
  changedPaths: readonly string[];
  deletedPaths: readonly string[];
  timestampIso: string;
}

interface ActivityCandidate {
  source: CodexActivity["source"];
  confidence: ConfidenceLevel;
  activeFeature?: string;
  currentIntent?: string;
  modifiedFiles: string[];
  validationStatus?: ValidationStatus["state"];
  diagnostics: string[];
}

interface MetadataShape {
  activeFeature?: unknown;
  currentIntent?: unknown;
  intent?: unknown;
  modifiedFiles?: unknown;
  changedFiles?: unknown;
  validationStatus?: unknown;
  updatedAtIso?: unknown;
  diagnostics?: unknown;
}

export async function getCodexActivity(
  folder: vscode.WorkspaceFolder,
  input: CodexActivityInput
): Promise<CodexActivity> {
  const metadata = await readMetadataCandidate(folder);
  const worklog = metadata ? undefined : await readWorklogCandidate(folder);
  const gitWatch = await buildGitWatchCandidate(folder, input);
  const chosen = metadata ?? worklog ?? gitWatch;
  const fallbackFeature = inferActiveFeature(input.impactedFeatures);
  const validationStatus = chosen.validationStatus ?? inferValidationStatus(input.validations);
  const modifiedFiles = uniquePaths([
    ...chosen.modifiedFiles,
    ...input.changedFiles.map((file) => file.path),
    ...input.changedPaths,
    ...input.deletedPaths
  ]);

  return {
    source: chosen.source,
    confidence: chosen.confidence,
    activeFeature: chosen.activeFeature ?? fallbackFeature,
    currentIntent: chosen.currentIntent ?? inferIntent(input.impactedFeatures, modifiedFiles),
    modifiedFiles,
    validationStatus,
    updatedAtIso: metadata?.source === "metadata" ? input.timestampIso : input.timestampIso,
    diagnostics: [
      ...chosen.diagnostics,
      `Activity merge considered ${input.changedFiles.length} git/API changed files and ${input.changedPaths.length + input.deletedPaths.length} watcher paths.`
    ]
  };
}

async function readMetadataCandidate(folder: vscode.WorkspaceFolder): Promise<ActivityCandidate | undefined> {
  const uri = vscode.Uri.joinPath(folder.uri, ".codex", "live-architecture", "activity.json");
  const source = await readUtf8(uri);
  if (!source) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(source) as MetadataShape;
    return {
      source: "metadata",
      confidence: "high",
      activeFeature: stringValue(parsed.activeFeature),
      currentIntent: stringValue(parsed.currentIntent) ?? stringValue(parsed.intent),
      modifiedFiles: arrayOfStrings(parsed.modifiedFiles ?? parsed.changedFiles),
      validationStatus: validationState(parsed.validationStatus),
      diagnostics: [
        "Read .codex/live-architecture/activity.json metadata.",
        ...arrayOfStrings(parsed.diagnostics).slice(0, 6)
      ]
    };
  } catch (error: unknown) {
    return {
      source: "metadata",
      confidence: "low",
      modifiedFiles: [],
      diagnostics: [`Codex metadata exists but could not be parsed: ${error instanceof Error ? error.message : "unknown error"}`]
    };
  }
}

async function readWorklogCandidate(folder: vscode.WorkspaceFolder): Promise<ActivityCandidate | undefined> {
  const uri = vscode.Uri.joinPath(folder.uri, "CODEX_WORKLOG.md");
  const source = await readUtf8(uri);
  if (!source) {
    return undefined;
  }

  const lines = source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const latestLines = lines.slice(-18);
  const activeFeature = parseWorklogField(latestLines, "active feature") ?? parseWorklogField(latestLines, "feature");
  const validation = parseWorklogField(latestLines, "validation");
  const intent = parseWorklogField(latestLines, "intent")
    ?? findLastLine(latestLines, (line) => /^[-*]\s+/.test(line))?.replace(/^[-*]\s+/, "")
    ?? latestLines.at(-1);

  return {
    source: "worklog",
    confidence: "medium",
    activeFeature,
    currentIntent: intent,
    modifiedFiles: parseMentionedFiles(latestLines.join("\n")),
    validationStatus: validationState(validation),
    diagnostics: ["Read CODEX_WORKLOG.md activity notes."]
  };
}

async function buildGitWatchCandidate(
  folder: vscode.WorkspaceFolder,
  input: CodexActivityInput
): Promise<ActivityCandidate> {
  const gitFiles = await readGitDiffFiles(folder.uri.fsPath);
  const modifiedFiles = uniquePaths([
    ...gitFiles,
    ...input.changedFiles.map((file) => file.path),
    ...input.changedPaths,
    ...input.deletedPaths
  ]);
  const source: CodexActivity["source"] = modifiedFiles.length > 0 ? "git-watch" : "none";
  return {
    source,
    confidence: modifiedFiles.length > 0 ? "low" : "low",
    activeFeature: inferActiveFeature(input.impactedFeatures),
    currentIntent: inferIntent(input.impactedFeatures, modifiedFiles),
    modifiedFiles,
    validationStatus: inferValidationStatus(input.validations),
    diagnostics: [
      modifiedFiles.length > 0
        ? "No Codex metadata/worklog found; inferred activity from Git and watcher changes."
        : "No Codex metadata/worklog or changed files found."
    ]
  };
}

function readGitDiffFiles(cwd: string): Promise<string[]> {
  return Promise.all([
    execGit(["diff", "--name-status", "--numstat"], cwd),
    execGit(["diff", "--cached", "--name-status", "--numstat"], cwd)
  ]).then((outputs) => uniquePaths(outputs.flatMap(parseGitDiffOutput)));
}

function execGit(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve) => {
    cp.execFile("git", args, { cwd, timeout: 5000 }, (error, stdout) => {
      resolve(error ? "" : stdout);
    });
  });
}

function parseGitDiffOutput(output: string): string[] {
  const paths: string[] = [];
  for (const line of output.split(/\r?\n/)) {
    const parts = line.split(/\t+/).map((part) => part.trim()).filter(Boolean);
    if (parts.length === 0) {
      continue;
    }
    if (/^[MADRCU?]/.test(parts[0] ?? "") && parts[1]) {
      paths.push(parts.at(-1) ?? parts[1]);
      continue;
    }
    if (/^-|\d+$/.test(parts[0] ?? "") && /^-|\d+$/.test(parts[1] ?? "") && parts[2]) {
      paths.push(parts.at(-1) ?? parts[2]);
    }
  }
  return paths;
}

async function readUtf8(uri: vscode.Uri): Promise<string | undefined> {
  try {
    const buffer = await vscode.workspace.fs.readFile(uri);
    return Buffer.from(buffer).toString("utf8");
  } catch {
    return undefined;
  }
}

function parseWorklogField(lines: readonly string[], field: string): string | undefined {
  const regex = new RegExp(`^[-*#\\s]*${escapeRegExp(field)}\\s*[:=-]\\s*(.+)$`, "i");
  for (const line of [...lines].reverse()) {
    const match = regex.exec(line);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return undefined;
}

function parseMentionedFiles(text: string): string[] {
  const matches = text.match(/[A-Za-z0-9_./-]+\.(?:py|ts|tsx|js|json|md|ya?ml|xml|toml)/g) ?? [];
  return uniquePaths(matches);
}

function findLastLine(lines: readonly string[], predicate: (line: string) => boolean): string | undefined {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (line && predicate(line)) {
      return line;
    }
  }
  return undefined;
}

function inferActiveFeature(impactedFeatures: readonly ImpactedFeature[]): string | undefined {
  return [...impactedFeatures]
    .sort((left, right) => right.changedFileCount - left.changedFileCount || riskRank(right.riskLevel) - riskRank(left.riskLevel))
    .at(0)?.featureId;
}

function inferIntent(impactedFeatures: readonly ImpactedFeature[], modifiedFiles: readonly string[]): string {
  const active = [...impactedFeatures]
    .sort((left, right) => right.changedFileCount - left.changedFileCount || riskRank(right.riskLevel) - riskRank(left.riskLevel))
    .at(0);
  if (active) {
    return `Reviewing ${active.label} changes and their runtime impact.`;
  }
  if (modifiedFiles.length > 0) {
    return `Reviewing ${modifiedFiles.length} modified file${modifiedFiles.length === 1 ? "" : "s"}.`;
  }
  return "No active Codex change area detected.";
}

function inferValidationStatus(validations: readonly ValidationStatus[]): ValidationStatus["state"] {
  if (validations.some((validation) => validation.state === "failed")) {
    return "failed";
  }
  if (validations.some((validation) => validation.state === "running")) {
    return "running";
  }
  if (validations.length > 0 && validations.every((validation) => validation.state === "passed")) {
    return "passed";
  }
  if (validations.some((validation) => validation.state === "unknown")) {
    return "unknown";
  }
  return "notRun";
}

function validationState(value: unknown): ValidationStatus["state"] | undefined {
  return value === "passed" || value === "running" || value === "failed" || value === "unknown" || value === "notRun"
    ? value
    : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => typeof item === "string" ? item.trim() : "").filter(Boolean)
    : [];
}

function uniquePaths(values: readonly string[]): string[] {
  return [...new Set(values
    .map((value) => value.replaceAll("\\", "/").replace(/^\/+/, "").trim())
    .filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
}

function riskRank(risk: ImpactedFeature["riskLevel"]): number {
  return risk === "high" ? 3 : risk === "medium" ? 2 : 1;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
