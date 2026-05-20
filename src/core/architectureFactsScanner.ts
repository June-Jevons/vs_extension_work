import * as vscode from "vscode";
import { XMLParser } from "fast-xml-parser";
import YAML from "yaml";
import {
  ArchitectureFactEntity,
  ArchitectureFactRelation,
  ArchitectureFacts,
  ArchitectureRelationKind,
  ConfidenceLevel,
  DependencyEdge,
  ModuleNode
} from "../webview/dashboardState";
import { isTestPath } from "./featureMapper";
import { shouldExcludePath } from "./scanPathFilter";

export interface ArchitectureFactsScanConfig {
  excludeGlobs: string[];
  maxFilesToAnalyze: number;
  modules: readonly ModuleNode[];
  dependencies: readonly DependencyEdge[];
}

interface FactAccumulator {
  entities: Map<string, ArchitectureFactEntity>;
  relations: Map<string, ArchitectureFactRelation>;
  diagnostics: string[];
}

interface LaunchArgument {
  name: string;
  defaultValue?: string;
}

interface LaunchNode {
  packageName?: string;
  executable?: string;
  name?: string;
  remappings: Array<{ from: string; to: string }>;
  parameters: string[];
  confidence: ConfidenceLevel;
}

const MAX_FACT_FILES_PER_GLOB = 1200;
const MAX_GRAPH_FACTS = 420;

const FACT_SCAN_GLOBS = [
  "**/package.xml",
  "**/CMakeLists.txt",
  "**/setup.py",
  "**/*.launch.py",
  "**/*.launch.xml",
  "**/*.launch.yaml",
  "**/*.launch.yml",
  "**/*.yaml",
  "**/*.yml",
  "**/*.py"
] as const;

const TEST_FACT_PATTERN = /(^|[\/._\-\s])(tests?|pytest|gtest|rostest)([\/._\-\s]|$)|(^|[\/])test[_-]|[_-]test(\.|$)|\.spec\./i;

export async function scanArchitectureFacts(
  folder: vscode.WorkspaceFolder,
  config: ArchitectureFactsScanConfig
): Promise<ArchitectureFacts> {
  const accumulator: FactAccumulator = {
    entities: new Map(),
    relations: new Map(),
    diagnostics: []
  };
  const files = await findFactFiles(folder, config);
  const byPath = new Map(files.map((item) => [item.relativePath, item.uri]));

  for (const [relativePath, uri] of byPath) {
    const source = await readUtf8(uri);
    if (source === undefined) {
      accumulator.diagnostics.push(`Unreadable architecture fact file: ${relativePath}`);
      continue;
    }

    if (relativePath.endsWith("package.xml")) {
      collectPackageFacts(accumulator, relativePath, source);
    } else if (/\.launch\.py$/i.test(relativePath)) {
      collectPythonLaunchFacts(accumulator, relativePath, source);
    } else if (/\.ya?ml$/i.test(relativePath)) {
      collectYamlConfigFacts(accumulator, relativePath, source);
    } else if (/\.py$/i.test(relativePath)) {
      collectRclpyFacts(accumulator, relativePath, source);
    }
  }

  collectModuleImportFacts(accumulator, config.modules, config.dependencies);
  deriveCommandFlowFacts(accumulator);

  const filteredEntities = [...accumulator.entities.values()]
    .filter((entity) => !isTestRelatedArchitectureEntity(entity));
  const entities = filteredEntities
    .sort((left, right) => entityKindRank(left.kind) - entityKindRank(right.kind) || left.label.localeCompare(right.label))
    .slice(0, MAX_GRAPH_FACTS);
  const visibleEntityIds = new Set(entities.map((entity) => entity.id));
  const relations = [...accumulator.relations.values()]
    .filter((relation) => visibleEntityIds.has(relation.source) && visibleEntityIds.has(relation.target) && !isTestRelatedArchitectureRelation(relation))
    .sort((left, right) => relationKindRank(left.kind) - relationKindRank(right.kind) || left.id.localeCompare(right.id))
    .slice(0, MAX_GRAPH_FACTS);

  return {
    entities,
    relations,
    diagnostics: [
      `Architecture fact scanner read ${byPath.size} candidate files.`,
      ...accumulator.diagnostics.slice(0, 20)
    ]
  };
}

