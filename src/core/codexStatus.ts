import {
  CodexActivityPhase,
  CodexActivityPhaseCode,
  ValidationStatus
} from "../webview/dashboardState";
import { ActivityCandidate, stringValue } from "./codexActivityCore";

interface StatusJsonShape {
  p?: unknown;
  f?: unknown;
  n?: unknown;
}

interface ParsedCodexStatus {
  phase: CodexActivityPhaseCode;
  phaseState: CodexActivityPhase;
  scope: string;
  note?: string;
  validationStatus?: ValidationStatus["state"];
  currentIntent: string;
}

export interface CodexStatusCandidateResult {
  candidate?: ActivityCandidate;
  diagnostics: string[];
}

const phaseMap: Record<CodexActivityPhaseCode, CodexActivityPhase> = {
  plan: "planning",
  scan: "scanning",
  edit: "editing",
  test: "testing",
  fix: "fixing",
  done: "done",
  block: "blocked"
};

export function createStatusActivityCandidate(source: string): CodexStatusCandidateResult {
  const parsed = parseCodexStatusJson(source);
  if (!parsed.status) {
    return {
      diagnostics: parsed.diagnostics
    };
  }

  return {
    candidate: {
      source: "status",
      confidence: "high",
      activeFeature: parsed.status.scope,
      currentIntent: parsed.status.currentIntent,
      modifiedFiles: [],
      validationStatus: parsed.status.validationStatus,
      phase: parsed.status.phase,
      phaseState: parsed.status.phaseState,
      scope: parsed.status.scope,
      note: parsed.status.note,
      diagnostics: ["Read .codex/status.json live status."]
    },
    diagnostics: []
  };
}

export function parseCodexStatusJson(source: string): { status?: ParsedCodexStatus; diagnostics: string[] } {
  let parsed: StatusJsonShape;
  try {
    parsed = JSON.parse(source) as StatusJsonShape;
  } catch (error: unknown) {
    return {
      diagnostics: [`Codex status source low confidence: .codex/status.json could not be parsed: ${error instanceof Error ? error.message : "unknown error"}`]
    };
  }

  if (!isRecord(parsed)) {
    return {
      diagnostics: ["Codex status source low confidence: .codex/status.json must contain a JSON object."]
    };
  }

  const phase = stringValue(parsed.p);
  const scope = compactValue(parsed.f, 80);
  if (!phase || !isStatusPhaseCode(phase)) {
    return {
      diagnostics: ["Codex status source low confidence: .codex/status.json requires p to be one of plan, scan, edit, test, fix, done, or block."]
    };
  }
  if (!scope) {
    return {
      diagnostics: ["Codex status source low confidence: .codex/status.json requires compact f scope."]
    };
  }

  const note = compactValue(parsed.n, 48);
  const currentIntent = [phase, scope, note].filter(Boolean).join(" / ");

  return {
    status: {
      phase,
      phaseState: phaseMap[phase],
      scope,
      note,
      validationStatus: validationStateForStatusPhase(phase),
      currentIntent
    },
    diagnostics: []
  };
}

function validationStateForStatusPhase(phase: CodexActivityPhaseCode): ValidationStatus["state"] | undefined {
  switch (phase) {
    case "test":
      return "running";
    case "fix":
      return "failed";
    case "done":
      return "passed";
    case "block":
      return "unknown";
    case "plan":
    case "scan":
    case "edit":
      return undefined;
  }
}

function isStatusPhaseCode(value: string): value is CodexActivityPhaseCode {
  return Object.hasOwn(phaseMap, value);
}

function compactValue(value: unknown, maxLength: number): string | undefined {
  const text = stringValue(value)?.replace(/\s+/g, " ");
  if (!text) {
    return undefined;
  }
  return text.length > maxLength ? text.slice(0, maxLength).trimEnd() : text;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
