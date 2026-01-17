import type { IState } from "./IState";

export class StateMachine {
  private readonly states: Map<string, IState>;
  private currentState?: IState;
  private currentKey?: string;

  constructor(states: { [key: string]: IState }, initialKey?: string) {
    this.states = new Map(Object.entries(states));
    if (initialKey) {
      this.enter(initialKey);
    }
  }

  enter(key: string) {
    if (this.currentKey === key) return;
    const next = this.states.get(key);
    if (!next) throw new Error(`State ${key} does not exist`);

    this.currentState?.onExit(next);
    const prev = this.currentState;
    this.currentState = next;
    this.currentKey = key;
    this.currentState.onEnter(prev);
  }

  update(delta: number) {
    this.currentState?.onUpdate(delta);
  }

  getCurrentKey() {
    return this.currentKey;
  }
}
