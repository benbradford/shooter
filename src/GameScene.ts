import Phaser from "phaser";
import { preloadPlayerAssets } from "./utils/preloadPlayerAssets";
import { Grid } from "./utils/Grid";
import { createPlayerEntity } from "./player/PlayerEntity";
import { SpriteComponent } from "./ecs/components/SpriteComponent";
import type { Entity } from "./ecs/Entity";

export default class GameScene extends Phaser.Scene {
  private player!: Entity;
  private grid!: Grid;
  private cellSize: number = 128; // fixed size

  constructor() {
    super("game");
  }

  preload() {
    preloadPlayerAssets(this);
  }

  create() {
    const gridWidth = 40; // columns
    const gridHeight = 30; // rows

    // Initialize grid
    this.grid = new Grid(this, gridWidth, gridHeight, this.cellSize);

    // Add some walls
    this.grid.setCell(5, 5, { walkable: false, blocksProjectiles: true });
    this.grid.setCell(6, 5, { walkable: false, blocksProjectiles: true });
    this.grid.setCell(7, 5, { walkable: false, blocksProjectiles: true });
    this.grid.setCell(8, 5, { walkable: false, blocksProjectiles: true });
    
    // Vertical wall
    this.grid.setCell(12, 8, { walkable: false, blocksProjectiles: true });
    this.grid.setCell(12, 9, { walkable: false, blocksProjectiles: true });
    this.grid.setCell(12, 10, { walkable: false, blocksProjectiles: true });
    this.grid.setCell(12, 11, { walkable: false, blocksProjectiles: true });
    
    // Box of walls
    for (let col = 15; col <= 18; col++) {
      this.grid.setCell(col, 12, { walkable: false, blocksProjectiles: true });
      this.grid.setCell(col, 15, { walkable: false, blocksProjectiles: true });
    }
    for (let row = 13; row <= 14; row++) {
      this.grid.setCell(15, row, { walkable: false, blocksProjectiles: true });
      this.grid.setCell(18, row, { walkable: false, blocksProjectiles: true });
    }
    
    this.grid.render();

    // Create the player entity, starting at the center of the visible area
    const startX = this.cellSize * 10; // column 10
    const startY = this.cellSize * 10; // row 10
    this.player = createPlayerEntity(this, startX, startY, this.grid);

    // Camera setup - follow the player's sprite
    const spriteComp = this.player.get(SpriteComponent)!;
    this.cameras.main.setBounds(
      0,
      0,
      gridWidth * this.cellSize,
      gridHeight * this.cellSize
    );
    this.cameras.main.startFollow(spriteComp.sprite, true, 0.1, 0.1);

    // Optional: toggle debug grid with G is already handled in Grid constructor
  }

  update(_time: number, delta: number) {
    // Update the player entity (all components)
    this.player.update(delta);

    // Re-render the grid (debug only)
    this.grid.render();
  }
}
