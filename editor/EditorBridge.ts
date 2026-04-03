import type GameScene from '../src/scenes/GameScene';
import type { Grid, CellProperty } from '../src/systems/grid/Grid';
import type { EntityManager } from '../src/ecs/EntityManager';
import type { Entity } from '../src/ecs/Entity';
import type { LevelData, LevelEntity, EntityType, BackgroundTextureConfig, AnimatedTextureConfig } from '../src/systems/level/LevelLoader';
import { TransformComponent } from '../src/ecs/components/core/TransformComponent';
import { GridPositionComponent } from '../src/ecs/components/movement/GridPositionComponent';
import { DifficultyComponent } from '../src/ecs/components/ai/DifficultyComponent';
import { SpriteComponent } from '../src/ecs/components/core/SpriteComponent';
import { PatrolComponent } from '../src/ecs/components/ai/PatrolComponent';
import { BreakableComponent } from '../src/ecs/components/breakable/BreakableComponent';
import { RarityComponent } from '../src/ecs/components/core/RarityComponent';
import { NPCIdleComponent } from '../src/ecs/entities/npc/NPCIdleComponent';
import { Direction } from '../src/constants/Direction';
import type { Toast } from './panels/Toast';

const MAX_HISTORY = 50;

export class EditorBridge {
  private static instance: EditorBridge;
  private scene!: GameScene;
  private toast!: Toast;

  // Editor state
  currentTool = 'select';
  selectedCellProperty: CellProperty | null = null;
  selectedEntityType: EntityType | null = null;
  selectedEntity: Entity | null = null;
  selectedCell: { col: number; row: number } | null = null;
  selectedTexture: string | null = null;
  isDirty = false;
  currentLevelName: string | null = null;

  // Guards
  isLoading = false;
  private isSaving = false;
  private isDragBatching = false;

  // History
  private readonly historyStack: string[] = [];
  private readonly redoStack: string[] = [];

  // Callbacks
  onCellClicked: ((col: number, row: number) => void) | null = null;
  onEntityClicked: ((entity: Entity) => void) | null = null;
  onSelectionCleared: (() => void) | null = null;
  onLevelLoaded: ((levelName: string) => void) | null = null;
  onDirtyStateChanged: ((isDirty: boolean) => void) | null = null;
  onSceneReady: (() => void) | null = null;
  onLoadError: ((levelName: string, error: unknown) => void) | null = null;

  static getInstance(): EditorBridge {
    if (!EditorBridge.instance) {
      EditorBridge.instance = new EditorBridge();
    }
    return EditorBridge.instance;
  }

  setToast(toast: Toast): void { this.toast = toast; }
  getScene(): GameScene { return this.scene; }
  setScene(scene: GameScene): void { this.scene = scene; }
  getGrid(): Grid { return this.scene.getGrid(); }
  getEntityManager(): EntityManager { return this.scene.getEntityManager(); }

  notifySceneReady(): void {
    this.isLoading = false;
    this.onSceneReady?.();
    if (this.currentLevelName) {
      this.onLevelLoaded?.(this.currentLevelName);
    }
  }

  // --- Mutation wrapper ---
  private _applyMutation(description: string, mutationFn: () => void): void {
    if (this.isLoading) return;
    if (!this.isDragBatching) {
      const snapshot = JSON.stringify(this.getCurrentLevelData());
      this.historyStack.push(snapshot);
      if (this.historyStack.length > MAX_HISTORY) this.historyStack.shift();
      this.redoStack.length = 0;
    }
    mutationFn();
    if (!this.isDirty) {
      this.isDirty = true;
      this.onDirtyStateChanged?.(true);
    }
    console.log(`[Editor] ${description}`);
  }

  beginDragMutation(): void {
    if (this.isDragBatching) return;
    this.isDragBatching = true;
    const snapshot = JSON.stringify(this.getCurrentLevelData());
    this.historyStack.push(snapshot);
    if (this.historyStack.length > MAX_HISTORY) this.historyStack.shift();
    this.redoStack.length = 0;
  }

