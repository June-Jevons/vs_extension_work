import * as assert from "assert";
import { buildRiskSummary, scoreModuleRisk } from "../../src/core/riskScorer";

assert.strictEqual(scoreModuleRisk("src/abb_common/config/runtime_config.py", 1).level, "high");
assert.strictEqual(scoreModuleRisk("src/safety/collision_checker.py", 0).level, "high");
assert.strictEqual(scoreModuleRisk("tests/config/test_runtime_config.py", 0).level, "low");
assert.strictEqual(scoreModuleRisk("src/common/helpers.py", 3).level, "medium");
assert.strictEqual(scoreModuleRisk("src/common/fan_in.py", 5).level, "high");

const summary = buildRiskSummary([
  {
    path: "src/config.py",
    status: "modified",
    riskLevel: "high",
    reason: "Config risk"
  },
  {
    path: "tests/test_config.py",
    status: "modified",
    riskLevel: "low",
    reason: "Test risk"
  }
]);

assert.strictEqual(summary.find((item) => item.level === "high")?.count, 1);
assert.strictEqual(summary.find((item) => item.level === "medium")?.count, 0);
assert.strictEqual(summary.find((item) => item.level === "low")?.count, 1);
