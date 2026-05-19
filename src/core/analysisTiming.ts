export type AnalysisTimingPhase =
  | "scanner/index discovery"
  | "cache read"
  | "file stat/hash"
  | "file read"
  | "parse imports/metrics"
  | "dependency resolve"
  | "feature mapping"
  | "risk scoring"
  | "Git status"
  | "architecture fact scan"
  | "Codex activity"
  | "graph view model generation"
  | "ELK layout"
  | "cache write"
  | "total refresh";

export interface AnalysisTimingEntry {
  phase: AnalysisTimingPhase;
  durationMs: number;
}

export class AnalysisTimingRecorder {
  private readonly durations = new Map<AnalysisTimingPhase, number>();
  private readonly startedAt = nowMs();

  async measure<T>(phase: AnalysisTimingPhase, action: () => Promise<T>): Promise<T> {
    const started = nowMs();
    try {
      return await action();
    } finally {
      this.addDuration(phase, nowMs() - started);
    }
  }

  measureSync<T>(phase: AnalysisTimingPhase, action: () => T): T {
    const started = nowMs();
    try {
      return action();
    } finally {
      this.addDuration(phase, nowMs() - started);
    }
  }

  addDuration(phase: AnalysisTimingPhase, durationMs: number): void {
    this.durations.set(phase, (this.durations.get(phase) ?? 0) + durationMs);
  }

  finish(): AnalysisTimingEntry[] {
    this.durations.set("total refresh", nowMs() - this.startedAt);
    return phaseOrder.map((phase) => ({
      phase,
      durationMs: roundDuration(this.durations.get(phase) ?? 0)
    }));
  }
}

export function formatAnalysisTimings(timings: readonly { phase: string; durationMs: number }[]): string {
  return timings
    .map((entry) => `${entry.phase}=${entry.durationMs.toFixed(1)}ms`)
    .join(", ");
}

const phaseOrder: AnalysisTimingPhase[] = [
  "scanner/index discovery",
  "cache read",
  "file stat/hash",
  "file read",
  "parse imports/metrics",
  "dependency resolve",
  "feature mapping",
  "risk scoring",
  "Git status",
  "architecture fact scan",
  "Codex activity",
  "graph view model generation",
  "ELK layout",
  "cache write",
  "total refresh"
];

function nowMs(): number {
  return Number(process.hrtime.bigint()) / 1_000_000;
}

function roundDuration(value: number): number {
  return Math.round(value * 10) / 10;
}