  endDragMutation(): void {
    this.isDragBatching = false;
  }

  undo(): void { console.log('[EditorBridge] undo() not yet implemented'); }
  redo(): void { console.log('[EditorBridge] redo() not yet implemented'); }

  // --- Tool selection ---
  setTool(tool: string, property?: CellProperty): void {
    this.currentTool = tool;
    this.selectedCellProperty = property ?? null;
    if (tool !== 'entity') this.selectedEntityType = null;
    if (tool !== 'texture') this.selectedTexture = null;
  }

  selectEntity(entity: Entity): void {
    this.selectedEntity = entity;
    this.selectedCell = null;
    this.onEntityClicked?.(entity);
  }

  selectCell(col: number, row: number): void {
    this.selectedEntity = null;
    this.selectedCell = { col, row };
    this.onCellClicked?.(col, row);
  }

  clearSelection(): void {
    this.selectedEntity = null;
    this.selectedCell = null;
    this.onSelectionCleared?.();
  }

  deleteSelected(): void {
    if (this.selectedEntity) {
      this.removeEntity(this.selectedEntity.id);
    }
  }

  // --- Grid mutations ---
  paintCell(col: number, row: number): void {
    this._applyMutation(`Paint ${this.currentTool} at ${col},${row}`, () => {
      const grid = this.getGrid();
      const cell = grid.getCell(col, row);
      if (!cell) return;

      if (this.currentTool === 'floor') {
        grid.setCell(col, row, { layer: 0, properties: new Set() });
      } else if (this.selectedCellProperty) {
        const props = new Set(cell.properties);
        props.add(this.selectedCellProperty);
        const layer = (this.selectedCellProperty === 'wall' || this.selectedCellProperty === 'platform' || this.selectedCellProperty === 'stairs') ? 1 : cell.layer;
        grid.setCell(col, row, { layer, properties: props });
      }
      grid.render();
      this.scene.renderGrid(grid);
    });
  }

  setCellTexture(col: number, row: number, textureKey: string): void {
    this._applyMutation(`Set texture ${textureKey} at ${col},${row}`, () => {
      const grid = this.getGrid();
      grid.setCell(col, row, { backgroundTexture: textureKey });
      grid.render();
      this.scene.renderGrid(grid);
    });
  }

  clearCellTexture(col: number, row: number): void {
    this._applyMutation(`Clear texture at ${col},${row}`, () => {
      const grid = this.getGrid();
      grid.setCell(col, row, { backgroundTexture: '' });
      grid.render();
      this.scene.renderGrid(grid);
    });
  }

  setCellLayer(col: number, row: number, layer: number): void {
    this._applyMutation(`Set layer ${layer} at ${col},${row}`, () => {
      const grid = this.getGrid();
      grid.setCell(col, row, { layer });
      grid.render();
      this.scene.renderGrid(grid);
    });
  }

  clearCell(col: number, row: number): void {
    this._applyMutation(`Clear cell at ${col},${row}`, () => {
      const grid = this.getGrid();
      grid.setCell(col, row, { layer: 0, properties: new Set(), backgroundTexture: '' });
      grid.render();
      this.scene.renderGrid(grid);
    });
  }

