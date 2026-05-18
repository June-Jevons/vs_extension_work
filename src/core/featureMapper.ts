import {
  ClassificationReason,
  DependencyEdge,
  FeatureBlock,
  ModuleNode,
  RiskLevel
} from "../webview/dashboardState";

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
    pathPatterns: ["abb_ros_bridge", "ros", "launch", "node", "bridge", "runtime", "visualization", "marker", "rviz", "platform", "abb_platform", "mesh", "stl"],
    keywords: ["ros", "launch", "node", "bridge", "runtime", "visualization", "marker", "rviz", "platform", "mesh", "stl"],
    defaultRisk: "medium"
  },
  {
    id: "gui-layer",
    label: "GUI Layer",
    description: "Panels, tabs, and operator-facing UI code.",
    pathPatterns: ["gui", "operator_panel", "operator_app", "abb_operator_app", "operator", "panel", "tab", "view", "widget", "ui"],
    keywords: ["gui", "operator_panel", "operator_app", "operator", "panel", "tab", "widget", "view"],
    defaultRisk: "low"
  },
  {
    id: "motion-planning",
    label: "Motion Planning",
    description: "Motion builders, trajectories, poses, and path planning.",
    pathPatterns: ["motion", "moveit", "trajectory", "pose", "path", "planner", "planning", "box_motion", "abb_boxes", "boxes", "box", "geometry"],
    keywords: ["motion", "moveit", "movej", "movel", "trajectory", "pose", "path", "planner", "box_motion", "boxes", "box", "geometry"],
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
    pathPatterns: ["egm", "rws", "rapid", "robot", "controller", "abb_robot", "abb_controller", "robotware", "abb_gripper", "gripper", "tool0", "tcp"],
    keywords: ["egm", "rws", "rapid", "robot", "abb", "controller", "io", "gripper", "tool0", "tcp"],
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
    description: "Shared helpers, common utilities, logging, math, transforms, and support modules.",
    pathPatterns: ["common", "utils", "utility", "helpers", "logging", "math", "transform"],
    keywords: ["common", "utils", "utility", "helpers", "logging", "math", "transform"],
    defaultRisk: "low"
  },
  {
    id: "unmapped-unknown",
    label: "Unclassified Modules",
    description: "Runtime modules that do not yet have a confident feature classification.",
    pathPatterns: [],
    keywords: [],
    defaultRisk: "medium"
  }
];

export interface FeatureClassification {
  feature: FeatureDefinition;
  reason: ClassificationReason;
}

export function mapFeatureForPath(relativePath: string): FeatureDefinition {
  return classifyFeatureForPath(relativePath).feature;
}

export function classifyFeatureForPath(relativePath: string): FeatureClassification {
  const normalized = normalizePath(relativePath);
  const segments = normalized.split("/");

  if (isTestPath(relativePath)) {
    return {
      feature: getFeatureDefinition("tests"),
      reason: {
        category: "path-pattern-match",
        detail: "Path is under tests or follows test naming.",
        confidence: "high"
      }
    };
  }

  const matches: FeatureDefinition[] = [];
  for (const feature of BUILT_IN_FEATURES) {
    if (feature.id === "unmapped-unknown" || feature.id === "tests") {
      continue;
    }

    if (feature.pathPatterns.some((pattern) => matchesPathPattern(normalized, segments, pattern))) {
      matches.push(feature);
    }
  }

  if (matches.length > 0) {
    const feature = matches[0]!;
    return {
      feature,
      reason: {
        category: matches.length > 1 ? "ambiguous-match" : "path-pattern-match",
        detail: matches.length > 1
          ? `Path matched multiple feature patterns; selected ${feature.label}.`
          : `Path matched ${feature.label} patterns.`,
        confidence: matches.length > 1 ? "medium" : "high"
      }
    };
  }

  return {
    feature: getFeatureDefinition("unmapped-unknown"),
    reason: {
      category: "no-path-pattern-match",
      detail: "No built-in path pattern matched this module.",
      confidence: "low"
    }
  };
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
  return inferFeatureFromImportsDetailed(moduleNode, modulesById).feature;
}

export function inferFeatureFromImportsDetailed(
  moduleNode: ModuleNode,
  modulesById: ReadonlyMap<string, ModuleNode>
): FeatureClassification {
  const pathClassification = classifyFeatureForPath(moduleNode.path);
  if (pathClassification.feature.id !== "unmapped-unknown") {
    return pathClassification;
  }

  const featureCounts = new Map<string, number>();
  for (const linkedModuleId of [...moduleNode.imports, ...moduleNode.importedBy]) {
    const linkedModule = modulesById.get(linkedModuleId);
    if (!linkedModule?.featureId || linkedModule.featureId === "unmapped-unknown" || linkedModule.featureId === "tests" || linkedModule.isTest) {
      continue;
    }
    featureCounts.set(linkedModule.featureId, (featureCounts.get(linkedModule.featureId) ?? 0) + 1);
  }

  const ranked = [...featureCounts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  const [topFeatureId, topCount] = ranked[0] ?? [];
  const secondCount = ranked[1]?.[1] ?? 0;
  const linkedCount = moduleNode.imports.length + moduleNode.importedBy.length;
  const isStrong = typeof topFeatureId === "string"
    && typeof topCount === "number"
    && (topCount >= 2 || (topCount === 1 && featureCounts.size === 1 && linkedCount === 1))
    && topCount > secondCount;

  if (isStrong) {
    const feature = getFeatureDefinition(topFeatureId);
    return {
      feature,
      reason: {
        category: "import-neighbor-inference",
        detail: `Inferred from ${topCount} resolved local import neighbor${topCount === 1 ? "" : "s"} in ${feature.label}.`,
        confidence: "high"
      }
    };
  }

  if (topCount && topCount === secondCount) {
    return {
      feature: pathClassification.feature,
      reason: {
        category: "ambiguous-match",
        detail: "Import neighbors point to multiple features with equal confidence.",
        confidence: "low"
      }
    };
  }

  return {
    feature: pathClassification.feature,
    reason: {
      category: "no-strong-import-neighbor-inference",
      detail: featureCounts.size === 0
        ? "No classified local import neighbors were available."
        : "Import-neighbor evidence was too weak to classify this module.",
      confidence: "low"
    }
  };
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
      ? `${featureModules.length} unclassified modules. Samples: ${featureModules.slice(0, 4).map((moduleNode) => moduleNode.path).join(", ")}`
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
  return new RegExp(`(^|[\\W_])${escapeRegExp(normalizedPattern)}([\\W_]|$)`).test(normalizedPath);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
