import * as cp from "child_process";
import * as vscode from "vscode";
import { CodexActivity } from "../webview/dashboardState";
import {
  ActivityCandidate,
  arrayOfStrings,
  buildCodexActivityFromCandidates,
  CodexActivityInput,
  inferActiveFeature,
  inferIntent,
  inferValidationStatus,
  stringValue,
  uniquePaths,
  validationState
} from "./codexActivityCore";
import { createStatusActivityCandidate } from "./codexStatus";

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
  const status = await readStatusCandidate(folder);
  const metadata = status.candidate ? undefined : await readMetadataCandidate(folder);
  const worklog = status.candidate || metadata ? undefined : await readWorklogCandidate(folder);
  const gitWatch = await buildGitWatchCandidate(folder, input);
  return buildCodexActivityFromCandidates(input, {
    status: status.candidate,
    metadata,
    worklog,
    gitWatch,
    statusDiagnostics: status.diagnostics
  });
}

async function readStatusCandidate(folder: vscode.WorkspaceFolder): Promise<{ candidate?: ActivityCandidate; diagnostics: string[] }> {
  const uri = vscode.Uri.joinPath(folder.uri, ".codex", "status.json");
  const source = await readUtf8(uri);
  if (source === undefined) {
    return { diagnostics: [] };
  }
  return createStatusActivityCandidate(source);
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
