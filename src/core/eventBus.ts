import * as vscode from "vscode";

export class EventBus<T> {
  private readonly emitter = new vscode.EventEmitter<T>();

  public readonly event = this.emitter.event;

  public fire(value: T): void {
    this.emitter.fire(value);
  }

  public dispose(): void {
    this.emitter.dispose();
  }
}
