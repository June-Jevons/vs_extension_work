import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import {
  ActivityCandidate,
  buildCodexActivityFromCandidates,
  CodexActivityInput
} from "../../src/core/codexActivityCore";
import { createStatusActivityCandidate } from "../../src/core/codexStatus";
import { CodexActivitySource } from "../../src/webview/dashboardState";

const repositoryRoot = path.resolve(__dirname, "..", "..", "..");
const providerSource = fs.readFileSync(path.join(repositoryRoot, "src", "core", "codexActivityProvider.ts"), "utf8");
const watcherSource = fs.readFileSync(path.join(repositoryRoot, "src", "watchers", "workspaceWatcher.ts"), "utf8");

assert.ok(providerSource.includes(".codex\", \"status.json\""), "Codex activity provider should read .codex/status.json first");
assert.ok(providerSource.includes(".codex\", \"live-architecture\", \"activity.json\""), "Codex activity provider should keep .codex/live-architecture/activity.json fallback");
assert.ok(providerSource.includes("CODEX_WORKLOG.md"), "Codex activity provider should keep CODEX_WORKLOG.md fallback");
assert.ok(providerSource.includes("\"diff\", \"--name-status\", \"--numstat\""), "Codex activity provider should inspect read-only git diff name/status/numstat output");
assert.ok(providerSource.includes("inferValidationStatus"), "Codex activity provider should infer validation status when explicit activity does not provide one");
assert.ok(watcherSource.includes("\"**/.codex/status.json\""), "Workspace watcher should explicitly refresh on .codex/status.json changes");

const parsed = createStatusActivityCandidate("{\"p\":\"edit\",\"f\":\"whole-arch\"}");
assert.ok(parsed.candidate, "Minimal .codex/status.json should produce an activity candidate");
assert.strictEqual(parsed.candidate?.source, "status");
assert.strictEqual(parsed.candidate?.confidence, "high");
assert.strictEqual(parsed.candidate?.activeFeature, "whole-arch");
assert.strictEqual(parsed.candidate?.currentIntent, "edit / whole-arch");
assert.strictEqual(parsed.candidate?.modifiedFiles.length, 0);
assert.strictEqual(parsed.candidate?.phase, "edit");
assert.strictEqual(parsed.candidate?.phaseState, "editing");
assert.strictEqual(parsed.candidate?.scope, "whole-arch");

const blocked = createStatusActivityCandidate("{\"p\":\"block\",\"f\":\"scanner\",\"n\":\"git\"}");
assert.strictEqual(blocked.candidate?.currentIntent, "block / scanner / git");
assert.strictEqual(blocked.candidate?.validationStatus, "unknown");

const statusActivity = buildCodexActivityFromCandidates(baseInput(), {
  status: parsed.candidate,
  metadata: candidate("metadata", {
    activeFeature: "metadata-feature",
    currentIntent: "metadata intent",
    modifiedFiles: ["metadata-only.py"]
  }),
  worklog: candidate("worklog", {
    activeFeature: "worklog-feature",
    currentIntent: "worklog intent",
    modifiedFiles: ["worklog-only.py"]
  }),
  gitWatch: candidate("git-watch", {
    modifiedFiles: ["src/git.py"]
  })
});
assert.strictEqual(statusActivity.source, "status");
assert.strictEqual(statusActivity.activeFeature, "whole-arch");
assert.strictEqual(statusActivity.currentIntent, "edit / whole-arch");
assert.deepStrictEqual(statusActivity.modifiedFiles, [
  "src/api.py",
  "src/git.py",
  "src/watch.py"
]);

