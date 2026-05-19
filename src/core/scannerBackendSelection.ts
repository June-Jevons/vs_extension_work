import { PathKind } from "./pathKind";

export type ScannerBackend = "vscodeFindFiles";

export interface ScannerBackendSelection {
  backend: ScannerBackend;
  reason: string;
}

export function selectScannerBackend(pathKind: PathKind): ScannerBackendSelection {
  return {
    backend: "vscodeFindFiles",
    reason: pathKind === "linux-native"
      ? "Native Linux workspace uses deterministic VS Code findFiles scanner."
      : `Path kind ${pathKind} still uses the deterministic VS Code findFiles scanner; no fallback backend is selected.`
  };
}
