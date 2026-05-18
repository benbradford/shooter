import { WorldStateManager } from '../WorldStateManager';

/**
 * CachedFlag — caches a boolean WorldState flag value and refreshes it
 * automatically when the flag changes (via WorldStateManager.subscribeFlag).
 *
 * Use in hot paths (component update loops) instead of calling
 * `WorldStateManager.getInstance().getFlag(name) === 'true'` every frame.
 *
 * Lifecycle:
 *   constructor: reads current value and subscribes to changes
 *   get():       returns the cached boolean (no singleton lookup)
 *   destroy():   unsubscribes (call from Component.onDestroy if held)
 *
 * The flag is considered "true" when its string value equals 'true'.
 * All other values (undefined, '', 'false', etc.) are false.
 */
export class CachedFlag {
  private value: boolean;
  private readonly unsubscribe: () => void;

  constructor(name: string, ws: WorldStateManager = WorldStateManager.getInstance()) {
    this.value = ws.isFlagTrue(name);
    this.unsubscribe = ws.subscribeFlag(name, (next) => {
      this.value = next === 'true';
    });
  }

  get(): boolean {
    return this.value;
  }

  destroy(): void {
    this.unsubscribe();
  }
}
