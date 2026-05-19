import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";

const gitProviderSource = fs.readFileSync(path.resolve(__dirname, "..", "..", "..", "src", "git", "gitProvider.ts"), "utf8");

assert.ok(!gitProviderSource.includes("child_process"), "live Git provider must not import child_process");
assert.ok(!gitProviderSource.includes("CLI fallback"), "live Git provider must not mention CLI fallback");
assert.ok(gitProviderSource.includes("gitUnavailable"), "live Git provider should produce an explicit unavailable state");
assert.ok(gitProviderSource.includes("VS Code Git"), "live Git provider should use the VS Code Git API");

console.log("Git provider no-fallback checks passed.");
