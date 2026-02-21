import type { WorldState, LevelState } from './WorldState';
import type { LevelData } from './level/LevelLoader';
import type { Grid } from './grid/Grid';

const DEFAULT_STARTING_LEVEL = 'dungeon1';
const WORLD_STATE_PATH = '/states/default.json';

export class WorldStateManager {
  private static instance: WorldStateManager;
  private worldState: WorldState;
  private trackDestructions: boolean = true;

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

  async loadFromFile(): Promise<void> {
    try {
      const response = await fetch(WORLD_STATE_PATH);
      if (response.ok) {
        this.worldState = await response.json();
        console.log('[WorldState] Loaded from file:', this.worldState);
      } else {
        console.log('[WorldState] No saved state found, starting fresh');
      }
    } catch (_error) {
      console.log('[WorldState] No saved state found, starting fresh');
    }
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
  
  getPlayerOverheal(): number {
    return this.worldState.player.overheal;
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
        modifiedCells: [],
        cellModifierCells: []
      };
    }
    return this.worldState.levels[levelName];
  }

  setPlayerHealth(health: number): void {
    this.worldState.player.health = health;
  }
  
  setPlayerOverheal(overheal: number): void {
    this.worldState.player.overheal = overheal;
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

  addLiveEntity(levelName: string, entityId: string): void {
    const levelState = this.getLevelState(levelName);
    if (!levelState.liveEntities.includes(entityId)) {
      levelState.liveEntities.push(entityId);
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
  
  addCellModifierCells(levelName: string, cells: Array<{ col: number; row: number }>): void {
    const levelState = this.getLevelState(levelName);
    for (const cell of cells) {
      const cellKey = `${cell.col},${cell.row}`;
      if (!levelState.cellModifierCells.some(c => `${c.col},${c.row}` === cellKey)) {
        levelState.cellModifierCells.push(cell);
      }
    }
  }

  updateModifiedCells(levelName: string, grid: Grid, originalLevelData: LevelData): void {
    const levelState = this.getLevelState(levelName);
    const modifiedCells: LevelState['modifiedCells'] = [];
    const cellModifierCellsSet = new Set(levelState.cellModifierCells.map(c => `${c.col},${c.row}`));

    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const currentCell = grid.getCell(col, row);
        if (!currentCell) continue;

        const cellKey = `${col},${row}`;
        const wasTouchedByCellModifier = cellModifierCellsSet.has(cellKey);
        
        const originalCell = originalLevelData.cells.find(c => c.col === col && c.row === row);
        const originalLayer = originalCell?.layer ?? 0;
        const originalProps = new Set(originalCell?.properties ?? []);
        const originalTexture = originalCell?.backgroundTexture ?? '';

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

        if (hasChanged || wasTouchedByCellModifier) {
          console.log(`[WorldState] Cell (${col},${row}) ${wasTouchedByCellModifier ? '(cellModifier)' : '(changed)'}:`, {
            layer: { original: originalLayer, current: currentCell.layer },
            props: { original: Array.from(originalProps), current: currentProps },
            texture: { original: originalTexture, current: currentTexture }
          });
          
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

    console.log(`[WorldState] Found ${modifiedCells.length} modified cells for ${levelName}`);
    levelState.modifiedCells = modifiedCells;
  }

  serializeToJSON(): string {
    return JSON.stringify(this.worldState, null, 2);
  }

  private createEmptyState(): WorldState {
    return {
      player: {
        health: 100,
        overheal: 0,
        currentLevel: DEFAULT_STARTING_LEVEL,
        entryCell: { col: 0, row: 0 }
      },
      levels: {}
    };
  }
}
