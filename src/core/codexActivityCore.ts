import {
  ChangedFile,
  CodexActivity,
  CodexActivityPhase,
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

export interface ActivityCandidate {
  source: CodexActivity["source"];
  confidence: ConfidenceLevel;
  activeFeature?: string;
  currentIntent?: string;
  modifiedFiles: string[];
  validationStatus?: ValidationStatus["state"];
  phase?: CodexActivity["phase"];
  phaseState?: CodexActivityPhase;
  scope?: string;
  note?: string;
  diagnostics: string[];
}

export interface CodexActivityCandidates {
  status?: ActivityCandidate;
  metadata?: ActivityCandidate;
  worklog?: ActivityCandidate;
  gitWatch: ActivityCandidate;
  statusDiagnostics?: readonly string[];
}

export function buildCodexActivityFromCandidates(
  input: CodexActivityInput,
  candidates: CodexActivityCandidates
): CodexActivity {
  const chosen = candidates.status ?? candidates.metadata ?? candidates.worklog ?? candidates.gitWatch;
  const fallbackFeature = inferActiveFeature(input.impactedFeatures);
  const validationStatus = chosen.validationStatus ?? inferValidationStatus(input.validations);
  const gitWatchFiles = uniquePaths([
    ...candidates.gitWatch.modifiedFiles,
    ...input.changedFiles.map((file) => file.path),
    ...input.changedPaths,
    ...input.deletedPaths
  ]);
  const modifiedFiles = chosen.source === "status"
    ? gitWatchFiles
    : uniquePaths([...chosen.modifiedFiles, ...gitWatchFiles]);

  return {
    source: chosen.source,
    confidence: chosen.confidence,
    activeFeature: chosen.activeFeature ?? fallbackFeature,
    currentIntent: chosen.currentIntent ?? inferIntent(input.impactedFeatures, modifiedFiles),
    modifiedFiles,
    validationStatus,
    updatedAtIso: input.timestampIso,
    phase: chosen.phase,
    phaseState: chosen.phaseState,
    scope: chosen.scope,
    note: chosen.note,
    diagnostics: [
      ...(candidates.statusDiagnostics ?? []),
      ...chosen.diagnostics,
      `Activity merge considered ${input.changedFiles.length} git/API changed files and ${input.changedPaths.length + input.deletedPaths.length} watcher paths.`
    ]
  };
}

export function inferActiveFeature(impactedFeatures: readonly ImpactedFeature[]): string | undefined {
  return [...impactedFeatures]
    .sort((left, right) => right.changedFileCount - left.changedFileCount || riskRank(right.riskLevel) - riskRank(left.riskLevel))
    .at(0)?.featureId;
}

export function inferIntent(impactedFeatures: readonly ImpactedFeature[], modifiedFiles: readonly string[]): string {
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

export function inferValidationStatus(validations: readonly ValidationStatus[]): ValidationStatus["state"] {
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

export function validationState(value: unknown): ValidationStatus["state"] | undefined {
  return value === "passed" || value === "running" || value === "failed" || value === "unknown" || value === "notRun"
    ? value
    : undefined;
}

export function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

export function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => typeof item === "string" ? item.trim() : "").filter(Boolean)
    : [];
}

export function uniquePaths(values: readonly string[]): string[] {
  return [...new Set(values
    .map((value) => value.replaceAll("\\", "/").replace(/^\/+/, "").trim())
    .filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
}

function riskRank(level: ImpactedFeature["riskLevel"]): number {
  switch (level) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
  }
}
