export interface FeaturePattern {
  id: string;
  label: string;
  patterns: string[];
}

export const defaultFeaturePatterns: FeaturePattern[] = [
  {
    id: "gui",
    label: "GUI",
    patterns: ["**/gui/**", "**/operator_panel/**", "**/*panel*.py", "**/*view*.py", "**/*tab*.py"]
  },
  {
    id: "motion",
    label: "Motion Planning",
    patterns: ["**/motion/**", "**/moveit/**", "**/*motion*.py", "**/*planner*.py", "**/*trajectory*.py"]
  },
  {
    id: "safety",
    label: "Safety Layer",
    patterns: ["**/safety/**", "**/*collision*.py", "**/*zone*.py", "**/*guard*.py"]
  },
  {
    id: "config",
    label: "Config System",
    patterns: ["**/config/**", "**/*config*.py", "**/*.yaml", "**/*.yml", "**/*.json", "**/.env*"]
  },
  {
    id: "robot_io",
    label: "Robot I/O",
    patterns: ["**/rws/**", "**/egm/**", "**/*rapid*.py", "**/*robot*.py", "**/*abb*.py"]
  },
  {
    id: "tests",
    label: "Tests",
    patterns: ["tests/**", "**/test_*.py", "**/*_test.py"]
  },
  {
    id: "docs",
    label: "Docs",
    patterns: ["docs/**", "**/*.md"]
  }
];
