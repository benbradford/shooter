import Phaser from "phaser";
import type { Entity } from "../ecs/Entity";
import type GameScene from "../GameScene";

export type CellData = {
  layer: number;
  isTransition: boolean;
  occupants: Set<Entity>;
};

export class Grid {
  public width: number; // columns
  public height: number; // rows
  public readonly cellSize: number;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private isGridDebugEnabled: boolean = true;
  private isShowingOccupants: boolean = false;
  private isSceneDebugEnabled: boolean = false;
  private collisionBoxes: Array<{ x: number; y: number; width: number; height: number }> = [];
  private emitterBoxes: Array<{ x: number; y: number; size: number }> = [];

  public get gridDebugEnabled(): boolean {
    return this.isGridDebugEnabled;
  }

  public get sceneDebugEnabled(): boolean {
    return this.isSceneDebugEnabled;
  }

  public get rows(): number {
    return this.height;
  }

  public get cols(): number {
    return this.width;
  }

  public cells: CellData[][];

  constructor(scene: Phaser.Scene, width: number, height: number, cellSize: number = 64) {
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
          isTransition: false,
          occupants: new Set()
        };
      }
    }

    // Graphics for debug rendering
    this.graphics = scene.add.graphics({ lineStyle: { width: 1, color: 0xffffff, alpha: 0.3 } });

    // Toggle grid debug with G
    const keyG = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.G);
    keyG?.on("down", () => {
      this.isGridDebugEnabled = !this.isGridDebugEnabled;
      this.render();
    });

    // Toggle occupant highlighting and collision boxes with C
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
    });
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
   * Convert cell indices to top-left world coordinates
   */
  cellToWorld(col: number, row: number) {
    return { x: col * this.cellSize, y: row * this.cellSize };
  }

  setCell(col: number, row: number, data: Partial<CellData>) {
    if (!this.cells[row]?.[col]) return;
    this.cells[row][col] = { ...this.cells[row][col], ...data };
  }

  getCell(col: number, row: number) {
    if (!this.cells[row]?.[col]) return null;
    return this.cells[row][col];
  }

  addOccupant(col: number, row: number, entity: Entity): void {
    const cell = this.getCell(col, row);
    if (cell) {
      cell.occupants.add(entity);
    }
  }

  removeOccupant(col: number, row: number, entity: Entity): void {
    const cell = this.getCell(col, row);
    if (cell) {
      cell.occupants.delete(entity);
    }
  }

  isOccupied(col: number, row: number): boolean {
    const cell = this.getCell(col, row);
    return cell ? cell.occupants.size > 0 : false;
  }

  getOccupants(col: number, row: number): Set<Entity> {
    const cell = this.getCell(col, row);
    return cell ? cell.occupants : new Set();
  }

  clearAllOccupants(): void {
    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        this.cells[row][col].occupants.clear();
      }
    }
  }

  /**
   * Render grid lines for debugging
   */
  render() {
    this.graphics.clear();

    if (!this.isGridDebugEnabled) {
      // Still draw scene debug elements even if grid is off
      if (this.isSceneDebugEnabled) {
        this.renderSceneDebug();
      }
      return;
    }

    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        const x = col * this.cellSize;
        const y = row * this.cellSize;
        const cell = this.cells[row][col];

        // Layer shading: darker for higher layers, lighter for lower layers
        let layerAlpha: number;
        let layerColor: number;
        
        if (cell.layer < 0) {
          // Lower layers: lighter (white with low alpha)
          layerAlpha = 0.25;
          layerColor = 0xffffff;
        } else if (cell.layer > 0) {
          // Higher layers: darker (black with higher alpha)
          layerAlpha = 0.4;
          layerColor = 0x000000;
        } else {
          // Ground level: neutral gray
          layerAlpha = 0.1;
          layerColor = 0x808080;
        }
        
        this.graphics.fillStyle(layerColor, layerAlpha);
        this.graphics.fillRect(x, y, this.cellSize, this.cellSize);

        // Transition cells in blue (override layer color)
        if (cell.isTransition) {
          this.graphics.fillStyle(0x0000ff, 0.5);
          this.graphics.fillRect(x, y, this.cellSize, this.cellSize);
        }

        // Occupied cells in green (overlay on top) - COMMENTED OUT FOR DEBUG
        // if (this.isShowingOccupants && cell.occupants.size > 0) {
        //   this.graphics.fillStyle(0x00ff00, 0.3);
        //   this.graphics.fillRect(x, y, this.cellSize, this.cellSize);
        // }

        // Draw cell outline
        this.graphics.lineStyle(1, 0xffffff, 0.3);
        this.graphics.strokeRect(x + 0.5, y + 0.5, this.cellSize, this.cellSize); // 0.5 for crisp lines
      }
    }

    // Draw scene debug elements if enabled
    if (this.isSceneDebugEnabled) {
      this.renderSceneDebug();
    }
  }

  private renderSceneDebug(): void {
    // Draw collision boxes
    this.collisionBoxes.forEach(box => {
      this.graphics.lineStyle(2, 0x0000ff, 1);
      this.graphics.strokeRect(box.x, box.y, box.width, box.height);
    });

    // Draw emitter boxes
    this.emitterBoxes.forEach(box => {
      this.graphics.fillStyle(0xff0000, 0.5);
      this.graphics.fillRect(box.x - box.size / 2, box.y - box.size / 2, box.size, box.size);
    });

    // Clear for next frame
    this.collisionBoxes = [];
    this.emitterBoxes = [];
  }

  renderCollisionBox(x: number, y: number, width: number, height: number): void {
    if (!this.isSceneDebugEnabled) return;
    this.collisionBoxes.push({ x, y, width, height });
  }

  renderEmitterBox(x: number, y: number, size: number): void {
    if (!this.isSceneDebugEnabled) return;
    this.emitterBoxes.push({ x, y, size });
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

  destroy(): void {
    // Clear all occupants
    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        this.cells[row][col].occupants.clear();
      }
    }
    
    // Destroy graphics object
    this.graphics.destroy();
  }
}
