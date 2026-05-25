import Phaser from "phaser";
import type { Entity } from "../../ecs/Entity";
import type GameScene from "../../scenes/GameScene";
import type { EntityManager } from "../../ecs/EntityManager";
import type { CellData } from './CellData';
import type { LevelData } from '../level/LevelLoader';
import { GridDebugRenderer } from './GridDebugRenderer';
import { Depth } from '../../constants/DepthConstants';
import type { BlockedAreaManager } from '../BlockedAreaManager';
export type { CellProperty, CellData } from './CellData';

const EMPTY_SET: Set<Entity> = new Set();

export type CellCoord = { col: number; row: number };
export type WorldCoord = { x: number; y: number };

export type GridReader = {
  readonly cellSize: number;
  readonly width: number;
  readonly height: number;
  readonly rows: number;
  readonly cols: number;
  readonly cells: ReadonlyArray<ReadonlyArray<CellData>>;
  worldToCell(x: number, y: number): { col: number; row: number };
  worldToCellInto(x: number, y: number, out: CellCoord): CellCoord;
  cellToWorld(col: number, row: number): { x: number; y: number };
  cellToWorldInto(col: number, row: number, out: WorldCoord): WorldCoord;
  getCell(col: number, row: number): CellData | null;
  getLayer(cell: CellData): number;
  isTransition(cell: CellData): boolean;
  isWall(cell: CellData): boolean;
  isOccupied(col: number, row: number): boolean;
  getOccupants(col: number, row: number): ReadonlySet<Entity>;
  getEntitiesWithTag(tag: string): Entity[];
  getFirstEntityWithTag(tag: string): Entity | undefined;
  getBlockedAreaCells(): ReadonlySet<string> | undefined;
  isPointInBlockedArea(x: number, y: number, layer: number): boolean;
};

export class Grid implements GridReader {
  public width: number; // columns
  public height: number; // rows
  public readonly cellSize: number;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly scene: Phaser.Scene;
  private readonly backgroundSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  private readonly layer1Sprites: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private isGridDebugEnabled: boolean = false;
  private isShowingOccupants: boolean = false;
  private isSceneDebugEnabled: boolean = false;
  private readonly tagIndex: Map<string, Set<Entity>> = new Map();
  private readonly entityOccupancyCount: Map<Entity, number> = new Map();
  private blockedAreaManager?: BlockedAreaManager;
  private debugRenderer?: GridDebugRenderer;

  setBlockedAreaManager(manager: BlockedAreaManager): void {
    this.blockedAreaManager = manager;
  }

  getBlockedAreaCells(): ReadonlySet<string> | undefined {
    return this.blockedAreaManager?.getBlockedCells();
  }

  isPointInBlockedArea(x: number, y: number, layer: number): boolean {
    return this.blockedAreaManager?.isPointBlocked(x, y, layer) ?? false;
  }

  public get gridDebugEnabled(): boolean {
    return this.isGridDebugEnabled;
  }

  public get sceneDebugEnabled(): boolean {
    return this.isSceneDebugEnabled;
  }

  public setGridDebugEnabled(enabled: boolean): void {
    this.isGridDebugEnabled = enabled;
    this.render();
  }

  public get rows(): number {
    return this.height;
  }

  public get cols(): number {
    return this.width;
  }

  public cells: CellData[][];

  constructor(scene: Phaser.Scene, width: number, height: number, cellSize: number = 64, isEditorMode: boolean = false) {
    this.scene = scene;
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;

    // Initialize cells
    this.cells = [];
    for (let row = 0; row < height; row++) {
      this.cells[row] = [];
      for (let col = 0; col < width; col++) {
        this.cells[row][col] = {
          layer: 0,
          properties: new Set(),
          occupants: new Set()
        };
      }
    }

    // Graphics for debug rendering
    this.graphics = scene.add.graphics({ lineStyle: { width: 1, color: 0xffffff, alpha: 0.3 } });

    // Toggle grid debug with G (game only — editor handles this in CanvasInteraction with input focus check)
    if (!isEditorMode) {
      const keyG = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.G);
      keyG?.on("down", () => {
        this.isGridDebugEnabled = !this.isGridDebugEnabled;
        this.render();
      });
    }

