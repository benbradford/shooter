import { WorldStateManager } from '../WorldStateManager';

export type FlagPredicate = (value: string | undefined) => boolean;

const DEFAULT_PREDICATE: FlagPredicate = (v) => v === 'true';

export class CachedFlag {
  private value: boolean;
  private readonly unsubscribe: () => void;

  constructor(
    name: string,
    ws: WorldStateManager = WorldStateManager.getInstance(),
    predicate: FlagPredicate = DEFAULT_PREDICATE,
  ) {
    this.value = predicate(ws.getFlag(name));
    this.unsubscribe = ws.subscribeFlag(name, (next) => {
      this.value = predicate(next);
    });
  }

  get(): boolean {
    return this.value;
  }

  destroy(): void {
    this.unsubscribe();
  }
}
