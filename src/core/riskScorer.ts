import { RiskLevel } from "./architectureModel";

export function riskRank(level: RiskLevel): number {
  switch (level) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
  }
}
