import type { WorldState, LevelState } from './WorldState';
import type { LevelData } from './level/LevelLoader';
import type { GridReader } from './grid/Grid';

const DEFAULT_STARTING_LEVEL = 'house3_interior';
const WORLD_STATE_PATH = '/states/default.json';

export class WorldStateManager {
  private static instance: WorldStateManager;
  private worldState: WorldState;
  private trackDestructions: boolean = true;
  private lastTimeUpdateMs: number = Date.now();
  private profileName: string | null = null;

  private constructor() {
    this.worldState = this.createEmptyState();
  }

  static getInstance(): WorldStateManager {
    if (!WorldStateManager.instance) {
      WorldStateManager.instance = new WorldStateManager();
    }
    return WorldStateManager.instance;
  }

  setTrackDestructions(value: boolean): void {
    this.trackDestructions = value;
  }

  shouldTrackDestructions(): boolean {
    return this.trackDestructions;
  }

  getProfileName(): string | undefined {
    return this.profileName ?? undefined;
  }

  async loadFromFile(profileName?: string): Promise<void> {
    this.profileName = profileName ?? null;
    const profile = profileName ?? 'default';
    const statePath = profileName ? `/states/${profileName}.json` : WORLD_STATE_PATH;
    const isLocal = await WorldStateManager.shouldUseLocalStorage();

    if (isLocal) {
      // No dev server — use localStorage
      const localData = localStorage.getItem(`state_${profile}`);
      if (localData) {
        try {
          this.worldState = JSON.parse(localData);
          this.resetTimeTracker();
          console.log(`[WorldState] Loaded from localStorage: state_${profile}`);
          return;
        } catch {
          console.warn('[WorldState] Invalid localStorage data, starting fresh');
        }
      }
      console.log('[WorldState] No localStorage data, starting fresh');
      return;
    }

    // Dev server available — load from file (editor writes here)
    try {
      const response = await fetch(statePath);
      if (response.ok) {
        this.worldState = await response.json();
        this.resetTimeTracker();
        console.log(`[WorldState] Loaded from ${statePath}`);
      } else {
        console.log('[WorldState] No saved state found, starting fresh');
      }
    } catch {
      console.log('[WorldState] No saved state found, starting fresh');
    }
  }

  loadFromJSON(json: string): void {
    this.worldState = JSON.parse(json);
  }

  getState(): WorldState {
    return this.worldState;
  }

  getCurrentLevelName(): string {
    return this.worldState.player.currentLevel;
  }

  getPlayerHealth(): number {
    return this.worldState.player.health;
  }

  getPlayerCoins(): number {
    return this.worldState.player.coins ?? 0;
  }

  getPlayerSpawnPosition(): { col?: number; row?: number } {
    return {
      col: this.worldState.player.spawnCol,
      row: this.worldState.player.spawnRow
    };
  }

  getLevelState(levelName: string): LevelState {
    if (!this.worldState.levels[levelName]) {
      this.worldState.levels[levelName] = {
        liveEntities: [],
        destroyedEntities: [],
        firedTriggers: [],
        modifiedCells: []
      };
    }
    // Backward compat: ensure movedEntities exists on old saves
    this.worldState.levels[levelName].movedEntities ??= [];
    return this.worldState.levels[levelName];
  }

  updateMovedEntity(levelName: string, entityId: string, col: number, row: number): void {
    const levelState = this.getLevelState(levelName);
    const existing = levelState.movedEntities?.find(e => e.id === entityId);
    if (existing) {
      existing.col = col;
      existing.row = row;
    } else {
      levelState.movedEntities ??= [];
      levelState.movedEntities.push({ id: entityId, col, row });
    }
  }

  removeMovedEntity(levelName: string, entityId: string): void {
    const levelState = this.getLevelState(levelName);
    if (levelState.movedEntities) {
      levelState.movedEntities = levelState.movedEntities.filter(e => e.id !== entityId);
    }
  }

  setPlayerHealth(health: number): void {
    this.worldState.player.health = health;
  }

  addCoins(amount: number): void {
    this.worldState.player.coins ??= 0;
    this.worldState.player.coins += amount;
  }

  setPlayerCoins(amount: number): void {
    this.worldState.player.coins = Math.max(0, amount);
  }

  setCurrentLevel(levelName: string): void {
    this.worldState.player.currentLevel = levelName;
  }

  setPlayerSpawnPosition(col: number, row: number): void {
    this.worldState.player.spawnCol = col;
    this.worldState.player.spawnRow = row;
    this.worldState.player.entryCell = { col, row };
  }

  clearPlayerSpawnPosition(): void {
    this.worldState.player.spawnCol = undefined;
    this.worldState.player.spawnRow = undefined;
  }

  setFlag(name: string, value: string | number): void {
    this.worldState.flags[name] = value.toString();
  }

  getFlag(name: string): string | undefined {
    return this.worldState.flags[name];
  }

  /** Type-safe flag check — returns true if flag equals the expected value. */
  isFlagTrue(name: string): boolean {
    return this.worldState.flags[name] === 'true';
  }