    // Toggle occupant highlighting and collision boxes with C (game only, not editor)
    if (!isEditorMode) {
      const keyC = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.C);
      keyC?.on("down", () => {
      this.isShowingOccupants = !this.isShowingOccupants;
      this.isSceneDebugEnabled = !this.isSceneDebugEnabled;
      this.render();
      // Toggle collision debug in GameScene
      const gameScene = scene as GameScene;
      if (gameScene.collisionSystem) {
        gameScene.collisionSystem.setDebugEnabled(this.isSceneDebugEnabled);
      }
      // Toggle layer debug text
      if (gameScene.layerDebugText) {
        gameScene.layerDebugText.setVisible(this.isSceneDebugEnabled);
      }
    });
    }
  }

  /**
   * Helper to get layer number from properties
   */
  getLayer(cell: CellData): number {
    return cell.layer;
  }

  /**
   * Helper to check if cell is a transition
   */
  isTransition(cell: CellData): boolean {
    return cell.properties.has('stairs');
  }

  /**
   * Helper to check if cell is a wall
   */
  isWall(cell: CellData): boolean {
    return cell.properties.has('wall') || cell.properties.has('blocked');
  }

  /**
   * Convert world coordinates to cell indices
   */
  worldToCell(x: number, y: number) {
    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);
    return { col, row };
  }

  /**
   * Zero-allocation variant — writes result into `out` and returns it.
   * Use in hot paths (update loops) to avoid per-frame object creation.
   */
  worldToCellInto(x: number, y: number, out: CellCoord): CellCoord {
    out.col = Math.floor(x / this.cellSize);
    out.row = Math.floor(y / this.cellSize);
    return out;
  }

  /**
   * Convert cell indices to top-left world coordinates
   */
  cellToWorld(col: number, row: number) {
    return { x: col * this.cellSize, y: row * this.cellSize };
  }

  cellToWorldInto(col: number, row: number, out: WorldCoord): WorldCoord {
    out.x = col * this.cellSize;
    out.y = row * this.cellSize;
    return out;
  }

  setCell(col: number, row: number, data: Partial<CellData>) {
    if (!this.cells[row]?.[col]) return;

    const cell = this.cells[row][col];
    const oldTexture = cell.backgroundTexture;
    const oldLayer = this.getLayer(cell);

    // Merge layer if provided
    if (data.layer !== undefined) {
      cell.layer = data.layer;
    }
    // Merge properties if provided
    if (data.properties) {
      cell.properties = new Set(data.properties);
    }
    if ('backgroundTexture' in data) {
      cell.backgroundTexture = data.backgroundTexture;
    }

    const newLayer = this.getLayer(cell);

    // Handle layer rendering
    const key = `${col},${row}`;

    if (oldLayer !== newLayer) {
      const oldLayer1Sprite = this.layer1Sprites.get(key);
      if (oldLayer1Sprite) {
        oldLayer1Sprite.destroy();
        this.layer1Sprites.delete(key);
      }
    }

    if (newLayer === 1 && this.isGridDebugEnabled) {
      const worldPos = this.cellToWorld(col, row);
      const rect = this.scene.add.rectangle(
        worldPos.x + this.cellSize / 2,
        worldPos.y + this.cellSize / 2,
        this.cellSize,
        this.cellSize,
        0x4a4a5e,
        0.9
      );
      rect.setDepth(Depth.bridge);
      this.layer1Sprites.set(key, rect as unknown as Phaser.GameObjects.Rectangle);
    }

    // Handle background texture changes
    if ('backgroundTexture' in data) {
      if (oldTexture !== data.backgroundTexture) {
        const oldSprite = this.backgroundSprites.get(key);
        if (oldSprite) {
          oldSprite.destroy();
          this.backgroundSprites.delete(key);
        }
      }
    }
  }

  getCell(col: number, row: number) {
    if (!this.cells[row]?.[col]) return null;
    return this.cells[row][col];
  }

  addOccupant(col: number, row: number, entity: Entity): void {
    const cell = this.getCell(col, row);
    if (cell) {
      cell.occupants.add(entity);
      const count = this.entityOccupancyCount.get(entity) ?? 0;
      if (count === 0) {
        for (const tag of entity.tags) {
          let set = this.tagIndex.get(tag);
          if (!set) {
            set = new Set();
            this.tagIndex.set(tag, set);
          }
          set.add(entity);
        }
      }
      this.entityOccupancyCount.set(entity, count + 1);
    }
  }

  removeOccupant(col: number, row: number, entity: Entity): void {
    const cell = this.getCell(col, row);
    if (cell) {
      cell.occupants.delete(entity);
      const count = (this.entityOccupancyCount.get(entity) ?? 1) - 1;
      if (count <= 0) {
        this.entityOccupancyCount.delete(entity);
        for (const tag of entity.tags) {
          const set = this.tagIndex.get(tag);
          if (set) {
            set.delete(entity);
            if (set.size === 0) {
              this.tagIndex.delete(tag);
            }
          }
        }
      } else {
        this.entityOccupancyCount.set(entity, count);
      }
    }
  }

  isOccupied(col: number, row: number): boolean {
    const cell = this.getCell(col, row);
    return cell ? cell.occupants.size > 0 : false;
  }

  getOccupants(col: number, row: number): Set<Entity> {
    const cell = this.getCell(col, row);
    return cell ? cell.occupants : EMPTY_SET;
  }

  clearAllOccupants(): void {
    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        this.cells[row][col].occupants.clear();
      }
    }
  }

  render(entityManager?: EntityManager, levelData?: LevelData) {
    this.graphics.clear();

    const gameScene = this.scene as GameScene;
    gameScene.renderGrid(this, levelData ?? gameScene.getLevelData());

    this.debugRenderer ??= new GridDebugRenderer(this, this.graphics, this.scene);

    if (!this.isGridDebugEnabled) {
      if (this.isSceneDebugEnabled) {
        this.debugRenderer.renderSceneDebug(entityManager);
      }
      return;
    }

    this.debugRenderer.renderGridDebug(levelData ?? gameScene.getLevelData(), this.blockedAreaManager);
  }

  renderCellCoordinates(): void {
    this.debugRenderer ??= new GridDebugRenderer(this, this.graphics, this.scene);
    this.debugRenderer.renderCellCoordinates();
  }

  renderCollisionBox(x: number, y: number, width: number, height: number): void {
    if (!this.isSceneDebugEnabled) return;
    this.debugRenderer ??= new GridDebugRenderer(this, this.graphics, this.scene);
    this.debugRenderer.renderCollisionBox(x, y, width, height);
  }

  renderEmitterBox(x: number, y: number, size: number): void {
    if (!this.isSceneDebugEnabled) return;
    this.debugRenderer ??= new GridDebugRenderer(this, this.graphics, this.scene);
    this.debugRenderer.renderEmitterBox(x, y, size);
  }

  addRow(): void {
    const newRow: CellData[] = [];
    for (let col = 0; col < this.width; col++) {
      newRow.push({
        layer: 0,
        properties: new Set(),
        occupants: new Set()
      });
    }
    this.cells.push(newRow);
    this.height++;
  }

  addColumn(): void {
    for (let row = 0; row < this.height; row++) {
      this.cells[row].push({
        layer: 0,
        properties: new Set(),
        occupants: new Set()
      });
    }
    this.width++;
  }

  removeRow(): void {
    if (this.height <= 1) return;
    this.cells.pop();
    this.height--;
  }

  removeColumn(): void {
    if (this.width <= 1) return;
    for (let row = 0; row < this.height; row++) {
      this.cells[row].pop();
    }
    this.width--;
  }

  getEntitiesWithTag(tag: string): Entity[] {
    const set = this.tagIndex.get(tag);
    return set ? [...set] : [];
  }

  /** Zero-allocation variant — returns first entity with the tag, or undefined. */
  getFirstEntityWithTag(tag: string): Entity | undefined {
    const set = this.tagIndex.get(tag);
    if (!set) return undefined;
    for (const entity of set) return entity;
    return undefined;
  }

  destroy(): void {
    // Clear all occupants
    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        this.cells[row][col].occupants.clear();
      }
    }
    this.tagIndex.clear();

    // Destroy background sprites
    this.backgroundSprites.forEach(sprite => sprite.destroy());
    this.backgroundSprites.clear();

    // Destroy graphics object
    this.graphics.destroy();
  }
}
