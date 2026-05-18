import * as vscode from "vscode";

export type SidebarItemKind = "section" | "feature" | "file" | "module" | "test" | "action" | "mode" | "baseline";

export class SidebarItem extends vscode.TreeItem {
  constructor(
    label: string,
    public readonly kind: SidebarItemKind,
    collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None
  ) {
    super(label, collapsibleState);
    this.contextValue = kind;
  }
}
