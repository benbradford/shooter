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

    // Example: mark a wall at (5, 5)
    this.grid.setCell(5, 5, { walkable: false });
    this.grid.render();

    // Create the player entity, starting at the center of the visible area
    const startX = this.cellSize * 10; // column 10
    const startY = this.cellSize * 10; // row 10
    this.player = createPlayerEntity(this, startX, startY);

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

  update(time: number, delta: number) {
    // Update the player entity (all components)
    this.player.update(delta);

    // Re-render the grid (debug only)
    this.grid.render();
  }
}
