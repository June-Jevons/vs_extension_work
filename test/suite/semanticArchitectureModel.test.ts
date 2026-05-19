import * as assert from "assert";
import { getSemanticFeatureDefinition, getSemanticFeatureDefinitions } from "../../src/webview/semanticArchitectureModel";

const expectedRuntimeFeatures = [
  "gui-layer",
  "task-runner",
  "motion-planning",
  "safety-layer",
  "robot-io-layer",
  "config-system",
  "ros-bridge-runtime",
  "utils-common",
  "unmapped-unknown"
];

for (const featureId of expectedRuntimeFeatures) {
  const definition = getSemanticFeatureDefinition(featureId);
  assert.ok(definition, `${featureId} should have a semantic definition`);
  assert.ok(definition.flowSteps.length > 0, `${featureId} should define semantic flow steps`);
  assert.ok(definition.layer.length > 0, `${featureId} should define a layer`);
  assert.ok(definition.role.length > 0, `${featureId} should define a runtime role`);
}

assert.strictEqual(getSemanticFeatureDefinition("tests"), undefined, "Tests should not have a user-facing semantic definition");
assert.ok(getSemanticFeatureDefinitions().every((definition) => !definition.featureId.toLowerCase().includes("test")));

const motion = getSemanticFeatureDefinition("motion-planning");
assert.ok(motion?.flowSteps.some((step) => /Motion Builder/i.test(step.label)));
assert.ok(motion?.flowSteps.some((step) => /Validation/i.test(step.label)));
assert.ok(motion?.flowSteps.some((step) => /Output/i.test(step.label)));

const gui = getSemanticFeatureDefinition("gui-layer");
assert.ok(gui?.flowSteps.some((step) => /Entry/i.test(step.label)));
assert.ok(gui?.flowSteps.some((step) => /View/i.test(step.label)));
assert.ok(gui?.flowSteps.some((step) => /Dispatch/i.test(step.label)));
assert.ok(gui?.flowSteps.some((step) => /Status/i.test(step.label)));

console.log("Semantic architecture model checks passed.");
