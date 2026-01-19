import Phaser from "phaser";
import type { Entity } from "../ecs/Entity";

export type CellData = {
  layer: number;
  isTransition: boolean;
  occupants: Set<Entity>;
};

export class Grid {
  public readonly width: number; // columns
  public readonly height: number; // rows
  public readonly cellSize: number;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private debug: boolean = true;
  private collisionBoxes: Array<{ x: number; y: number; width: number; height: number }> = [];
  private emitterBoxes: Array<{ x: number; y: number; size: number }> = [];

  public get debugEnabled(): boolean {
    return this.debug;
  }

  public readonly cells: CellData[][];

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

    // Toggle debug grid with G
    const keyG = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.G);
    keyG?.on("down", () => {
      this.debug = !this.debug;
      this.render();
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
    if (!this.cells[row] || !this.cells[row][col]) return;
    this.cells[row][col] = { ...this.cells[row][col], ...data };
  }

  getCell(col: number, row: number) {
    if (!this.cells[row] || !this.cells[row][col]) return null;
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

  /**
   * Render grid lines for debugging
   */
  render() {
    this.graphics.clear();

    if (!this.debug) return;

    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        const x = col * this.cellSize;
        const y = row * this.cellSize;
        const cell = this.cells[row][col];

        // Layer shading: darker for higher layers, lighter for lower layers
        const layerAlpha = cell.layer < 0 ? 0.15 : (cell.layer > 0 ? 0.3 : 0.2);
        const layerColor = cell.layer > 0 ? 0x000000 : (cell.layer < 0 ? 0xffffff : 0x808080);
        this.graphics.fillStyle(layerColor, layerAlpha);
        this.graphics.fillRect(x, y, this.cellSize, this.cellSize);

        // Transition cells in blue
        if (cell.isTransition) {
          this.graphics.fillStyle(0x0000ff, 0.4);
          this.graphics.fillRect(x, y, this.cellSize, this.cellSize);
        }

        // Occupied cells in green
        if (cell.occupants.size > 0) {
          this.graphics.fillStyle(0x00ff00, 0.3);
          this.graphics.fillRect(x, y, this.cellSize, this.cellSize);
        }

        // Draw cell outline
        this.graphics.lineStyle(1, 0xffffff, 0.3);
        this.graphics.strokeRect(x + 0.5, y + 0.5, this.cellSize, this.cellSize); // 0.5 for crisp lines
      }
    }

    // Draw collision boxes on top
    this.collisionBoxes.forEach(box => {
      this.graphics.lineStyle(2, 0x0000ff, 1);
      this.graphics.strokeRect(box.x, box.y, box.width, box.height);
    });

    // Draw emitter boxes
    this.emitterBoxes.forEach(box => {
      this.graphics.fillStyle(0xff0000, 0.5);
      this.graphics.fillRect(box.x - box.size / 2, box.y - box.size / 2, box.size, box.size);
    });

    // Clear collision boxes for next frame
    this.collisionBoxes = [];
    this.emitterBoxes = [];
  }

  renderCollisionBox(x: number, y: number, width: number, height: number): void {
    if (!this.debug) return;
    this.collisionBoxes.push({ x, y, width, height });
  }

  renderEmitterBox(x: number, y: number, size: number): void {
    if (!this.debug) return;
    this.emitterBoxes.push({ x, y, size });
  }
}
