import { DependencyEdge, FeatureBlock, ModuleNode, RiskLevel } from "../webview/dashboardState";

export interface FeatureDefinition {
  id: string;
  label: string;
  description: string;
  pathPatterns: string[];
  keywords: string[];
  defaultRisk: RiskLevel;
}

export const BUILT_IN_FEATURES: FeatureDefinition[] = [
  {
    id: "tests",
    label: "Tests",
    description: "Unit, integration, and configuration scanner tests.",
    pathPatterns: ["test", "tests", "spec"],
    keywords: ["test", "tests", "spec"],
    defaultRisk: "low"
  },
  {
    id: "docs",
    label: "Docs",
    description: "Documentation, notes, and markdown guides.",
    pathPatterns: ["doc", "docs", "readme", "markdown", "md"],
    keywords: ["doc", "docs", "readme", "markdown"],
    defaultRisk: "low"
  },
  {
    id: "config-system",
    label: "Config System",
    description: "Configuration loading, environment handling, YAML, and settings.",
    pathPatterns: ["abb_config", "config", "settings", "env", "environment", "yaml", "yml"],
    keywords: ["abb_config", "config", "settings", "env", "environment", "yaml", "yml"],
    defaultRisk: "high"
  },
  {
    id: "ros-bridge-runtime",
    label: "ROS / Bridge / Runtime",
    description: "ROS launch, node, bridge, and runtime integration code.",
    pathPatterns: ["abb_ros_bridge", "ros", "launch", "node", "bridge", "runtime"],
    keywords: ["ros", "launch", "node", "bridge", "runtime"],
    defaultRisk: "medium"
  },
  {
    id: "gui-layer",
    label: "GUI Layer",
    description: "Panels, tabs, and operator-facing UI code.",
    pathPatterns: ["gui", "operator_panel", "panel", "tab", "view", "widget", "ui"],
    keywords: ["gui", "operator_panel", "panel", "tab", "widget", "view"],
    defaultRisk: "low"
  },
  {
    id: "motion-planning",
    label: "Motion Planning",
    description: "Motion builders, trajectories, poses, and path planning.",
    pathPatterns: ["motion", "moveit", "trajectory", "pose", "path", "planner", "planning", "box_motion"],
    keywords: ["motion", "moveit", "movej", "movel", "trajectory", "pose", "path", "planner", "box_motion"],
    defaultRisk: "medium"
  },
  {
    id: "safety-layer",
    label: "Safety Layer",
    description: "Safety checks, collision logic, zones, and limits.",
    pathPatterns: ["safety", "collision", "zone", "limit", "guard"],
    keywords: ["safety", "collision", "zone", "limit", "guard"],
    defaultRisk: "high"
  },
  {
    id: "robot-io-layer",
    label: "Robot I/O Layer",
    description: "Robot clients, controller APIs, RWS, EGM, and RAPID interfaces.",
    pathPatterns: ["egm", "rws", "rapid", "robot", "controller", "abb_robot", "abb_controller", "robotware"],
    keywords: ["egm", "rws", "rapid", "robot", "abb", "controller", "io"],
    defaultRisk: "high"
  },
  {
    id: "task-runner",
    label: "Task Runner",
    description: "Task orchestration, jobs, and runtime sequence runners.",
    pathPatterns: ["task", "runner", "job", "sequence", "orchestrator"],
    keywords: ["task", "runner", "job", "sequence", "orchestrator"],
    defaultRisk: "medium"
  },
  {
    id: "utils-common",
    label: "Utils / Common",
    description: "Shared helpers, common utilities, logging, and support modules.",
    pathPatterns: ["common", "utils", "utility", "helpers", "logging"],
    keywords: ["common", "utils", "utility", "helpers", "logging"],
    defaultRisk: "low"
  },
  {
    id: "unmapped-unknown",
    label: "Unmapped / Unknown",
    description: "Files that do not match built-in feature heuristics.",
    pathPatterns: [],
    keywords: [],
    defaultRisk: "medium"
  }
];

export function mapFeatureForPath(relativePath: string): FeatureDefinition {
  const normalized = normalizePath(relativePath);
  const segments = normalized.split("/");

  if (isTestPath(relativePath)) {
    return getFeatureDefinition("tests");
  }

  for (const feature of BUILT_IN_FEATURES) {
    if (feature.id === "unmapped-unknown" || feature.id === "tests") {
      continue;
    }

    if (feature.pathPatterns.some((pattern) => matchesPathPattern(normalized, segments, pattern))) {
      return feature;
    }
  }

  return BUILT_IN_FEATURES[BUILT_IN_FEATURES.length - 1]!;
}

