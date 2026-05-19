import { DependencyEdge, ModuleNode } from "./dashboardState";
import { SemanticFeatureDefinition, SemanticFlowRole } from "./semanticArchitectureModel";

export type RuntimeModuleRole =
  | "entrypoint"
  | "orchestrator"
  | "service"
  | "adapter"
  | "config"
  | "data"
  | "safety"
  | "motion-builder"
  | "gui"
  | "utility"
  | "unclassified";

export interface ModuleRoleAssignment {
  moduleId: string;
  role: RuntimeModuleRole;
  label: string;
  confidence: "low" | "medium" | "high";
  reason: string;
}

export function inferModuleRole(
  moduleNode: ModuleNode,
  dependencies: readonly DependencyEdge[],
  semanticDefinition?: SemanticFeatureDefinition
): ModuleRoleAssignment | undefined {
  if (moduleNode.isTest) {
    return undefined;
  }

  const localText = normalize(`${moduleNode.path} ${moduleNode.name} ${moduleNode.imports.join(" ")}`);
  const edgeText = normalize(dependencies
    .filter((edge) => edge.from === moduleNode.id || edge.to === moduleNode.id)
    .map((edge) => `${edge.from} ${edge.to} ${edge.kind}`)
    .join(" "));
  const searchable = `${localText} ${edgeText}`;

  if (moduleNode.isEntryPoint || hasAny(searchable, ["launcher", "main", "startup", "entry"])) {
    return assignment(moduleNode, "entrypoint", "Entry Point", "high", "Module is marked or named as a runtime entrypoint.");
  }
  if (hasAny(searchable, ["config", "settings", "env", "yaml", "yml", "toml"])) {
    return assignment(moduleNode, "config", "Config", "high", "Path, name, import, or edge context references configuration.");
  }
  if (hasAny(searchable, ["rws", "egm", "rapid", "bridge", "client", "controller"])) {
    return assignment(moduleNode, "adapter", "Adapter", "high", "Path, name, import, or edge context references controller or bridge adapters.");
  }
  if (hasAny(searchable, ["safety", "collision", "zone", "limit", "guard"])) {
    return assignment(moduleNode, "safety", "Safety", "high", "Path, name, import, or edge context references safety validation.");
  }
  if (hasAny(searchable, ["gui", "panel", "tab", "view", "widget", "operator"])) {
    return assignment(moduleNode, "gui", "GUI", "high", "Path, name, import, or edge context references operator UI.");
  }
  if (hasAny(searchable, ["motion", "movej", "movel", "trajectory", "path", "pose", "ik"])) {
    return assignment(moduleNode, "motion-builder", "Motion Builder", "high", "Path, name, import, or edge context references motion planning.");
  }
  if (hasAny(searchable, ["task", "runner", "job", "sequence", "orchestrator"])) {
    return assignment(moduleNode, "orchestrator", "Orchestrator", "high", "Path, name, import, or edge context references orchestration.");
  }
  if (hasAny(searchable, ["common", "utils", "utility", "helper", "helpers", "logging", "math", "transform"])) {
    return assignment(moduleNode, "utility", "Utility", "high", "Path, name, import, or edge context references shared utilities.");
  }

  const semanticMatch = semanticDefinition?.flowSteps.find((flowStep) => {
    const hints = [...flowStep.pathHints, ...flowStep.importHints];
    return hints.length > 0 && hasAny(searchable, hints);
  });
  if (semanticMatch) {
    const role = flowRoleToRuntimeRole(semanticMatch.role);
    return assignment(moduleNode, role, roleLabel(role), "medium", `Matched semantic flow step "${semanticMatch.label}".`);
  }

  return assignment(moduleNode, "unclassified", "Supporting / Unclassified Runtime Modules", "low", "No runtime role hint matched this module.");
}

export function roleLabel(role: RuntimeModuleRole): string {
  switch (role) {
    case "entrypoint":
      return "Entry Point";
    case "orchestrator":
      return "Orchestrator";
    case "service":
      return "Service";
    case "adapter":
      return "Adapter";
    case "config":
      return "Config";
    case "data":
      return "Data";
    case "safety":
      return "Safety";
    case "motion-builder":
      return "Motion Builder";
    case "gui":
      return "GUI";
    case "utility":
      return "Utility";
    case "unclassified":
      return "Supporting / Unclassified Runtime Modules";
  }
}

function assignment(
  moduleNode: ModuleNode,
  role: RuntimeModuleRole,
  label: string,
  confidence: ModuleRoleAssignment["confidence"],
  reason: string
): ModuleRoleAssignment {
  return {
    moduleId: moduleNode.id,
    role,
    label,
    confidence,
    reason
  };
}

function flowRoleToRuntimeRole(role: SemanticFlowRole): RuntimeModuleRole {
  switch (role) {
    case "entrypoint":
      return "entrypoint";
    case "orchestrator":
      return "orchestrator";
    case "adapter":
      return "adapter";
    case "config":
      return "config";
    case "data":
      return "data";
    case "safety":
      return "safety";
    case "service":
    case "output":
      return "service";
  }
}

function hasAny(value: string, needles: readonly string[]): boolean {
  return needles.some((needle) => value.includes(needle.toLowerCase()));
}

function normalize(value: string): string {
  return value.replaceAll("\\", "/").toLowerCase();
}