async function findFactFiles(
  folder: vscode.WorkspaceFolder,
  config: Pick<ArchitectureFactsScanConfig, "excludeGlobs" | "maxFilesToAnalyze">
): Promise<Array<{ uri: vscode.Uri; relativePath: string }>> {
  const byPath = new Map<string, vscode.Uri>();
  const maxPerGlob = Math.min(Math.max(config.maxFilesToAnalyze, 1), MAX_FACT_FILES_PER_GLOB);
  for (const glob of FACT_SCAN_GLOBS) {
    const found = await vscode.workspace.findFiles(
      new vscode.RelativePattern(folder, glob),
      buildExcludePattern(config.excludeGlobs),
      maxPerGlob
    );
    for (const uri of found) {
      const relativePath = normalizeRelativePath(folder.uri, uri);
      if (!shouldExcludePath(relativePath, config.excludeGlobs) && !isTestRelatedPath(relativePath)) {
        byPath.set(relativePath, uri);
      }
    }
  }
  return [...byPath.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .slice(0, Math.max(config.maxFilesToAnalyze, 1))
    .map(([relativePath, uri]) => ({ relativePath, uri }));
}

function collectPackageFacts(accumulator: FactAccumulator, relativePath: string, source: string): void {
  try {
    const parsed = new XMLParser({ ignoreAttributes: false }).parse(source) as {
      package?: {
        name?: string;
        depend?: string | string[];
        exec_depend?: string | string[];
        build_depend?: string | string[];
      };
    };
    const packageName = String(parsed.package?.name ?? packageNameFromPath(relativePath));
    const packageId = entityId("package", packageName);
    addEntity(accumulator, {
      id: packageId,
      kind: "package",
      label: packageName,
      detail: `ROS2 package declared in ${relativePath}`,
      path: relativePath,
      confidence: "high"
    });

    for (const dependency of uniqueStrings([
      ...arrayValue(parsed.package?.depend),
      ...arrayValue(parsed.package?.exec_depend),
      ...arrayValue(parsed.package?.build_depend)
    ]).slice(0, 24)) {
      const dependencyId = entityId("package", dependency);
      addEntity(accumulator, {
        id: dependencyId,
        kind: "package",
        label: dependency,
        detail: `Package dependency referenced by ${packageName}`,
        confidence: "medium"
      });
      addRelation(accumulator, packageId, dependencyId, "imports", "medium", `${relativePath} package dependency`);
    }
  } catch (error: unknown) {
    accumulator.diagnostics.push(`package.xml parse failed for ${relativePath}: ${errorMessage(error)}`);
  }
}

function collectPythonLaunchFacts(accumulator: FactAccumulator, relativePath: string, source: string): void {
  const launchId = entityId("launch", relativePath.replace(/.*\//, "").replace(/\.launch\.py$/i, ""));
  addEntity(accumulator, {
    id: launchId,
    kind: "launch",
    label: relativePath.split("/").at(-1) ?? relativePath,
    detail: "ROS2 Python launch file",
    path: relativePath,
    featureId: "ros-bridge-runtime",
    confidence: "high"
  });

  const launchArguments = parseLaunchArguments(source);
  for (const argument of launchArguments) {
    if (argument.defaultValue && /\.ya?ml$/i.test(argument.defaultValue)) {
      const configId = entityId("config", argument.defaultValue);
      addEntity(accumulator, {
        id: configId,
        kind: "config",
        label: argument.defaultValue,
        detail: `Launch argument ${argument.name} default config`,
        path: configPathFromLaunch(relativePath, argument.defaultValue),
        featureId: "config-system",
        confidence: "medium"
      });
      addRelation(accumulator, launchId, configId, "usesConfig", "medium", `DeclareLaunchArgument(${argument.name}) default_value=${argument.defaultValue}`);
    }
  }

  for (const launchNode of parseLaunchNodes(source)) {
    const label = `${launchNode.packageName ?? "unknown"}/${launchNode.executable ?? launchNode.name ?? "node"}`;
    const nodeId = entityId("node", label);
    addEntity(accumulator, {
      id: nodeId,
      kind: "node",
      label,
      detail: launchNode.name ? `Launch node name: ${launchNode.name}` : `Launch node from ${relativePath}`,
      path: relativePath,
      featureId: featureForRosNode(label),
      confidence: launchNode.confidence,
      metadata: {
        package: launchNode.packageName ?? "unknown",
        executable: launchNode.executable ?? "unknown",
        remappings: launchNode.remappings.map((remapping) => `${remapping.from}->${remapping.to}`)
      }
    });
    addRelation(accumulator, launchId, nodeId, "launches", launchNode.confidence, `Node(${label}) in ${relativePath}`);

    for (const remapping of launchNode.remappings) {
      const sourceTopicId = entityId("topic", remapping.from);
      const targetTopicId = entityId("topic", remapping.to);
      addEntity(accumulator, topicEntity(sourceTopicId, remapping.from, relativePath, "medium"));
      addEntity(accumulator, topicEntity(targetTopicId, remapping.to, relativePath, "medium"));
      addRelation(accumulator, nodeId, targetTopicId, "publishes", "low", `Launch remapping ${remapping.from} -> ${remapping.to}`);
      addRelation(accumulator, sourceTopicId, nodeId, "subscribes", "low", `Launch remapping ${remapping.from} -> ${remapping.to}`);
    }
  }
}

function collectYamlConfigFacts(accumulator: FactAccumulator, relativePath: string, source: string): void {
  try {
    const parsed = YAML.parse(source) as unknown;
    const topLevelKeys = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? Object.keys(parsed).slice(0, 8)
      : [];
    const id = entityId("config", relativePath);
    addEntity(accumulator, {
      id,
      kind: "config",
      label: relativePath.split("/").at(-1) ?? relativePath,
      detail: topLevelKeys.length > 0 ? `YAML config keys: ${topLevelKeys.join(", ")}` : "YAML configuration file",
      path: relativePath,
      featureId: "config-system",
      confidence: "medium",
      metadata: {
        topLevelKeys
      }
    });
  } catch (error: unknown) {
    accumulator.diagnostics.push(`YAML parse failed for ${relativePath}: ${errorMessage(error)}`);
  }
}

function collectRclpyFacts(accumulator: FactAccumulator, relativePath: string, source: string): void {
  if (!/\brclpy\b|create_publisher|create_subscription|create_service|create_client|Action(Client|Server)/.test(source)) {
    return;
  }

  const nodeNames = parseRclpyNodeNames(source);
  const nodeIds = (nodeNames.length > 0 ? nodeNames : [moduleLabelFromPath(relativePath)]).map((name) => {
    const id = entityId("node", name);
    addEntity(accumulator, {
      id,
      kind: "node",
      label: name,
      detail: `ROS node inferred from ${relativePath}`,
      path: relativePath,
      featureId: featureForPath(relativePath),
      confidence: nodeNames.length > 0 ? "high" : "low"
    });
    return id;
  });
  const primaryNodeId = nodeIds[0];
  if (!primaryNodeId) {
    return;
  }

  collectRclpyCallRelations(accumulator, source, relativePath, primaryNodeId, "create_publisher", "topic", "publishes", 1);
  collectRclpyCallRelations(accumulator, source, relativePath, primaryNodeId, "create_subscription", "topic", "subscribes", 1);
  collectRclpyCallRelations(accumulator, source, relativePath, primaryNodeId, "create_service", "service", "offersService", 1);
  collectRclpyCallRelations(accumulator, source, relativePath, primaryNodeId, "create_client", "service", "callsService", 1);
  collectRclpyCallRelations(accumulator, source, relativePath, primaryNodeId, "ActionClient", "action", "usesAction", 2);
  collectRclpyCallRelations(accumulator, source, relativePath, primaryNodeId, "ActionServer", "action", "usesAction", 2);
}

function collectRclpyCallRelations(
  accumulator: FactAccumulator,
  source: string,
  relativePath: string,
  nodeId: string,
  callName: string,
  targetKind: "topic" | "service" | "action",
  relationKind: ArchitectureRelationKind,
  nameArgumentIndex: number
): void {
  for (const block of extractCallBlocks(source, callName)) {
    const args = splitTopLevelArgs(block.inner);
    const targetName = expressionLabel(args[nameArgumentIndex]);
    if (!targetName) {
      continue;
    }
    const targetId = entityId(targetKind, targetName);
    addEntity(accumulator, {
      id: targetId,
      kind: targetKind,
      label: targetName,
      detail: `${targetKind} referenced by ${callName}`,
      path: relativePath,
      featureId: featureForPath(relativePath),
      confidence: targetName.startsWith("/") ? "high" : "low"
    });
    addRelation(
      accumulator,
      relationKind === "subscribes" ? targetId : nodeId,
      relationKind === "subscribes" ? nodeId : targetId,
      relationKind,
      targetName.startsWith("/") ? "high" : "low",
      `${callName}(${targetName}) in ${relativePath}`
    );
  }
}

function collectModuleImportFacts(
  accumulator: FactAccumulator,
  modules: readonly ModuleNode[],
  dependencies: readonly DependencyEdge[]
): void {
  const modulesById = new Map(modules.map((moduleNode) => [moduleNode.id, moduleNode]));
  for (const moduleNode of modules.slice(0, 180)) {
    const moduleId = entityId("module", moduleNode.id);
    addEntity(accumulator, {
      id: moduleId,
      kind: "module",
      label: moduleNode.name,
      detail: moduleNode.path,
      path: moduleNode.path,
      featureId: moduleNode.featureId,
      confidence: "high"
    });
  }
  for (const dependency of dependencies.slice(0, 260)) {
    const from = modulesById.get(dependency.from);
    const to = modulesById.get(dependency.to);
    if (!from || !to) {
      continue;
    }
    addRelation(
      accumulator,
      entityId("module", from.id),
      entityId("module", to.id),
      dependency.kind === "config" ? "usesConfig" : "imports",
      dependency.kind === "config" ? "medium" : "high",
      `Python import edge ${from.path} -> ${to.path}`
    );
  }
}

function deriveCommandFlowFacts(accumulator: FactAccumulator): void {
  const flowKinds: ArchitectureRelationKind[] = [
    "publishes",
    "subscribes",
    "callsService",
    "offersService",
    "usesAction"
  ];
  for (const relation of [...accumulator.relations.values()]) {
    if (!flowKinds.includes(relation.kind)) {
      continue;
    }
    addRelation(
      accumulator,
      relation.source,
      relation.target,
      "commandFlow",
      relation.confidence === "high" ? "medium" : relation.confidence,
      `Command flow derived from ${relation.kind}: ${relation.evidence}`
    );
  }
}

function parseLaunchArguments(source: string): LaunchArgument[] {
  return extractCallBlocks(source, "DeclareLaunchArgument")
    .map((block) => ({
      name: expressionLabel(splitTopLevelArgs(block.inner)[0]) ?? "",
      defaultValue: parseKeywordString(block.inner, "default_value")
    }))
    .filter((argument) => argument.name.length > 0);
}

function parseLaunchNodes(source: string): LaunchNode[] {
  return extractCallBlocks(source, "Node")
    .map((block) => ({
      packageName: parseKeywordString(block.inner, "package"),
      executable: parseKeywordString(block.inner, "executable"),
      name: parseKeywordString(block.inner, "name"),
      remappings: parseRemappings(block.inner),
      parameters: parseParameterHints(block.inner),
      confidence: parseKeywordString(block.inner, "package") && parseKeywordString(block.inner, "executable") ? "high" as const : "medium" as const
    }))
    .filter((node) => node.packageName || node.executable || node.name);
}

function parseRclpyNodeNames(source: string): string[] {
  const names = new Set<string>();
  for (const match of source.matchAll(/rclpy\.create_node\(\s*["']([^"']+)["']/g)) {
    if (match[1]) {
      names.add(match[1]);
    }
  }
  for (const match of source.matchAll(/super\(\)\.__init__\(\s*["']([^"']+)["']/g)) {
    if (match[1]) {
      names.add(match[1]);
    }
  }
  return [...names].sort();
}

function parseRemappings(source: string): Array<{ from: string; to: string }> {
  const remappingBlock = parseKeywordBlock(source, "remappings");
  if (!remappingBlock) {
    return [];
  }
  return [...remappingBlock.matchAll(/\(\s*["']([^"']+)["']\s*,\s*([^),\]]+)\s*\)/g)]
    .map((match) => ({
      from: match[1] ?? "",
      to: expressionLabel(match[2]) ?? ""
    }))
    .filter((item) => item.from.length > 0 && item.to.length > 0);
}

function parseParameterHints(source: string): string[] {
  const parameterBlock = parseKeywordBlock(source, "parameters");
  if (!parameterBlock) {
    return [];
  }
  return [...parameterBlock.matchAll(/["']([^"']+\.ya?ml|[A-Za-z_][\w-]*_config|robot_description)["']/g)]
    .map((match) => match[1] ?? "")
    .filter(Boolean)
    .slice(0, 12);
}

function extractCallBlocks(source: string, callName: string): Array<{ inner: string; start: number; end: number }> {
  const blocks: Array<{ inner: string; start: number; end: number }> = [];
  const needle = `${callName}(`;
  let cursor = 0;
  while (cursor < source.length) {
    const start = source.indexOf(needle, cursor);
    if (start < 0) {
      break;
    }
    const open = start + callName.length;
    const end = findMatchingParen(source, open);
    if (end > open) {
      blocks.push({
        inner: source.slice(open + 1, end),
        start,
        end
      });
      cursor = end + 1;
    } else {
      cursor = start + needle.length;
    }
  }
  return blocks;
}

function findMatchingParen(source: string, openIndex: number): number {
  let depth = 0;
  let quote: "\"" | "'" | undefined;
  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];
    const previous = index > 0 ? source[index - 1] : undefined;
    if ((char === "\"" || char === "'") && previous !== "\\") {
      quote = quote === char ? undefined : quote ?? char;
      continue;
    }
    if (quote) {
      continue;
    }
    if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }
  return -1;
}

function splitTopLevelArgs(value: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let quote: "\"" | "'" | undefined;
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const previous = index > 0 ? value[index - 1] : undefined;
    if ((char === "\"" || char === "'") && previous !== "\\") {
      quote = quote === char ? undefined : quote ?? char;
      continue;
    }
    if (quote) {
      continue;
    }
    if (char === "(" || char === "[" || char === "{") {
      depth += 1;
    } else if (char === ")" || char === "]" || char === "}") {
      depth = Math.max(0, depth - 1);
    } else if (char === "," && depth === 0) {
      args.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  args.push(value.slice(start).trim());
  return args.filter(Boolean);
}

function parseKeywordString(source: string, keyword: string): string | undefined {
  const regex = new RegExp(`${keyword}\\s*=\\s*([\"'])([^\"']+)\\1`);
  return regex.exec(source)?.[2];
}

function parseKeywordBlock(source: string, keyword: string): string | undefined {
  const index = source.search(new RegExp(`${keyword}\\s*=`));
  if (index < 0) {
    return undefined;
  }
  const start = source.indexOf("[", index);
  if (start < 0) {
    return undefined;
  }
  let depth = 0;
  for (let cursor = start; cursor < source.length; cursor += 1) {
    const char = source[cursor];
    if (char === "[") {
      depth += 1;
    } else if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start + 1, cursor);
      }
    }
  }
  return undefined;
}

