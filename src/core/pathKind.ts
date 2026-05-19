export type PathKind = "linux-native" | "unc-wsl" | "unc" | "windows-local" | "unknown";

export function describePathKind(fsPath: string | undefined): PathKind {
  if (!fsPath) {
    return "unknown";
  }

  const normalized = fsPath.replaceAll("/", "\\").toLowerCase();
  if (normalized.startsWith("\\\\wsl.localhost\\") || normalized.startsWith("\\\\wsl$\\")) {
    return "unc-wsl";
  }
  if (normalized.startsWith("\\\\")) {
    return "unc";
  }
  if (/^[a-z]:\\/.test(normalized)) {
    return "windows-local";
  }
  if (fsPath.startsWith("/")) {
    return "linux-native";
  }
  return "unknown";
}
