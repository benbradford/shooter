import Phaser from "phaser";
import type { Entity } from "../ecs/Entity";
import type GameScene from "../GameScene";
import type { EntityManager } from "../ecs/EntityManager";
import { ProjectileEmitterComponent } from "../ecs/components/combat/ProjectileEmitterComponent";

export type CellData = {
  layer: number;
  isTransition: boolean;
  occupants: Set<Entity>;
  backgroundTexture?: string;
};

export class Grid {
  public width: number; // columns
  public height: number; // rows
  public readonly cellSize: number;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly scene: Phaser.Scene;
  private readonly backgroundSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  private readonly layer1Sprites: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private readonly layerNeg1Sprites: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private isGridDebugEnabled: boolean = false;
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
    
    const cell = this.cells[row][col];
    const oldTexture = cell.backgroundTexture;
    const oldLayer = cell.layer;
    
    this.cells[row][col] = { ...cell, ...data };
    
    // Handle layer rendering
    if (data.layer !== undefined) {
      const key = `${col},${row}`;
      
      if (oldLayer !== data.layer) {
        const oldLayer1Sprite = this.layer1Sprites.get(key);
        if (oldLayer1Sprite) {
          oldLayer1Sprite.destroy();
          this.layer1Sprites.delete(key);
        }
        
        const oldLayerNeg1Sprite = this.layerNeg1Sprites.get(key);
        if (oldLayerNeg1Sprite) {
          oldLayerNeg1Sprite.destroy();
          this.layerNeg1Sprites.delete(key);
        }
      }
      
      if (data.layer === 1) {
        const worldPos = this.cellToWorld(col, row);
        const rect = this.scene.add.rectangle(
          worldPos.x + this.cellSize / 2,
          worldPos.y + this.cellSize / 2,
          this.cellSize,
          this.cellSize,
          0x1a1a2e,
          0.9
        );
        rect.setDepth(-50);
        this.layer1Sprites.set(key, rect as unknown as Phaser.GameObjects.Rectangle);
      } else if (data.layer === -1) {
        const worldPos = this.cellToWorld(col, row);
        const rect = this.scene.add.rectangle(
          worldPos.x + this.cellSize / 2,
          worldPos.y + this.cellSize / 2,
          this.cellSize,
          this.cellSize,
          0xaaaaaa,
          0.25
        );
        rect.setDepth(-50);
        this.layerNeg1Sprites.set(key, rect as unknown as Phaser.GameObjects.Rectangle);
      }
    }
    
