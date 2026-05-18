export interface GitProvider {
  readonly phase: "mock-only";
}

export const gitProvider: GitProvider = {
  phase: "mock-only"
};