function expressionLabel(expression: string | undefined): string | undefined {
  const trimmed = expression?.trim();
  if (!trimmed) {
    return undefined;
  }
  const stringMatch = /^["']([^"']+)["']$/.exec(trimmed);
  if (stringMatch?.[1]) {
    return stringMatch[1];
  }
  const launchConfigurationMatch = /LaunchConfiguration\(\s*["']([^"']+)["']\s*\)/.exec(trimmed);
  if (launchConfigurationMatch?.[1]) {
    return `$${launchConfigurationMatch[1]}`;
  }
  const variableMatch = /^[A-Za-z_][\w.]*$/.exec(trimmed);
  if (variableMatch) {
    return `$${trimmed}`;
  }
  return undefined;
}

function addEntity(accumulator: FactAccumulator, entity: ArchitectureFactEntity): void {
  const existing = accumulator.entities.get(entity.id);
  if (!existing || confidenceRank(entity.confidence) > confidenceRank(existing.confidence)) {
    accumulator.entities.set(entity.id, entity);
  }
}

function addRelation(
  accumulator: FactAccumulator,
  source: string,
  target: string,
  kind: ArchitectureRelationKind,
  confidence: ConfidenceLevel,
  evidence: string
): void {
  if (source === target) {
    return;
  }
  const id = `${kind}:${source}->${target}`;
  const existing = accumulator.relations.get(id);
  if (!existing || confidenceRank(confidence) > confidenceRank(existing.confidence)) {
    accumulator.relations.set(id, {
      id,
      source,
      target,
      kind,
      confidence,
      evidence
    });
  }
}

