import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
  files: "out-test/test/vscode/**/*.test.js",
  workspaceFolder: ".",
  mocha: {
    timeout: 60000,
    ui: "tdd"
  },
  launchArgs: [
    "--disable-gpu",
    "--disable-workspace-trust"
  ]
});
