import { createHash } from "crypto";

export interface WorkspaceIdentity {
  name: string;
  rootUri: string;
}

export function createWorkspaceKey(identity: WorkspaceIdentity): string {
  const normalizedRoot = normalizeWorkspaceRoot(identity.rootUri);
  const digest = createHash("sha256")
    .update(`${identity.name}\n${normalizedRoot}`)
    .digest("hex")
    .slice(0, 16);

  return `workspace:${digest}`;
}

export function normalizeWorkspaceRoot(rootUri: string): string {
  return rootUri.replaceAll("\\", "/").replace(/\/+$/, "").toLowerCase();
}

export function isExtensionManagedStoragePath(storagePath: string | undefined, workspacePath: string): boolean {
  if (!storagePath) {
    return true;
  }

  const normalizedStorage = normalizeWorkspaceRoot(storagePath);
  const normalizedWorkspace = normalizeWorkspaceRoot(workspacePath);
  return normalizedStorage !== normalizedWorkspace && !normalizedStorage.startsWith(`${normalizedWorkspace}/`);
}