const statusWithFiles = createStatusActivityCandidate(JSON.stringify({
  p: "edit",
  f: "whole-arch",
  modifiedFiles: ["status-should-not-win.py"],
  changedFiles: ["also-ignored.py"]
}));
const ignoredFilesActivity = buildCodexActivityFromCandidates(baseInput(), {
  status: statusWithFiles.candidate,
  gitWatch: candidate("git-watch", {
    modifiedFiles: ["src/git.py"]
  })
});
assert.deepStrictEqual(ignoredFilesActivity.modifiedFiles, [
  "src/api.py",
  "src/git.py",
  "src/watch.py"
]);
assert.ok(!ignoredFilesActivity.modifiedFiles.includes("status-should-not-win.py"));
assert.ok(!ignoredFilesActivity.modifiedFiles.includes("also-ignored.py"));

const metadataActivity = buildCodexActivityFromCandidates(baseInput(), {
  metadata: candidate("metadata", {
    activeFeature: "graph",
    currentIntent: "metadata intent",
    modifiedFiles: ["metadata-file.py"]
  }),
  worklog: candidate("worklog", {
    activeFeature: "worklog",
    currentIntent: "worklog intent"
  }),
  gitWatch: candidate("git-watch", {
    modifiedFiles: ["src/git.py"]
  })
});
assert.strictEqual(metadataActivity.source, "metadata");
assert.strictEqual(metadataActivity.activeFeature, "graph");
assert.ok(metadataActivity.modifiedFiles.includes("metadata-file.py"));

const worklogActivity = buildCodexActivityFromCandidates(baseInput(), {
  worklog: candidate("worklog", {
    activeFeature: "codex-review",
    currentIntent: "worklog intent"
  }),
  gitWatch: candidate("git-watch", {
    modifiedFiles: ["src/git.py"]
  })
});
assert.strictEqual(worklogActivity.source, "worklog");
assert.strictEqual(worklogActivity.activeFeature, "codex-review");

const gitWatchActivity = buildCodexActivityFromCandidates(baseInput(), {
  gitWatch: candidate("git-watch", {
    modifiedFiles: ["src/git.py"]
  })
});
assert.strictEqual(gitWatchActivity.source, "git-watch");
assert.deepStrictEqual(gitWatchActivity.modifiedFiles, [
  "src/api.py",
  "src/git.py",
  "src/watch.py"
]);

const malformedStatus = createStatusActivityCandidate("{not-json");
assert.strictEqual(malformedStatus.candidate, undefined);
assert.ok(malformedStatus.diagnostics.some((entry) => entry.includes("low confidence")));
const emptyStatus = createStatusActivityCandidate("");
assert.strictEqual(emptyStatus.candidate, undefined);
assert.ok(emptyStatus.diagnostics.some((entry) => entry.includes("could not be parsed")));
const malformedFallbackActivity = buildCodexActivityFromCandidates(baseInput(), {
  metadata: candidate("metadata", {
    activeFeature: "graph",
    currentIntent: "metadata survives malformed status"
  }),
  gitWatch: candidate("git-watch"),
  statusDiagnostics: malformedStatus.diagnostics
});
assert.strictEqual(malformedFallbackActivity.source, "metadata");
assert.ok(malformedFallbackActivity.diagnostics.some((entry) => entry.includes(".codex/status.json could not be parsed")));

const statusSource: CodexActivitySource = "status";
assert.strictEqual(statusSource, "status");

console.log("Codex activity provider contract checks passed.");

function baseInput(): CodexActivityInput {
  return {
    changedFiles: [
      {
        path: "src/api.py",
        status: "modified",
        riskLevel: "medium",
        reason: "API changed."
      }
    ],
    impactedFeatures: [],
    validations: [
      {
        id: "compile",
        label: "Compile",
        state: "passed",
        detail: "Fixture validation."
      }
    ],
    changedPaths: ["src/watch.py"],
    deletedPaths: [],
    timestampIso: "2026-05-19T03:00:00.000Z"
  };
}

function candidate(
  source: ActivityCandidate["source"],
  overrides: Partial<ActivityCandidate> = {}
): ActivityCandidate {
  return {
    source,
    confidence: source === "metadata" ? "high" : "low",
    modifiedFiles: [],
    diagnostics: [`${source} fixture.`],
    ...overrides
  };
}