function topicEntity(id: string, label: string, path: string, confidence: ConfidenceLevel): ArchitectureFactEntity {
  return {
    id,
    kind: "topic",
    label,
    detail: "ROS topic inferred from launch remapping",
    path,
    featureId: "ros-bridge-runtime",
    confidence
  };
}

async function readUtf8(uri: vscode.Uri): Promise<string | undefined> {
  try {
    const buffer = await vscode.workspace.fs.readFile(uri);
    return Buffer.from(buffer).toString("utf8");
  } catch {
    return undefined;
  }
}

function entityId(kind: ArchitectureFactEntity["kind"], value: string): string {
  return `${kind}:${value.replaceAll("\\", "/").replace(/\s+/g, "-").replace(/[^A-Za-z0-9_:/.$-]+/g, "-").replace(/-+/g, "-")}`;
}

function featureForPath(relativePath: string): string {
  const normalized = relativePath.toLowerCase();
  if (normalized.includes("moveit") || normalized.includes("motion") || normalized.includes("planner")) {
    return "motion-planning";
  }
  if (normalized.includes("safety") || normalized.includes("zone") || normalized.includes("collision")) {
    return "safety-layer";
  }
  if (normalized.includes("rws") || normalized.includes("egm") || normalized.includes("robot") || normalized.includes("rapid")) {
    return "robot-io-layer";
  }
  if (normalized.includes("gui") || normalized.includes("operator") || normalized.includes("panel")) {
    return "gui-layer";
  }
  if (normalized.includes("config") || normalized.includes(".yaml") || normalized.includes(".yml")) {
    return "config-system";
  }
  if (normalized.includes("ros") || normalized.includes("bridge") || normalized.includes("launch")) {
    return "ros-bridge-runtime";
  }
  return "utils-common";
}