  isFlagCondition(name: string, condition: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte', value: string | number): boolean {
    const flagValue = this.worldState.flags[name];

    if (flagValue === undefined) {
      return false;
    }

    const compareValue = value.toString();

    if (condition === 'eq') {
      return flagValue === compareValue;
    } else if (condition === 'neq') {
      return flagValue !== compareValue;
    }

    const flagNum = Number.parseFloat(flagValue);
    const compareNum = Number.parseFloat(compareValue);

    if (Number.isNaN(flagNum) || Number.isNaN(compareNum)) {
      console.error(`[WorldState] Cannot use ${condition} with non-numeric values: flag="${flagValue}", compare="${compareValue}"`);
      return false;
    }

    if (condition === 'gt') return flagNum > compareNum;
    if (condition === 'lt') return flagNum < compareNum;
    if (condition === 'gte') return flagNum >= compareNum;
    if (condition === 'lte') return flagNum <= compareNum;

    return false;
  }

  addLiveEntity(levelName: string, entityId: string): void {
    const levelState = this.getLevelState(levelName);
    if (!levelState.liveEntities.includes(entityId)) {
      levelState.liveEntities.push(entityId);
    }
  }

  removeLiveEntity(levelName: string, entityId: string): void {
    const levelState = this.getLevelState(levelName);
    const liveIndex = levelState.liveEntities.indexOf(entityId);
    if (liveIndex !== -1) {
      levelState.liveEntities.splice(liveIndex, 1);
    }
  }

  addDestroyedEntity(levelName: string, entityId: string): void {
    const levelState = this.getLevelState(levelName);
    const liveIndex = levelState.liveEntities.indexOf(entityId);
    if (liveIndex !== -1) {
      levelState.liveEntities.splice(liveIndex, 1);
    }
    if (!levelState.destroyedEntities.includes(entityId)) {
      levelState.destroyedEntities.push(entityId);
    }
  }

  addFiredTrigger(levelName: string, eventName: string): void {
    const levelState = this.getLevelState(levelName);
    if (!levelState.firedTriggers.includes(eventName)) {
      levelState.firedTriggers.push(eventName);
    }
  }

  updateModifiedCells(levelName: string, grid: GridReader, originalLevelData: LevelData): void {
    const levelState = this.getLevelState(levelName);
    const modifiedCells: LevelState['modifiedCells'] = [];

    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const currentCell = grid.getCell(col, row);
        if (!currentCell) continue;

        const originalCell = originalLevelData.cells.find(c => c.col === col && c.row === row);
        const originalLayer = originalCell?.layer ?? 0;
        const originalProps = new Set(originalCell?.properties ?? []);
        const rawBgTex = originalCell?.backgroundTexture;
        const firstBgTex = Array.isArray(rawBgTex) ? rawBgTex[0] : rawBgTex;
        const originalTexture = typeof firstBgTex === 'string'
          ? firstBgTex
          : typeof firstBgTex === 'object' && firstBgTex !== null
            ? (firstBgTex as { image: string }).image
            : '';

        const currentProps = Array.from(currentCell.properties);
        const currentTexture = currentCell.backgroundTexture ?? '';

        const propsChanged =
          currentProps.length !== originalProps.size ||
          currentProps.some(p => !originalProps.has(p)) ||
          Array.from(originalProps).some(p => !currentProps.includes(p));

        const hasChanged =
          currentCell.layer !== originalLayer ||
          propsChanged ||
          currentTexture !== originalTexture;

        if (hasChanged) {
          modifiedCells.push({
            col,
            row,
            layer: currentCell.layer,
            properties: currentProps.length > 0 ? currentProps : undefined,
            backgroundTexture: currentTexture ? currentTexture : undefined
          });
        }
      }
    }

    levelState.modifiedCells = modifiedCells;
  }

  serializeToJSON(): string {
    this.updateTimePlayed();
    return JSON.stringify(this.worldState, null, 2);
  }

  private static useLocalStorage: boolean | null = null;

  static async shouldUseLocalStorage(): Promise<boolean> {
    if (WorldStateManager.useLocalStorage === null) {
      try {
        // Dev server has /api/profiles endpoint; Capacitor's local server does not
        const res = await fetch('/api/profiles');
        const text = await res.text();
        // Dev server returns JSON array; anything else means no dev server
        WorldStateManager.useLocalStorage = !text.startsWith('[');
      } catch {
        WorldStateManager.useLocalStorage = true;
      }
    }
    return WorldStateManager.useLocalStorage;
  }

  async saveToFile(): Promise<void> {
    const json = this.serializeToJSON();
    const profile = this.profileName ?? 'default';

    if (await WorldStateManager.shouldUseLocalStorage()) {
      localStorage.setItem(`state_${profile}`, json);
      console.log(`[WorldState] Saved to localStorage: state_${profile}`);
      return;
    }

    try {
      const res = await fetch('/api/save-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, data: json })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      console.log(`[WorldState] Saved to ${profile}.json (server)`);
    } catch {
      localStorage.setItem(`state_${profile}`, json);
      console.log(`[WorldState] Saved to localStorage: state_${profile}`);
    }
  }

  updateTimePlayed(): void {
    const now = Date.now();
    const elapsedSec = (now - this.lastTimeUpdateMs) / 1000;
    this.worldState.timePlayed = (this.worldState.timePlayed ?? 0) + elapsedSec;
    this.lastTimeUpdateMs = now;
  }

  resetTimeTracker(): void {
    this.lastTimeUpdateMs = Date.now();
  }

  private createEmptyState(): WorldState {
    return {
      timePlayed: 0,
      player: {
        health: 100,
        coins: 0,
        currentLevel: DEFAULT_STARTING_LEVEL,
        entryCell: { col: 0, row: 0 }
      },
      flags: {},
      levels: {}
    };
  }
}