export function inferRuntimeFeatureForTestPath(relativePath: string): FeatureDefinition | undefined {
  if (!isTestPath(relativePath)) {
    return undefined;
  }

  const normalized = normalizePath(relativePath)
    .replace(/(^|\/)tests?\//g, "$1")
    .replace(/(^|\/)test[_-]/g, "$1")
    .replace(/[_-]test(\.py)?$/g, "$1");

  for (const feature of BUILT_IN_FEATURES) {
    if (feature.id === "unmapped-unknown" || feature.id === "tests" || feature.id === "docs") {
      continue;
    }
    const segments = normalized.split("/");
    if (feature.pathPatterns.some((pattern) => matchesPathPattern(normalized, segments, pattern))
      || feature.keywords.some((keyword) => matchesPathPattern(normalized, segments, keyword))) {
      return feature;
    }
  }

  return undefined;
}

export function inferFeatureFromImports(moduleNode: ModuleNode, modulesById: ReadonlyMap<string, ModuleNode>): FeatureDefinition {
  const pathFeature = mapFeatureForPath(moduleNode.path);
  if (pathFeature.id !== "unmapped-unknown") {
    return pathFeature;
  }

  const featureCounts = new Map<string, number>();
  for (const linkedModuleId of [...moduleNode.imports, ...moduleNode.importedBy]) {
    const linkedModule = modulesById.get(linkedModuleId);
    if (!linkedModule?.featureId || linkedModule.featureId === "unmapped-unknown" || linkedModule.featureId === "tests" || linkedModule.isTest) {
      continue;
    }
    featureCounts.set(linkedModule.featureId, (featureCounts.get(linkedModule.featureId) ?? 0) + 1);
  }

  const inferredFeatureId = [...featureCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
  return BUILT_IN_FEATURES.find((feature) => feature.id === inferredFeatureId) ?? pathFeature;
}

export function buildFeatureBlocks(modules: ModuleNode[], dependencies: DependencyEdge[]): FeatureBlock[] {
  return BUILT_IN_FEATURES.map((feature) => {
    const featureModules = modules.filter((moduleNode) => moduleNode.featureId === feature.id
      && (feature.id === "tests" ? moduleNode.isTest : !moduleNode.isTest));
    const moduleIds = new Set(featureModules.map((moduleNode) => moduleNode.id));
    const incomingEdges = dependencies.filter((edge) => moduleIds.has(edge.to) && !moduleIds.has(edge.from)).length;
    const outgoingEdges = dependencies.filter((edge) => moduleIds.has(edge.from) && !moduleIds.has(edge.to)).length;
    const changedFileCount = featureModules.filter((moduleNode) => moduleNode.riskLevel !== "low").length;
    const description = feature.id === "unmapped-unknown" && featureModules.length > 0
      ? `${featureModules.length} unmapped modules. Samples: ${featureModules.slice(0, 4).map((moduleNode) => moduleNode.path).join(", ")}`
      : feature.description;

    return {
      id: feature.id,
      label: feature.label,
      description,
      pathPatterns: feature.pathPatterns,
      moduleIds: featureModules.map((moduleNode) => moduleNode.id),
      incomingEdges,
      outgoingEdges,
      changedFileCount,
      riskLevel: highestRisk(featureModules.map((moduleNode) => moduleNode.riskLevel), feature.defaultRisk)
    };
  }).filter((feature) => feature.moduleIds.length > 0);
}

export function getFeatureDefinition(featureId: string | undefined): FeatureDefinition {
  return BUILT_IN_FEATURES.find((feature) => feature.id === featureId) ?? BUILT_IN_FEATURES[BUILT_IN_FEATURES.length - 1]!;
}

export function isTestPath(relativePath: string): boolean {
  const normalized = normalizePath(relativePath);
  return normalized.startsWith("tests/")
    || normalized.includes("/tests/")
    || normalized.split("/").some((segment) => segment.startsWith("test_") || segment.endsWith("_test.py") || segment.endsWith(".spec.py"));
}

function highestRisk(risks: RiskLevel[], fallback: RiskLevel): RiskLevel {
  if (risks.includes("high")) {
    return "high";
  }
  if (risks.includes("medium")) {
    return "medium";
  }
  return risks[0] ?? fallback;
}

function normalizePath(relativePath: string): string {
  return relativePath.replaceAll("\\", "/").toLowerCase();
}

function matchesPathPattern(normalizedPath: string, segments: string[], pattern: string): boolean {
  const normalizedPattern = pattern.toLowerCase();
  if (segments.includes(normalizedPattern)) {
    return true;
  }
  if (normalizedPath.includes(normalizedPattern)) {
    return true;
  }
  return new RegExp(`(^|[\\W_])${escapeRegExp(normalizedPattern)}([\\W_]|$)`).test(normalizedPath);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
