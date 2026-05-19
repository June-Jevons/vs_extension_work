import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";

const repositoryRoot = path.resolve(__dirname, "..", "..", "..");
const providerSource = fs.readFileSync(path.join(repositoryRoot, "src", "core", "codexActivityProvider.ts"), "utf8");

assert.ok(providerSource.includes(".codex\", \"live-architecture\", \"activity.json\""), "Codex activity provider should prefer .codex/live-architecture/activity.json metadata");
assert.ok(providerSource.includes("CODEX_WORKLOG.md"), "Codex activity provider should read CODEX_WORKLOG.md as the second activity source");
assert.ok(providerSource.includes("\"diff\", \"--name-status\", \"--numstat\""), "Codex activity provider should inspect read-only git diff name/status/numstat output");
assert.ok(providerSource.includes("metadata ?? worklog ?? gitWatch"), "Codex activity provider should prefer metadata, then worklog, then git/watch inference");
assert.ok(providerSource.includes("inferValidationStatus"), "Codex activity provider should infer validation status when explicit activity does not provide one");

console.log("Codex activity provider contract checks passed.");
