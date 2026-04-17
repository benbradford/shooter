import type GameScene from '../src/scenes/GameScene';
import type { Grid, CellProperty } from '../src/systems/grid/Grid';
import type { EntityManager } from '../src/ecs/EntityManager';
import type { Entity } from '../src/ecs/Entity';
import type { LevelData, LevelEntity, EntityType, AnimatedTextureConfig, SingleBackgroundTexture } from '../src/systems/level/LevelLoader';
import { normalizeBgTextures, bgTextureKey } from '../src/systems/level/LevelLoader';
import { TransformComponent } from '../src/ecs/components/core/TransformComponent';
import { GridPositionComponent } from '../src/ecs/components/movement/GridPositionComponent';
import { DifficultyComponent } from '../src/ecs/components/ai/DifficultyComponent';
import { SpriteComponent } from '../src/ecs/components/core/SpriteComponent';
import { PatrolComponent } from '../src/ecs/components/ai/PatrolComponent';
import { NPCIdleComponent } from '../src/ecs/entities/npc/NPCIdleComponent';
import { Direction } from '../src/constants/Direction';
import type { Toast } from './panels/Toast';

const MAX_HISTORY = 50;

export class EditorBridge {
  private static instance: EditorBridge;
  private scene!: GameScene;
  toast!: Toast;

  // Editor state
  currentTool = 'select';
  selectedEntityType: EntityType | null = null;
  selectedEntity: Entity | null = null;
  selectedCell: { col: number; row: number } | null = null;
  selectedTexture: string | null = null;
  editingTriggerCells: string | null = null; // entity ID whose triggerCells are being edited
  selectedBlockedAreaId: string | null = null;
  gridProperties: Set<CellProperty> = new Set();
  gridLayer = 0;
  isDirty = false;
  currentLevelName: string | null = null;
  selectedTextureIndex = 0;

  // Clipboard
  clipboardEntity: LevelEntity | null = null;
  private clipboardCell: { backgroundTexture?: unknown; animatedTexture?: unknown } | null = null;

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
  onDataEntityClicked: ((entityId: string) => void) | null = null;
  onSelectionCleared: (() => void) | null = null;
  onLevelLoaded: ((levelName: string) => void) | null = null;
  onDirtyStateChanged: ((isDirty: boolean) => void) | null = null;
  onSceneReady: (() => void) | null = null;
  onLoadError: ((levelName: string, error: unknown) => void) | null = null;
  onToolChanged: ((tool: string) => void) | null = null;
  onBlockedAreaSelected: ((id: string | null) => void) | null = null;
  onDrawingStateChanged: ((isDrawing: boolean) => void) | null = null;
  cancelDrawing: (() => void) | null = null;

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
  setTool(tool: string): void {
    this.currentTool = tool;
    if (tool !== 'entity') this.selectedEntityType = null;
    if (tool !== 'texture') this.selectedTexture = null;
    this.onToolChanged?.(tool);
  }

  selectEntity(entity: Entity): void {
    this.selectedEntity = entity;
    this.selectedCell = null;
    this.onEntityClicked?.(entity);
  }

  selectDataEntity(entityId: string): void {
    this.selectedEntity = null;
    this.selectedCell = null;
    this.onDataEntityClicked?.(entityId);
  }

  selectCell(col: number, row: number): void {
    this.selectedEntity = null;
    this.selectedCell = { col, row };
    this.onCellClicked?.(col, row);
  }

  clearSelection(): void {
    this.selectedEntity = null;
    this.selectedCell = null;
    this.selectedBlockedAreaId = null;
    this.editingTriggerCells = null;
    this.onSelectionCleared?.();
  }

  deleteSelected(): void {
    if (this.selectedEntity) {
      this.removeEntity(this.selectedEntity.id);
    }
  }

