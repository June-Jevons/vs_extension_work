import * as assert from "assert";
import { parsePythonImports, resolveLocalImport } from "../../src/graph/importParser";

const imports = parsePythonImports(`
import os
import abb_common.config.runtime_config as runtime_config, sys
from operator_panel.launcher import start as start_panel
from .local import helper
from . import sibling
from ..pkg import mod as pkg_mod
`);

assert.deepStrictEqual(
  imports.map((item) => item.module),
  ["os", "abb_common.config.runtime_config", "sys", "operator_panel.launcher", ".local", ".", "..pkg"]
);
assert.strictEqual(imports[3]?.importedName, "start");
assert.strictEqual(imports[4]?.importedName, "helper");
assert.strictEqual(imports[5]?.importedName, "sibling");

const localModules = new Set([
  "abb_common/config/runtime_config",
  "operator_panel/launcher",
  "package/local",
  "package/sibling",
  "pkg/mod"
]);
assert.strictEqual(resolveLocalImport("abb_common.config.runtime_config", localModules), "abb_common/config/runtime_config");
assert.strictEqual(resolveLocalImport("operator_panel.launcher.start", localModules), "operator_panel/launcher");
assert.strictEqual(resolveLocalImport(imports[4]!, localModules, "package/current"), "package/local");
assert.strictEqual(resolveLocalImport(imports[5]!, localModules, "package/current"), "package/sibling");
assert.strictEqual(resolveLocalImport(imports[6]!, localModules, "package/current"), "pkg/mod");
assert.strictEqual(resolveLocalImport("json", localModules), undefined);
