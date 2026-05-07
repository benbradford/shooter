/**
 * Lightweight state machine for use inside components.
 * Unlike StateMachine (which requires full IState objects), this dispatches
 * to simple handler functions — ideal for components that already have
 * updateXxx() methods and just need formalized dispatch + optional hooks.
 */

export type StateHandlers<T extends string> = {
  [K in T]?: {
    update?: (delta: number) => void;
    onEnter?: () => void;
    onExit?: () => void;
  };
};

export class ComponentStateMachine<T extends string> {
  private current: T;

  constructor(
    initialState: T,
    private readonly handlers: StateHandlers<T>
  ) {
    this.current = initialState;
  }

  get state(): T {
    return this.current;
  }

  transition(next: T): void {
    if (next === this.current) return;
    this.handlers[this.current]?.onExit?.();
    this.current = next;
    this.handlers[this.current]?.onEnter?.();
  }

  update(delta: number): void {
    this.handlers[this.current]?.update?.(delta);
  }
}