  // --- Entity mutations ---
  addEntity(type: EntityType, col: number, row: number): void {
    this._applyMutation(`Add ${type} at ${col},${row}`, () => {
      const entityManager = this.getEntityManager();
      const levelData = this.scene.getLevelData();

      // Generate lowest-available ID
      const allIds = new Set(entityManager.getAll().map(e => e.id));
      // Also check levelData entities for non-spawned types (triggers, exits, etc.)
      for (const e of levelData.entities ?? []) allIds.add(e.id);
      let idNum = 0;
      while (allIds.has(`${type}${idNum}`)) idNum++;
      const newId = `${type}${idNum}`;

      const defaults: Record<string, Record<string, unknown>> = {
        skeleton: { col, row, difficulty: 'medium' },
        thrower: { col, row, difficulty: 'medium' },
        stalking_robot: { col, row, difficulty: 'medium', waypoints: [{ col, row }] },
        bug_base: { col, row, difficulty: 'medium' },
        bullet_dude: { col, row, difficulty: 'medium' },
        puma: { col, row, difficulty: 'medium', startDirection: 4 },
        breakable: { col, row, texture: 'dungeon_vase', health: 1, rarity: 'epic' },
        npc: { col, row, assets: 'npc1', direction: 'Down', interactions: [] },
        trigger: { eventToRaise: `event_${newId}`, triggerCells: [{ col, row }], oneShot: true },
        exit: { targetLevel: '', targetCol: 0, targetRow: 0, triggerCells: [{ col, row }] },
        eventchainer: { col: 0, row: 0, eventsToRaise: [] },
        cellmodifier: { col: 0, row: 0, cellsToModify: [] },
        interaction: { col: 0, row: 0, filename: '' },
      };

      const entityDef: LevelEntity = { id: newId, type, data: defaults[type] ?? { col, row } };
      levelData.entities ??= [];
      levelData.entities.push(entityDef);

      // For entity types that have scene representations, restart to spawn them
      // For data-only types (trigger, exit, eventchainer, cellmodifier, interaction), just add to levelData
      const dataOnlyTypes = new Set(['trigger', 'exit', 'eventchainer', 'cellmodifier', 'interaction']);
      if (!dataOnlyTypes.has(type)) {
        // Restart scene to spawn the entity via EntityLoader
        this.isLoading = true;
        this.scene.scene.restart({ editorMode: true, levelName: this.currentLevelName, levelData });
      }

      this.toast?.show(`Added ${type}: ${newId}`, 'success');
    });
  }

  removeEntity(entityId: string): void {
    this._applyMutation(`Remove ${entityId}`, () => {
      const entity = this.getEntityManager().getAll().find(e => e.id === entityId);
      if (entity) entity.destroy();
      const levelData = this.scene.getLevelData();
      if (levelData.entities) {
        levelData.entities = levelData.entities.filter(e => e.id !== entityId);
      }
      this.selectedEntity = null;
      this.onSelectionCleared?.();
    });
  }

  moveEntity(entityId: string, col: number, row: number): void {
    this._applyMutation(`Move ${entityId} to ${col},${row}`, () => {
      const entity = this.getEntityManager().getAll().find(e => e.id === entityId);
      if (!entity) return;
      const grid = this.getGrid();
      const transform = entity.get(TransformComponent);
      const gridPos = entity.get(GridPositionComponent);
      if (transform) {
        transform.x = col * grid.cellSize + grid.cellSize / 2;
        transform.y = row * grid.cellSize + grid.cellSize / 2;
        const sprite = entity.get(SpriteComponent);
        if (sprite) {
          sprite.sprite.setPosition(transform.x, transform.y);
        }
      }
      if (gridPos) {
        gridPos.currentCell = { col, row };
      }
      // Update levelData
      const levelData = this.scene.getLevelData();
      const entityDef = levelData.entities?.find(e => e.id === entityId);
      if (entityDef) {
        entityDef.data.col = col;
        entityDef.data.row = row;
      }
    });
  }

  updateEntityData(entityId: string, updates: Record<string, unknown>): void {
    this._applyMutation(`Update ${entityId}`, () => {
      const levelData = this.scene.getLevelData();
      const entityDef = levelData.entities?.find(e => e.id === entityId);
      if (entityDef) {
        Object.assign(entityDef.data, updates);
      }
      // Update difficulty component if present
      if (updates.difficulty !== undefined) {
        const entity = this.getEntityManager().getAll().find(e => e.id === entityId);
        if (entity) {
          const diff = entity.get(DifficultyComponent<string>);
          if (diff) diff.difficulty = updates.difficulty as string;
        }
      }
    });
  }