  // --- Grid mutations ---
  paintCell(col: number, row: number): void {
    this._applyMutation(`Paint grid at ${col},${row}`, () => {
      const grid = this.getGrid();
      const cell = grid.getCell(col, row);
      if (!cell) return;
      const levelData = this.scene.getLevelData();

      const newProps = new Set(this.gridProperties);
      const newLayer = this.gridLayer;

      grid.setCell(col, row, { layer: newLayer, properties: newProps });

      // Sync to levelData.cells
      let levelCell = levelData.cells.find(c => c.col === col && c.row === row);
      if (!levelCell) { levelCell = { col, row }; levelData.cells.push(levelCell); }
      levelCell.layer = newLayer;
      levelCell.properties = Array.from(newProps) as CellProperty[];

      grid.render();
      this.scene.renderGrid(grid);
    });
  }

  setCellTexture(col: number, row: number, textureKey: string): void {
    this._applyMutation(`Set texture ${textureKey} at ${col},${row}`, () => {
      const grid = this.getGrid();
      const levelData = this.scene.getLevelData();
      grid.setCell(col, row, { backgroundTexture: textureKey });
      // Sync to levelData.cells so renderer reads the updated texture
      let levelCell = levelData.cells.find(c => c.col === col && c.row === row);
      if (!levelCell) {
        levelCell = { col, row };
        levelData.cells.push(levelCell);
      }
      levelCell.backgroundTexture = textureKey;
      this.scene.refreshSprites();
      grid.render();
    });
  }

  clearCellTexture(col: number, row: number): void {
    this._applyMutation(`Clear texture at ${col},${row}`, () => {
      const grid = this.getGrid();
      const levelData = this.scene.getLevelData();
      grid.setCell(col, row, { backgroundTexture: '' });
      const levelCell = levelData.cells.find(c => c.col === col && c.row === row);
      if (levelCell) delete levelCell.backgroundTexture;
      this.scene.refreshSprites();
      grid.render();
    });
  }

  moveCellTexture(fromCol: number, fromRow: number, toCol: number, toRow: number): void {
    this._applyMutation(`Move texture ${fromCol},${fromRow} → ${toCol},${toRow}`, () => {
      const grid = this.getGrid();
      const levelData = this.scene.getLevelData();
      const fromCell = levelData.cells.find(c => c.col === fromCol && c.row === fromRow);
      const tex = fromCell?.backgroundTexture;
      const animTex = fromCell?.animatedTexture;
      if (!tex && !animTex) return;

      // Clear source
      grid.setCell(fromCol, fromRow, { backgroundTexture: '' });
      if (fromCell) { delete fromCell.backgroundTexture; delete fromCell.animatedTexture; }

      // Set destination
      let toCell = levelData.cells.find(c => c.col === toCol && c.row === toRow);
      if (!toCell) { toCell = { col: toCol, row: toRow }; levelData.cells.push(toCell); }
      if (tex) {
        toCell.backgroundTexture = tex;
        const textures = normalizeBgTextures(tex);
        const firstKey = textures ? bgTextureKey(textures[0]) : '';
        grid.setCell(toCol, toRow, { backgroundTexture: firstKey });
      }
      if (animTex) toCell.animatedTexture = animTex;

      this.scene.refreshSprites();
      grid.render();
    });
  }

  findClosestTextureIndex(col: number, row: number, worldX: number, worldY: number): number {
    const grid = this.getGrid();
    const cellSize = grid.cellSize;
    const levelData = this.scene.getLevelData();
    const levelCell = levelData.cells.find(c => c.col === col && c.row === row);
    const textures = normalizeBgTextures(levelCell?.backgroundTexture);
    if (!textures || textures.length <= 1) return 0;

    const centerX = col * cellSize + cellSize / 2;
    const centerY = row * cellSize + cellSize / 2;
    let bestIndex = 0;
    let bestDist = Infinity;
    for (let i = 0; i < textures.length; i++) {
      const tex = textures[i];
      const t = typeof tex === 'object' ? tex.transformOverride : undefined;
      const sx = centerX + (t?.offsetX ?? 0);
      const sy = centerY + (t?.offsetY ?? 0);
      const dist = Math.hypot(worldX - sx, worldY - sy);
      if (dist < bestDist) { bestDist = dist; bestIndex = i; }
    }
    return bestIndex;
  }

