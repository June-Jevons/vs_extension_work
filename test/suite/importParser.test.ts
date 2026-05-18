import * as assert from "assert";
import { parsePythonImports, resolveLocalImport } from "../../src/graph/importParser";

const imports = parsePythonImports(`
import os
import abb_common.config.runtime_config as runtime_config, sys
from operator_panel.launcher import start as start_panel
from .local import ignored
`);

assert.deepStrictEqual(
  imports.map((item) => item.module),
  ["os", "abb_common.config.runtime_config", "sys", "operator_panel.launcher"]
);
assert.strictEqual(imports[3]?.importedName, "start");

const localModules = new Set(["abb_common/config/runtime_config", "operator_panel/launcher"]);
assert.strictEqual(resolveLocalImport("abb_common.config.runtime_config", localModules), "abb_common/config/runtime_config");
assert.strictEqual(resolveLocalImport("operator_panel.launcher.start", localModules), "operator_panel/launcher");
assert.strictEqual(resolveLocalImport("json", localModules), undefined);