  updateEntityMeta(entityId: string, meta: { createOnAnyEvent?: string[]; createOnAllEvents?: string[]; respawnable?: boolean }): void {
    this._applyMutation(`Update meta ${entityId}`, () => {
      const levelData = this.scene.getLevelData();
      const entityDef = levelData.entities?.find(e => e.id === entityId);
      if (!entityDef) return;
      if (meta.createOnAnyEvent !== undefined) {
        entityDef.createOnAnyEvent = meta.createOnAnyEvent.length > 0 ? meta.createOnAnyEvent : undefined;
      }
      if (meta.createOnAllEvents !== undefined) {
        entityDef.createOnAllEvents = meta.createOnAllEvents.length > 0 ? meta.createOnAllEvents : undefined;
      }
      if (meta.respawnable !== undefined) {
        entityDef.respawnable = meta.respawnable || undefined;
      }
    });
  }

  movePlayer(col: number, row: number): void {
    this._applyMutation(`Move player to ${col},${row}`, () => {
      const player = this.getEntityManager().getFirst('player');
      if (!player) return;
      const grid = this.getGrid();
      const transform = player.get(TransformComponent);
      if (transform) {
        transform.x = col * grid.cellSize + grid.cellSize / 2;
        transform.y = row * grid.cellSize + grid.cellSize / 2;
        const sprite = player.get(SpriteComponent);
        if (sprite) sprite.sprite.setPosition(transform.x, transform.y);
      }
    });
  }

  // --- Theme ---
  setTheme(theme: string): void {
    this._applyMutation(`Set theme to ${theme}`, () => {
      this.scene.setTheme(theme as 'dungeon' | 'swamp' | 'grass' | 'wilds');
      this.scene.renderGrid(this.getGrid());
    });
  }

  // --- Resize ---
  resizeGrid(newWidth: number, newHeight: number): void {
    const grid = this.getGrid();
    if (newWidth < 10 || newHeight < 10) return;
    const outOfBounds: Entity[] = [];
    for (const entity of this.getEntityManager().getAll()) {
      if (entity.id === 'player') continue;
      const transform = entity.get(TransformComponent);
      if (!transform) continue;
      const cell = grid.worldToCell(transform.x, transform.y);
      if (cell.col >= newWidth || cell.row >= newHeight) outOfBounds.push(entity);
    }
    if (outOfBounds.length > 0) {
      const names = outOfBounds.map(e => e.id).join(', ');
      if (!confirm(`${outOfBounds.length} entities outside new bounds will be deleted: ${names}. Continue?`)) return;
    }
    this._applyMutation(`Resize to ${newWidth}x${newHeight}`, () => {
      for (const entity of outOfBounds) entity.destroy();
      // Add/remove columns
      while (grid.width < newWidth) grid.addColumn();
      while (grid.width > newWidth) grid.removeColumn();
      // Add/remove rows
      while (grid.height < newHeight) grid.addRow();
      while (grid.height > newHeight) grid.removeRow();
      grid.render();
      this.scene.renderGrid(grid);
    });
  }

  // --- Level management ---
  async loadLevel(levelName: string): Promise<void> {
    if (this.isLoading) return;
    if (this.isDirty && !confirm('You have unsaved changes. Continue?')) return;
    this.isLoading = true;
    this.isDirty = false;
    this.currentLevelName = levelName;
    this.historyStack.length = 0;
    this.redoStack.length = 0;
    this.selectedEntity = null;
    this.selectedCell = null;
    this.scene.scene.restart({ editorMode: true, levelName });
  }

