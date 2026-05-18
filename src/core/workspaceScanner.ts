export interface WorkspaceScanner {
  readonly phase: "mock-only";
}

export const workspaceScanner: WorkspaceScanner = {
  phase: "mock-only"
};
