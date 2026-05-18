import * as vscode from "vscode";

export type SidebarItemKind =
  | "section"
  | "mode"
  | "feature"
  | "file"
  | "module"
  | "test"
  | "baseline"
  | "action"
  | "message";

export class ArchitectureTreeItem extends vscode.TreeItem {
  public readonly kind: SidebarItemKind;
  public readonly value?: string;

  public constructor(
    label: string,
    kind: SidebarItemKind,
    collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None,
    value?: string
  ) {
    super(label, collapsibleState);
    this.kind = kind;
    this.value = value;
    this.contextValue = kind;
  }
}
