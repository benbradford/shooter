import type { IState } from "./IState";

export class StateMachine<TData = void> {
  private readonly states: Map<string, IState<TData>>;
  private currentState?: IState<TData>;
  private currentKey?: string;

  constructor(states: { [key: string]: IState<TData> }, initialKey?: string, initialData?: TData) {
    this.states = new Map(Object.entries(states));
    if (initialKey) {
      this.enter(initialKey, initialData);
    }
  }

  enter(key: string, data?: TData) {
    if (this.currentKey === key) return;
    const next = this.states.get(key);
    if (!next) throw new Error(`State ${key} does not exist`);

    this.currentState?.onExit(next);
    const prev = this.currentState;
    this.currentState = next;
    this.currentKey = key;
    this.currentState.onEnter({ prevState: prev, data });
  }

  update(delta: number) {
    this.currentState?.onUpdate(delta);
  }

  getCurrentKey() {
    return this.currentKey;
  }
}