function featureForRosNode(label: string): string {
  const normalized = label.toLowerCase();
  if (normalized.includes("move_group") || normalized.includes("moveit")) {
    return "motion-planning";
  }
  if (normalized.includes("controller") || normalized.includes("rws")) {
    return "robot-io-layer";
  }
  if (normalized.includes("rviz") || normalized.includes("robot_state") || normalized.includes("tf")) {
    return "ros-bridge-runtime";
  }
  return "ros-bridge-runtime";
}

function moduleLabelFromPath(relativePath: string): string {
  return relativePath.replace(/\.py$/i, "").replaceAll("/", ".");
}

function packageNameFromPath(relativePath: string): string {
  const segments = relativePath.split("/");
  const index = segments.lastIndexOf("package.xml");
  return index > 0 ? segments[index - 1] ?? "unknown-package" : "unknown-package";
}

function configPathFromLaunch(launchPath: string, configName: string): string {
  const launchSegments = launchPath.split("/");
  const launchIndex = launchSegments.lastIndexOf("launch");
  if (launchIndex >= 0) {
    return [...launchSegments.slice(0, launchIndex), "config", configName].join("/");
  }
  return configName;
}

function normalizeRelativePath(rootUri: vscode.Uri, uri: vscode.Uri): string {
  const rootPath = rootUri.fsPath.replaceAll("\\", "/").replace(/\/+$/, "");
  const filePath = uri.fsPath.replaceAll("\\", "/");
  return filePath.startsWith(`${rootPath}/`) ? filePath.slice(rootPath.length + 1) : filePath;
}