  async saveLevel(): Promise<void> {
    if (!this.currentLevelName) {
      this.toast?.show('Cannot save: no level name', 'error');
      return;
    }
    if (this.isSaving) return;
    this.isSaving = true;
    const savingName = this.currentLevelName;
    try {
      const levelData = this.getCurrentLevelData();
      const json = JSON.stringify(levelData, null, 2);
      const response = await fetch('/api/save-level', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ levelName: savingName, data: json })
      });
      if (savingName !== this.currentLevelName) {
        this.toast?.show('Level changed during save, discarding', 'info');
        return;
      }
      if (response.ok) {
        this.isDirty = false;
        this.onDirtyStateChanged?.(false);
        this.toast?.show(`Saved ${savingName}`, 'success');
      } else {
        this.toast?.show(`Save failed: ${response.statusText}`, 'error');
      }
    } catch (error) {
      this.toast?.show(`Save failed: ${error}`, 'error');
    } finally {
      this.isSaving = false;
    }
  }

  async newLevel(name: string, width: number, height: number, theme: string): Promise<void> {
    const levelData: LevelData = {
      width, height,
      playerStart: { x: Math.floor(width / 2), y: Math.floor(height / 2) },
      cells: [],
      entities: [],
      levelTheme: theme as LevelData['levelTheme'],
    };
    try {
      const json = JSON.stringify(levelData, null, 2);
      const response = await fetch('/api/save-level', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ levelName: name, data: json })
      });
      if (response.ok) {
        this.toast?.show(`Created ${name}`, 'success');
        await this.loadLevel(name);
      } else {
        this.toast?.show(`Failed to create: ${response.statusText}`, 'error');
      }
    } catch (error) {
      this.toast?.show(`Failed to create: ${error}`, 'error');
    }
  }

  // --- Serialization (ported from EditorScene) ---
  getCurrentLevelData(): LevelData {
    const grid = this.getGrid();
    const entityManager = this.getEntityManager();
    const existingLevelData = this.scene.getLevelData();

    const cells = this.extractGridCells(grid, existingLevelData);
    const entities = this.extractEntities(entityManager, grid, existingLevelData);

    const player = entityManager.getFirst('player');
    const playerTransform = player?.get(TransformComponent);
    const playerStart = playerTransform
      ? grid.worldToCell(playerTransform.x, playerTransform.y)
      : { col: existingLevelData.playerStart.x, row: existingLevelData.playerStart.y };

    return {
      width: grid.width,
      height: grid.height,
      playerStart: { x: playerStart.col, y: playerStart.row },
      cells,
      entities: entities.length > 0 ? entities : [],
      levelTheme: existingLevelData.levelTheme,
      background: existingLevelData.background
    };
  }

  private extractGridCells(grid: Grid, existingLevelData: LevelData): Array<{
    col: number; row: number; layer: number;
    properties?: CellProperty[];
    backgroundTexture?: string | BackgroundTextureConfig;
    animatedTexture?: AnimatedTextureConfig;
  }> {
    const cells = [];
    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.getCell(col, row);
        if (!cell) continue;
        const layer = grid.getLayer(cell);
        const hasProperties = cell.properties.size > 0;
        const hasTexture = cell.backgroundTexture && cell.backgroundTexture !== '';
        const originalCell = existingLevelData.cells.find(c => c.col === col && c.row === row);

        if (layer !== 0 || hasProperties || hasTexture || originalCell?.animatedTexture) {
          const cellData: {
            col: number; row: number; layer: number;
            properties?: CellProperty[];
            backgroundTexture?: string | BackgroundTextureConfig;
            animatedTexture?: AnimatedTextureConfig;
          } = { col, row, layer };

          if (hasProperties) cellData.properties = Array.from(cell.properties);
          if (hasTexture) {
            cellData.backgroundTexture = originalCell?.backgroundTexture ?? cell.backgroundTexture;
          }
          if (originalCell?.animatedTexture) cellData.animatedTexture = originalCell.animatedTexture;
          cells.push(cellData);
        }
      }
    }
    return cells;
  }

  private extractEntities(entityManager: EntityManager, grid: Grid, existingLevelData: LevelData): LevelEntity[] {
    const entities: LevelEntity[] = [];

    for (const entity of entityManager.getAll()) {
      if (entity.id === 'player') continue;
      const transform = entity.get(TransformComponent);
      const gridPos = entity.get(GridPositionComponent);
      const difficulty = entity.get(DifficultyComponent);
      if (!transform && !gridPos) continue;

      const cell = gridPos
        ? { col: gridPos.currentCell.col, row: gridPos.currentCell.row }
        : grid.worldToCell(transform!.x, transform!.y);

      let type: EntityType | null = null;
      let data: Record<string, unknown> = { col: cell.col, row: cell.row };

      if (entity.id.startsWith('stalking_robot') || entity.id.startsWith('robot')) {
        type = 'stalking_robot';
        const patrol = entity.get(PatrolComponent);
        data = { col: cell.col, row: cell.row, difficulty: difficulty?.difficulty ?? 'medium', waypoints: patrol?.waypoints ?? [] };
      } else if (entity.id.startsWith('bug_base') || entity.id.startsWith('bugbase')) {
        type = 'bug_base';
        data = { col: cell.col, row: cell.row, difficulty: difficulty?.difficulty ?? 'medium' };
      } else if (entity.id.startsWith('thrower')) {
        type = 'thrower';
        data = { col: cell.col, row: cell.row, difficulty: difficulty?.difficulty ?? 'medium' };
      } else if (entity.id.startsWith('skeleton')) {
        type = 'skeleton';
        data = { col: cell.col, row: cell.row, difficulty: difficulty?.difficulty ?? 'medium' };
      } else if (entity.id.startsWith('puma')) {
        type = 'puma';
        const existing = existingLevelData.entities?.find(e => e.id === entity.id);
        data = { col: cell.col, row: cell.row, difficulty: difficulty?.difficulty ?? 'medium', startDirection: existing?.data.startDirection ?? 4 };
      } else if (entity.id.startsWith('bullet_dude') || entity.id.startsWith('bulletdude')) {
        type = 'bullet_dude';
        data = { col: cell.col, row: cell.row, difficulty: difficulty?.difficulty ?? 'medium' };
      } else if (entity.id.startsWith('breakable')) {
        type = 'breakable';
        const sprite = entity.get(SpriteComponent);
        const breakable = entity.get(BreakableComponent);
        const rarity = entity.get(RarityComponent);
        data = { col: cell.col, row: cell.row, texture: sprite?.sprite.texture.key ?? 'dungeon_vase', health: breakable?.getHealth() ?? 1, rarity: rarity?.rarity ?? 'epic' };
      } else if (entity.id.startsWith('eventchainer')) {
        type = 'eventchainer';
        const existing = existingLevelData.entities?.find(e => e.id === entity.id);
        data = existing ? existing.data : { col: cell.col, row: cell.row, eventsToRaise: [] };
      } else if (entity.id.startsWith('npc') || entity.tags?.has('npc')) {
        type = 'npc';
        const idle = entity.get(NPCIdleComponent);
        const existing = existingLevelData.entities?.find(e => e.id === entity.id);
        const npcData = existing?.data as { assets?: string; interactions?: unknown[]; scale?: number; name?: string } | undefined;
        data = {
          col: cell.col, row: cell.row,
          assets: idle?.getSpritesheet() ?? npcData?.assets ?? 'npc1',
          direction: Direction[idle?.getDirection() ?? Direction.Down],
          interactions: npcData?.interactions ?? [],
          ...(npcData?.scale ? { scale: npcData.scale } : {}),
          ...(npcData?.name ? { name: npcData.name } : {})
        };
      }

      if (type) {
        const existing = existingLevelData.entities?.find(e => e.id === entity.id);
        const entityData: LevelEntity = { id: entity.id, type, data };
        if (existing?.createOnAnyEvent) entityData.createOnAnyEvent = existing.createOnAnyEvent;
        if (existing?.createOnAllEvents) entityData.createOnAllEvents = existing.createOnAllEvents;
        if (existing?.respawnable) entityData.respawnable = existing.respawnable;
        if (existing?.suppressOnAnyFlag) entityData.suppressOnAnyFlag = existing.suppressOnAnyFlag;
        entities.push(entityData);
      }
    }

    // Add data-only entities from level data
    for (const e of existingLevelData.entities ?? []) {
      if (['trigger', 'exit', 'cellmodifier', 'interaction'].includes(e.type)) {
        entities.push(e);
      }
    }

    return entities;
  }
}
