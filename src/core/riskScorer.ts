import { ChangedFile, ModuleNode, RiskItem, RiskLevel } from "../webview/dashboardState";

export interface RiskScore {
  level: RiskLevel;
  reason: string;
}

const highRiskPatterns = [
  { pattern: /\b(config|settings|runtime_config)\b/i, reason: "Configuration loading affects runtime behavior." },
  { pattern: /\b(env|environment|subprocess)\b/i, reason: "Environment handling can change launch behavior." },
  { pattern: /\b(launch|launcher|startup|setup\.py|package\.xml|pyproject\.toml)\b/i, reason: "Launch or package metadata affects startup paths." },
  { pattern: /\b(safety|collision|zone|limit)\b/i, reason: "Safety, collision, or zone logic is high impact." },
  { pattern: /\b(motion|trajectory|planner|movej|movel|pose)\b/i, reason: "Motion planning changes affect robot movement." },
  { pattern: /\b(robot|controller|rws|egm|rapid|io)\b/i, reason: "Robot I/O changes affect controller communication." }
];

export function scoreModuleRisk(relativePath: string, importedByCount: number): RiskScore {
  const normalized = relativePath.replaceAll("\\", "/");

  if (/\b(test|tests|docs?|readme)\b/i.test(normalized)) {
    return {
      level: "low",
      reason: "Test or documentation change has limited runtime impact."
    };
  }

  for (const item of highRiskPatterns) {
    if (item.pattern.test(normalized)) {
      return {
        level: "high",
        reason: item.reason
      };
    }
  }

  if (importedByCount >= 5) {
    return {
      level: "high",
      reason: "This module is imported by many modules."
    };
  }

  if (importedByCount >= 2) {
    return {
      level: "medium",
      reason: "This module has multiple local dependents."
    };
  }

  return {
    level: "low",
    reason: "Local impact appears limited by path and dependency fan-in."
  };
}

export function scoreChangedFile(path: string, moduleNode: ModuleNode | undefined): ChangedFile["riskLevel"] {
  return scoreChangedFileWithReason(path, moduleNode).level;
}

export function scoreChangedFileWithReason(path: string, moduleNode: ModuleNode | undefined): RiskScore {
  if (moduleNode) {
    return scoreModuleRisk(path, moduleNode.importedBy.length);
  }
  return scoreModuleRisk(path, 0);
}

export function buildRiskSummary(changedFiles: ChangedFile[]): RiskItem[] {
  const levels: RiskLevel[] = ["high", "medium", "low"];
  return levels.map((level) => {
    const files = changedFiles.filter((file) => file.riskLevel === level);
    return {
      id: level,
      label: capitalize(level),
      level,
      count: files.length,
      detail: files[0]?.reason ?? `No ${level} risk changed files detected.`
    };
  });
}

function capitalize(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}
