import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./visual",
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    viewport: {
      width: 1920,
      height: 1080
    },
    deviceScaleFactor: 1,
    colorScheme: "dark",
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium"
      }
    }
  ],
  outputDir: "test-results"
});
