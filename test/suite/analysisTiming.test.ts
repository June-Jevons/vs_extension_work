import * as assert from "assert";
import { AnalysisTimingRecorder, formatAnalysisTimings } from "../../src/core/analysisTiming";

const timing = new AnalysisTimingRecorder();
const value = timing.measureSync("cache read", () => 42);
assert.strictEqual(value, 42);
const entries = timing.finish();

assert.ok(entries.some((entry) => entry.phase === "cache read" && entry.durationMs >= 0));
assert.ok(entries.some((entry) => entry.phase === "total refresh" && entry.durationMs >= 0));
assert.ok(formatAnalysisTimings(entries).includes("cache read="));

console.log("Analysis timing checks passed.");
