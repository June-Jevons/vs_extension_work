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
    id: "gui-layer",
    label: "GUI Layer",
    description: "Panels, tabs, and operator-facing UI code.",
    pathPatterns: ["gui", "operator_panel", "panel", "ui"],
    keywords: ["gui", "panel", "tab", "widget", "view"],
    defaultRisk: "low"
  },
  {
    id: "motion-planning",
    label: "Motion Planning",
    description: "Motion builders, trajectories, poses, and path planning.",
    pathPatterns: ["motion", "trajectory", "path", "pose", "planner"],
    keywords: ["motion", "movej", "movel", "trajectory", "pose", "path"],
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
    id: "tests",
    label: "Tests",
    description: "Unit, integration, and configuration scanner tests.",
    pathPatterns: ["test", "tests", "spec"],
    keywords: ["test", "tests", "spec"],
    defaultRisk: "low"
  },
  {
    id: "config-system",
    label: "Config System",
    description: "Configuration loading, environment handling, and settings.",
    pathPatterns: ["config", "settings", "env", "environment"],
    keywords: ["config", "settings", "env", "environment"],
    defaultRisk: "high"
  },
  {
    id: "robot-io-layer",
    label: "Robot I/O Layer",
    description: "Robot clients, controller APIs, RWS, EGM, and RAPID interfaces.",
    pathPatterns: ["robot", "abb_robot", "controller", "rws", "egm", "rapid", "io"],
    keywords: ["robot", "controller", "rws", "egm", "rapid", "io"],
    defaultRisk: "high"
  },
  {
    id: "docs",
    label: "Docs",
    description: "Documentation, notes, and markdown guides.",
    pathPatterns: ["doc", "docs", "readme", "markdown"],
    keywords: ["doc", "docs", "readme", "markdown"],
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

  for (const feature of BUILT_IN_FEATURES) {
    if (feature.id === "unmapped-unknown") {
      continue;
    }

    if (feature.pathPatterns.some((pattern) => normalized.includes(pattern) || segments.includes(pattern))) {
      return feature;
    }
  }

  return BUILT_IN_FEATURES[BUILT_IN_FEATURES.length - 1]!;
}

export function inferFeatureFromImports(moduleNode: ModuleNode, modulesById: ReadonlyMap<string, ModuleNode>): FeatureDefinition {
  const pathFeature = mapFeatureForPath(moduleNode.path);
  if (pathFeature.id !== "unmapped-unknown") {
    return pathFeature;
  }

  const featureCounts = new Map<string, number>();
  for (const linkedModuleId of [...moduleNode.imports, ...moduleNode.importedBy]) {
    const linkedModule = modulesById.get(linkedModuleId);
    if (!linkedModule?.featureId || linkedModule.featureId === "unmapped-unknown") {
      continue;
    }
    featureCounts.set(linkedModule.featureId, (featureCounts.get(linkedModule.featureId) ?? 0) + 1);
  }

  const inferredFeatureId = [...featureCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
  return BUILT_IN_FEATURES.find((feature) => feature.id === inferredFeatureId) ?? pathFeature;
}

export function buildFeatureBlocks(modules: ModuleNode[], dependencies: DependencyEdge[]): FeatureBlock[] {
  return BUILT_IN_FEATURES.map((feature) => {
    const featureModules = modules.filter((moduleNode) => moduleNode.featureId === feature.id);
    const moduleIds = new Set(featureModules.map((moduleNode) => moduleNode.id));
    const incomingEdges = dependencies.filter((edge) => moduleIds.has(edge.to) && !moduleIds.has(edge.from)).length;
    const outgoingEdges = dependencies.filter((edge) => moduleIds.has(edge.from) && !moduleIds.has(edge.to)).length;
    const changedFileCount = featureModules.filter((moduleNode) => moduleNode.riskLevel !== "low").length;

    return {
      id: feature.id,
      label: feature.label,
      description: feature.description,
      pathPatterns: feature.pathPatterns,
      moduleIds: featureModules.map((moduleNode) => moduleNode.id),
      incomingEdges,
      outgoingEdges,
      changedFileCount,
      riskLevel: highestRisk(featureModules.map((moduleNode) => moduleNode.riskLevel), feature.defaultRisk)
    };
  }).filter((feature) => feature.moduleIds.length > 0 || feature.id !== "unmapped-unknown");
}

export function getFeatureDefinition(featureId: string | undefined): FeatureDefinition {
  return BUILT_IN_FEATURES.find((feature) => feature.id === featureId) ?? BUILT_IN_FEATURES[BUILT_IN_FEATURES.length - 1]!;
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
