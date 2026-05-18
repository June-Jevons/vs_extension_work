import { defineConfig } from "@vscode/test-cli";
import path from "path";

const testRunId = `${Date.now()}-${process.pid}`;
const testProfileRoot = path.resolve(".vscode-test", "isolated", testRunId);

export default defineConfig({
  files: "out-test/test/vscode/**/*.test.js",
  workspaceFolder: ".",
  mocha: {
    timeout: 60000,
    ui: "tdd"
  },
  launchArgs: [
    "--disable-gpu",
    "--disable-workspace-trust",
    `--user-data-dir=${path.join(testProfileRoot, "user-data")}`,
    `--extensions-dir=${path.join(testProfileRoot, "extensions")}`
  ]
});
