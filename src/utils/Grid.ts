import Phaser from "phaser";

export type CellData = {
  walkable?: boolean;
  object?: any; // placeholder for walls, enemies, etc.
};

export class Grid {
  public width: number; // columns
  public height: number; // rows
  public cellSize: number;
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private debug: boolean = false;

  public cells: CellData[][];

  constructor(scene: Phaser.Scene, width: number, height: number, cellSize: number = 64) {
    this.scene = scene;
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;

    // Initialize cells
    this.cells = [];
    for (let row = 0; row < height; row++) {
      this.cells[row] = [];
      for (let col = 0; col < width; col++) {
        this.cells[row][col] = { walkable: true };
      }
    }

    // Graphics for debug rendering
    this.graphics = scene.add.graphics({ lineStyle: { width: 1, color: 0xffffff, alpha: 0.3 } });

    // Toggle debug grid with G
    const keyG = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.G);
    keyG.on("down", () => {
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

        if (!cell.walkable) {
          this.graphics.fillStyle(0xff0000, 0.3);
          this.graphics.fillRect(x, y, this.cellSize, this.cellSize);
        }

        // Draw cell outline
        this.graphics.lineStyle(1, 0xffffff, 0.3);
        this.graphics.strokeRect(x + 0.5, y + 0.5, this.cellSize, this.cellSize); // 0.5 for crisp lines
      }
    }
  }
}