    // Handle background texture changes
    if (data.backgroundTexture !== undefined) {
      const key = `${col},${row}`;
      
      // Remove old sprite if texture changed
      if (oldTexture !== data.backgroundTexture) {
        const oldSprite = this.backgroundSprites.get(key);
        if (oldSprite) {
          oldSprite.destroy();
          this.backgroundSprites.delete(key);
        }
      }
      
      // Add new sprite if texture is set
      if (data.backgroundTexture) {
        const worldPos = this.cellToWorld(col, row);
        const sprite = this.scene.add.image(
          worldPos.x + this.cellSize / 2,
          worldPos.y + this.cellSize / 2,
          data.backgroundTexture
        );
        sprite.setDisplaySize(this.cellSize, this.cellSize);
        sprite.setDepth(-100);
        this.backgroundSprites.set(key, sprite);
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
  render(entityManager?: EntityManager) {
    this.graphics.clear();

    // Always draw layer 1 edges
    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        const cell = this.cells[row][col];
        if (cell.layer === 1) {
          const x = col * this.cellSize;
          const y = row * this.cellSize;
          const edgeThickness = 8;
          this.graphics.lineStyle(edgeThickness, 0x808080, 1);

          // Right edge
          if (col < this.width - 1 && this.cells[row][col + 1].layer === 0) {
            this.graphics.strokeLineShape(new Phaser.Geom.Line(
              x + this.cellSize, y,
              x + this.cellSize, y + this.cellSize
            ));
          }

          // Left edge
          if (col > 0 && this.cells[row][col - 1].layer === 0) {
            this.graphics.strokeLineShape(new Phaser.Geom.Line(
              x, y,
              x, y + this.cellSize
            ));
          }

          // Top edge
          if (row > 0 && this.cells[row - 1][col].layer === 0) {
            this.graphics.strokeLineShape(new Phaser.Geom.Line(
              x, y,
              x + this.cellSize, y
            ));
          }

          // Bottom edge - vertical lines if layer 0 below
          if (row < this.height - 1 && this.cells[row + 1][col].layer === 0) {
            const lineSpacing = 12;
            const lineThickness = 4;
            const topBarY = y + (this.cellSize * 0.2);
            
            this.graphics.lineStyle(lineThickness, 0x808080, 1);
            
            // Draw vertical lines
            for (let lineX = x; lineX <= x + this.cellSize; lineX += lineSpacing) {
              this.graphics.strokeLineShape(new Phaser.Geom.Line(
                lineX, y,
                lineX, y + this.cellSize
              ));
            }
            
            // Draw horizontal line at top of vertical lines (20% down)
            this.graphics.lineStyle(edgeThickness, 0x808080, 1);
            this.graphics.strokeLineShape(new Phaser.Geom.Line(
              x, topBarY,
              x + this.cellSize, topBarY
            ));
          }
        }
      }
    }

    if (!this.isGridDebugEnabled) {
      if (this.isSceneDebugEnabled) {
        this.renderSceneDebug(entityManager);
      }
      return;
    }

    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        const x = col * this.cellSize;
        const y = row * this.cellSize;
        const cell = this.cells[row][col];

        let layerAlpha: number;
        let layerColor: number;
        
        if (cell.layer < 0) {
          layerAlpha = 0.25;
          layerColor = 0xffffff;
        } else if (cell.layer > 0) {
          layerAlpha = 0.4;
          layerColor = 0x000000;
        } else {
          layerAlpha = 0.1;
          layerColor = 0x808080;
        }
        
        this.graphics.fillStyle(layerColor, layerAlpha);
        this.graphics.fillRect(x, y, this.cellSize, this.cellSize);

        if (cell.isTransition) {
          this.graphics.fillStyle(0x0000ff, 0.5);
          this.graphics.fillRect(x, y, this.cellSize, this.cellSize);
        }

        this.graphics.lineStyle(1, 0xffffff, 0.3);
        this.graphics.strokeRect(x + 0.5, y + 0.5, this.cellSize, this.cellSize);
      }
    }

    if (this.isSceneDebugEnabled) {
      this.renderSceneDebug(entityManager);
    }
  }

  renderCellCoordinates(): void {
    // Only render in editor - add small text labels showing col,row
    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        const x = col * this.cellSize + 2;
        const y = row * this.cellSize + 10;
        
        this.graphics.fillStyle(0xffffff, 0.5);
        this.graphics.fillRect(x, y - 8, 30, 10);
        
        // Draw text using graphics (simple, no Text objects needed)
        const text = this.scene.add.text(x + 1, y - 7, `${col},${row}`, {
          fontSize: '8px',
          color: '#000000'
        });
        text.setDepth(10001);
        
        // Destroy after one frame (we redraw each frame)
        this.scene.time.delayedCall(0, () => text.destroy());
      }
    }
  }

  private renderSceneDebug(entityManager?: EntityManager): void {
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

    // Draw player emitter position if entityManager provided
    if (entityManager) {
      const player = entityManager.getFirst('player');
      if (player) {
        const emitter = player.get(ProjectileEmitterComponent);
        if (emitter) {
          const pos = emitter.getEmitterPosition();
          this.graphics.fillStyle(0xff0000, 0.5);
          this.graphics.fillRect(pos.x - 10, pos.y - 10, 20, 20);
        }
      }
    }

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

  addRow(): void {
    const newRow: CellData[] = [];
    for (let col = 0; col < this.width; col++) {
      newRow.push({
        layer: 0,
        isTransition: false,
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
        isTransition: false,
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

  destroy(): void {
    // Clear all occupants
    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        this.cells[row][col].occupants.clear();
      }
    }
    
    // Destroy background sprites
    this.backgroundSprites.forEach(sprite => sprite.destroy());
    this.backgroundSprites.clear();
    
    // Destroy graphics object
    this.graphics.destroy();
  }
}