function isTestRelatedPath(relativePath: string): boolean {
  return isTestPath(relativePath) || TEST_FACT_PATTERN.test(relativePath.replaceAll("\\", "/"));
}

function isTestRelatedArchitectureEntity(entity: ArchitectureFactEntity): boolean {
  return [
    entity.id,
    entity.label,
    entity.detail,
    entity.path,
    ...Object.values(entity.metadata ?? {}).flatMap((value) => Array.isArray(value) ? value : [String(value)])
  ].some((value) => typeof value === "string" && TEST_FACT_PATTERN.test(value));
}

function isTestRelatedArchitectureRelation(relation: ArchitectureFactRelation): boolean {
  return [relation.id, relation.source, relation.target, relation.evidence]
    .some((value) => TEST_FACT_PATTERN.test(value));
}

function buildExcludePattern(excludeGlobs: string[]): string | undefined {
  if (excludeGlobs.length === 0) {
    return undefined;
  }
  return excludeGlobs.length === 1 ? excludeGlobs[0] : `{${excludeGlobs.join(",")}}`;
}

function arrayValue(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  return typeof value === "string" ? [value] : [];
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

function confidenceRank(confidence: ConfidenceLevel): number {
  return confidence === "high" ? 3 : confidence === "medium" ? 2 : 1;
}

function entityKindRank(kind: ArchitectureFactEntity["kind"]): number {
  return ["package", "launch", "node", "topic", "service", "action", "config", "module"].indexOf(kind);
}

function relationKindRank(kind: ArchitectureRelationKind): number {
  return ["launches", "commandFlow", "publishes", "subscribes", "callsService", "offersService", "usesAction", "usesConfig", "imports"].indexOf(kind);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}
