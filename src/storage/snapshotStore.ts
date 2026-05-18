export interface SnapshotStore {
  readonly phase: "mock-only";
}

export const snapshotStore: SnapshotStore = {
  phase: "mock-only"
};
