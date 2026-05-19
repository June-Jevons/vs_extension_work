import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";

const repositoryRoot = path.resolve(__dirname, "..", "..", "..");
const scannerSource = fs.readFileSync(path.join(repositoryRoot, "src", "core", "architectureFactsScanner.ts"), "utf8");
const graphSource = fs.readFileSync(path.join(repositoryRoot, "src", "webview", "graphViewModel.ts"), "utf8");

assert.ok(scannerSource.includes("XMLParser"), "Architecture fact scanner should parse package.xml with fast-xml-parser");
assert.ok(scannerSource.includes("YAML.parse"), "Architecture fact scanner should parse YAML config files");
assert.ok(scannerSource.includes("DeclareLaunchArgument"), "Architecture fact scanner should inspect launch arguments");
assert.ok(scannerSource.includes("Node"), "Architecture fact scanner should inspect launch Node declarations");
for (const pattern of ["create_publisher", "create_subscription", "create_service", "create_client", "ActionClient", "ActionServer"]) {
  assert.ok(scannerSource.includes(pattern), `Architecture fact scanner should inspect ${pattern}`);
}
for (const relation of ["launches", "publishes", "subscribes", "callsService", "offersService", "usesAction", "usesConfig", "imports"]) {
  assert.ok(scannerSource.includes(relation), `Architecture fact scanner should emit ${relation} relations`);
  assert.ok(graphSource.includes(relation), `Whole Architecture graph should render ${relation} relations`);
}

console.log("Architecture fact scanner contract checks passed.");
