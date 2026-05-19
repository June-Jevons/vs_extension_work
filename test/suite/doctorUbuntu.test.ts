import * as assert from "assert";
import * as path from "path";
import { hasDoctorFailures, runUbuntuDoctor } from "../../scripts/doctor-ubuntu";

const repositoryRoot = path.resolve(__dirname, "..", "..", "..");

const checks = runUbuntuDoctor({
  repositoryRoot,
  platform: "linux",
  nodeVersion: "v20.20.2",
  npmVersion: "10.8.2",
  commandExists: () => true,
  pathExists: () => true
});

assert.strictEqual(hasDoctorFailures(checks), false, checks.filter((item) => !item.ok).map((item) => item.detail).join("\n"));

const wrongPlatform = runUbuntuDoctor({
  repositoryRoot,
  platform: "win32",
  nodeVersion: "v20.20.2",
  npmVersion: "10.8.2",
  commandExists: () => true,
  pathExists: () => true
});
assert.ok(wrongPlatform.some((item) => item.name === "platform" && !item.ok));

const oldNode = runUbuntuDoctor({
  repositoryRoot,
  platform: "linux",
  nodeVersion: "v18.20.0",
  npmVersion: "10.8.2",
  commandExists: () => true,
  pathExists: () => true
});
assert.ok(oldNode.some((item) => item.name === "node engine" && !item.ok));

console.log("Ubuntu doctor checks passed.");