  moveSingleTexture(fromCol: number, fromRow: number, textureIndex: number, toCol: number, toRow: number): void {
    this._applyMutation(`Move texture[${textureIndex}] ${fromCol},${fromRow} → ${toCol},${toRow}`, () => {
      const grid = this.getGrid();
      const levelData = this.scene.getLevelData();
      const fromCell = levelData.cells.find(c => c.col === fromCol && c.row === fromRow);
      const textures = normalizeBgTextures(fromCell?.backgroundTexture);
      if (!textures || textureIndex >= textures.length) return;

      const tex = textures.splice(textureIndex, 1)[0];
      if (fromCell) {
        fromCell.backgroundTexture = textures.length > 0 ? textures : undefined;
        if (!fromCell.backgroundTexture) {
          delete fromCell.backgroundTexture;
          grid.setCell(fromCol, fromRow, { backgroundTexture: '' });
        }
      }

      let toCell = levelData.cells.find(c => c.col === toCol && c.row === toRow);
      if (!toCell) { toCell = { col: toCol, row: toRow }; levelData.cells.push(toCell); }
      const destTextures = normalizeBgTextures(toCell.backgroundTexture) ?? [];
      destTextures.push(tex);
      toCell.backgroundTexture = destTextures;
      grid.setCell(toCol, toRow, { backgroundTexture: bgTextureKey(destTextures[0]) });

      this.scene.refreshSprites();
      grid.render();
    });
  }

  moveCellTexturePixel(fromCol: number, fromRow: number, textureIndex: number, worldX: number, worldY: number): void {
    const grid = this.getGrid();
    const cellSize = grid.cellSize;
    const levelData = this.scene.getLevelData();
    const fromCell = levelData.cells.find(c => c.col === fromCol && c.row === fromRow);
    const textures = normalizeBgTextures(fromCell?.backgroundTexture);
    if (!textures || textureIndex >= textures.length) return;

    const centerX = fromCol * cellSize + cellSize / 2;
    const centerY = fromRow * cellSize + cellSize / 2;
    const offsetX = worldX - centerX;
    const offsetY = worldY - centerY;

    const tex = textures[textureIndex];
    const entry = typeof tex === 'string' ? { image: tex } : { ...tex };
    entry.transformOverride = { ...(entry.transformOverride ?? { scaleX: 1, scaleY: 1 }), offsetX, offsetY };
    textures[textureIndex] = entry;
    fromCell!.backgroundTexture = textures;
    this.scene.refreshSprites();
  }

  finalizeCellTexturePixelDrop(fromCol: number, fromRow: number, textureIndex: number, worldX: number, worldY: number): void {
    this._applyMutation(`Pixel-drop texture[${textureIndex}] from ${fromCol},${fromRow}`, () => {
      const grid = this.getGrid();
      const cellSize = grid.cellSize;
      const levelData = this.scene.getLevelData();
      const fromCell = levelData.cells.find(c => c.col === fromCol && c.row === fromRow);
      const textures = normalizeBgTextures(fromCell?.backgroundTexture);
      if (!textures || textureIndex >= textures.length) return;

      const toCol = Math.max(0, Math.min(grid.width - 1, Math.round(worldX / cellSize - 0.5)));
      const toRow = Math.max(0, Math.min(grid.height - 1, Math.round(worldY / cellSize - 0.5)));
      const targetCenterX = toCol * cellSize + cellSize / 2;
      const targetCenterY = toRow * cellSize + cellSize / 2;
      const offsetX = Math.round(worldX - targetCenterX);
      const offsetY = Math.round(worldY - targetCenterY);

      // Remove from source
      const tex = textures.splice(textureIndex, 1)[0];
      if (fromCell) {
        fromCell.backgroundTexture = textures.length > 0 ? textures : undefined;
        if (!fromCell.backgroundTexture) {
          delete fromCell.backgroundTexture;
          grid.setCell(fromCol, fromRow, { backgroundTexture: '' });
        }
      }

      // Add to destination with offset
      const entry = typeof tex === 'string' ? { image: tex } : { ...tex };
      entry.transformOverride = { ...(entry.transformOverride ?? { scaleX: 1, scaleY: 1 }), offsetX, offsetY };

      let toCell = levelData.cells.find(c => c.col === toCol && c.row === toRow);
      if (!toCell) { toCell = { col: toCol, row: toRow }; levelData.cells.push(toCell); }
      const destTextures = normalizeBgTextures(toCell.backgroundTexture) ?? [];
      destTextures.push(entry);
      toCell.backgroundTexture = destTextures;
      grid.setCell(toCol, toRow, { backgroundTexture: bgTextureKey(destTextures[0]) });

      this.scene.refreshSprites();
      grid.render();
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
        red_skeleton: { col, row, difficulty: 'medium' },
        thrower: { col, row, difficulty: 'medium' },
        stalking_robot: { col, row, difficulty: 'medium', waypoints: [{ col, row }] },
        bug_base: { col, row, difficulty: 'medium' },
        bullet_dude: { col, row, difficulty: 'medium' },
        puma: { col, row, difficulty: 'medium', startDirection: 4 },
        breakable: { col, row, texture: 'dungeon_vase', health: 1, rarity: 'epic' },
        collectible: { col, row, preset: 'mist_orb' },
        lever: { col, row, eventToRaise: `lever_${newId}`, startState: 'off', oneShot: false },
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
        // Save camera position before restart
        const camera = this.scene.cameras.main;
        const camX = camera.scrollX;
        const camY = camera.scrollY;
        const camZoom = camera.zoom;

        this.isLoading = true;
        this.scene.scene.restart({ editorMode: true, levelName: this.currentLevelName, levelData });

        // Restore camera and select new entity after scene is ready
        const pendingEntityId = newId;
        const origOnReady = this.onSceneReady;
        this.onSceneReady = () => {
          this.onSceneReady = origOnReady;
          origOnReady?.();
          const cam = this.scene.cameras.main;
          cam.scrollX = camX;
          cam.scrollY = camY;
          cam.setZoom(camZoom);

          const entity = this.getEntityManager().getAll().find(e => e.id === pendingEntityId);
          if (entity) {
            this.setTool('select');
            this.selectEntity(entity);
          }
        };
      } else {
        this.setTool('select');
        this.selectDataEntity(newId);
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
      // Update NPC direction component if present
      if (updates.direction !== undefined) {
        const entity = this.getEntityManager().getAll().find(e => e.id === entityId);
        if (entity) {
          const idle = entity.get(NPCIdleComponent);
          if (idle) {
            const dirStr = updates.direction as string;
            idle.facePlayer = dirStr === 'facePlayer';
            if (!idle.facePlayer) {
              idle.setDirection(Direction[dirStr as keyof typeof Direction]);
            }
          }
        }
      }
      // Update NPC transform override if present
      if (updates.transformOverride !== undefined) {
        const entity = this.getEntityManager().getAll().find(e => e.id === entityId);
        if (entity) {
          const idle = entity.get(NPCIdleComponent);
          if (idle) {
            const t = updates.transformOverride as { scaleX?: number; scaleY?: number; offsetX?: number; offsetY?: number };
            idle.transformOverride = {
              scaleX: t.scaleX ?? 1,
              scaleY: t.scaleY ?? 1,
              offsetX: t.offsetX ?? 0,
              offsetY: t.offsetY ?? 0,
            };
            idle.update(0);
          }
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

  // --- Copy/Paste ---
  copySelected(): boolean {
    if (this.selectedEntity) {
      const levelData = this.scene.getLevelData();
      const entityDef = levelData.entities?.find(e => e.id === this.selectedEntity!.id);
      if (!entityDef) return false;
      this.clipboardEntity = JSON.parse(JSON.stringify(entityDef));
      this.clipboardCell = null;
      this.toast?.show(`Copied ${entityDef.id}`, 'success');
      return true;
    }
    if (this.selectedCell) {
      const levelData = this.scene.getLevelData();
      const cell = levelData.cells.find(c => c.col === this.selectedCell!.col && c.row === this.selectedCell!.row);
      if (!cell?.backgroundTexture && !cell?.animatedTexture) return false;
      this.clipboardCell = JSON.parse(JSON.stringify({
        backgroundTexture: cell.backgroundTexture,
        animatedTexture: cell.animatedTexture,
      }));
      this.clipboardEntity = null;
      const firstTex = Array.isArray(cell.backgroundTexture) ? cell.backgroundTexture[0] : cell.backgroundTexture;
      const texName = (firstTex ? bgTextureKey(firstTex) : '') || 'texture';
      this.toast?.show(`Copied ${texName}`, 'success');
      return true;
    }
    return false;
  }

  pasteToCell(col: number, row: number): void {
    if (!this.clipboardCell) return;
    this._applyMutation(`Paste texture to ${col},${row}`, () => {
      const levelData = this.scene.getLevelData();
      let cell = levelData.cells.find(c => c.col === col && c.row === row);
      if (!cell) {
        cell = { col, row };
        levelData.cells.push(cell);
      }
      if (this.clipboardCell!.backgroundTexture) {
        cell.backgroundTexture = JSON.parse(JSON.stringify(this.clipboardCell!.backgroundTexture));
      }
      if (this.clipboardCell!.animatedTexture) {
        cell.animatedTexture = JSON.parse(JSON.stringify(this.clipboardCell!.animatedTexture));
      }
      const grid = this.getGrid();
      const textures = normalizeBgTextures(cell.backgroundTexture);
      const texKey = textures ? bgTextureKey(textures[0]) : undefined;
      if (texKey) {
        grid.setCell(col, row, { backgroundTexture: texKey });
      }
    });
    this.scene.getSceneRenderer().reinitializeSprites(this.getGrid(), this.scene.getLevelData());
  }

  pasteEntity(col: number, row: number): void {
    if (!this.clipboardEntity) return;
    const type = this.clipboardEntity.type;

    this._applyMutation(`Paste ${type} at ${col},${row}`, () => {
      const entityManager = this.getEntityManager();
      const levelData = this.scene.getLevelData();

      const allIds = new Set(entityManager.getAll().map(e => e.id));
      for (const e of levelData.entities ?? []) allIds.add(e.id);
      let idNum = 0;
      while (allIds.has(`${type}${idNum}`)) idNum++;
      const newId = `${type}${idNum}`;

      const clone: LevelEntity = JSON.parse(JSON.stringify(this.clipboardEntity));
      clone.id = newId;
      clone.data.col = col;
      clone.data.row = row;

      levelData.entities ??= [];
      levelData.entities.push(clone);

      const dataOnlyTypes = new Set(['trigger', 'exit', 'eventchainer', 'cellmodifier', 'interaction']);
      if (!dataOnlyTypes.has(type)) {
        const camera = this.scene.cameras.main;
        const camX = camera.scrollX;
        const camY = camera.scrollY;
        const camZoom = camera.zoom;

        this.isLoading = true;
        this.scene.scene.restart({ editorMode: true, levelName: this.currentLevelName, levelData });

        const pendingEntityId = newId;
        const origOnReady = this.onSceneReady;
        this.onSceneReady = () => {
          this.onSceneReady = origOnReady;
          origOnReady?.();
          const cam = this.scene.cameras.main;
          cam.scrollX = camX;
          cam.scrollY = camY;
          cam.setZoom(camZoom);

          const entity = this.getEntityManager().getAll().find(e => e.id === pendingEntityId);
          if (entity) {
            this.setTool('select');
            this.selectEntity(entity);
          }
        };
      }

      this.toast?.show(`Pasted ${type}: ${newId}`, 'success');
    });
  }

  // --- Blocked Areas ---
  addBlockedArea(vertices: Array<{ x: number; y: number }>, layer: number): string {
    let id = '';
    this._applyMutation('Add blocked area', () => {
      const levelData = this.scene.getLevelData();
      if (!levelData.blockedAreas) levelData.blockedAreas = [];
      const maxId = levelData.blockedAreas.reduce((max, a) => {
        const num = Number.parseInt(a.id.replace('ba', ''), 10);
        return Number.isNaN(num) ? max : Math.max(max, num);
      }, -1);
      id = `ba${maxId + 1}`;
      levelData.blockedAreas.push({ id, vertices, layer, blocksProjectiles: true });
    });
    return id;
  }

  removeBlockedArea(areaId: string): void {
    this._applyMutation(`Remove blocked area ${areaId}`, () => {
      const levelData = this.scene.getLevelData();
      if (!levelData.blockedAreas) return;
      levelData.blockedAreas = levelData.blockedAreas.filter(a => a.id !== areaId);
    });
    this.selectedBlockedAreaId = null;
    this.onBlockedAreaSelected?.(null);
  }

  updateBlockedArea(areaId: string, data: { layer?: number; blocksProjectiles?: boolean }): void {
    this._applyMutation(`Update blocked area ${areaId}`, () => {
      const levelData = this.scene.getLevelData();
      const area = levelData.blockedAreas?.find(a => a.id === areaId);
      if (!area) return;
      if (data.layer !== undefined) area.layer = data.layer;
      if (data.blocksProjectiles !== undefined) area.blocksProjectiles = data.blocksProjectiles;
    });
  }

  selectBlockedArea(areaId: string | null): void {
    this.selectedBlockedAreaId = areaId;
    this.selectedEntity = null;
    this.selectedCell = null;
    this.onBlockedAreaSelected?.(areaId);
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
    if (newWidth < 1 || newHeight < 1) return;
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
      background: existingLevelData.background,
      ...(existingLevelData.blockedAreas?.length ? { blockedAreas: existingLevelData.blockedAreas } : {}),
    };
  }

  private extractGridCells(grid: Grid, existingLevelData: LevelData): Array<{
    col: number; row: number; layer: number;
    properties?: CellProperty[];
    backgroundTexture?: SingleBackgroundTexture | SingleBackgroundTexture[];
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
            backgroundTexture?: SingleBackgroundTexture | SingleBackgroundTexture[];
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
      } else if (entity.id.startsWith('red_skeleton')) {
        type = 'red_skeleton';
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
        const existing = existingLevelData.entities?.find(e => e.id === entity.id);
        const existingData = existing?.data as { texture?: string; health?: number; rarity?: string } | undefined;
        data = { col: cell.col, row: cell.row, texture: existingData?.texture ?? 'dungeon_vase', health: existingData?.health ?? 1, rarity: existingData?.rarity ?? 'epic' };
      } else if (entity.id.startsWith('collectible')) {
        type = 'collectible';
        const existing = existingLevelData.entities?.find(e => e.id === entity.id);
        data = { col: cell.col, row: cell.row, preset: (existing?.data as { preset?: string })?.preset ?? 'mist_orb' };
      } else if (entity.id.startsWith('lever')) {
        type = 'lever';
        const existing = existingLevelData.entities?.find(e => e.id === entity.id);
        const existingData = existing?.data as { eventToRaise?: string; startState?: string; oneShot?: boolean } | undefined;
        data = { col: cell.col, row: cell.row, eventToRaise: existingData?.eventToRaise ?? '', startState: existingData?.startState ?? 'off', oneShot: existingData?.oneShot ?? false };
      } else if (entity.id.startsWith('eventchainer')) {
        type = 'eventchainer';
        const existing = existingLevelData.entities?.find(e => e.id === entity.id);
        data = existing ? existing.data : { col: cell.col, row: cell.row, eventsToRaise: [] };
      } else if (entity.id.startsWith('npc') || entity.tags?.has('npc')) {
        type = 'npc';
        const idle = entity.get(NPCIdleComponent);
        const existing = existingLevelData.entities?.find(e => e.id === entity.id);
        const npcData = existing?.data as { assets?: string; interactions?: unknown[]; scale?: number; name?: string; transformOverride?: { scaleX?: number; scaleY?: number; offsetX?: number; offsetY?: number } } | undefined;
        data = {
          col: cell.col, row: cell.row,
          assets: npcData?.assets ?? idle?.getSpritesheet() ?? 'npc1',
          direction: idle?.facePlayer ? 'facePlayer' : Direction[idle?.getDirection() ?? Direction.Down],
          interactions: npcData?.interactions ?? [],
          ...(npcData?.scale ? { scale: npcData.scale } : {}),
          ...(npcData?.name ? { name: npcData.name } : {}),
          ...(npcData?.transformOverride ? { transformOverride: npcData.transformOverride } : {})
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
