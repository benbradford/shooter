import Phaser from "phaser";
import { Player } from "./player/Player";
import { preloadPlayerAssets } from "./utils/preloadPlayerAssets";
import { Grid } from "./utils/Grid";

export default class GameScene extends Phaser.Scene {
  private player!: Player;
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

    // Create the player, starting at the center of the visible area
    const startX = this.cellSize * 10; // column 10
    const startY = this.cellSize * 10; // row 10
    this.player = new Player(this, startX, startY);

    // Camera setup
    this.cameras.main.setBounds(
      0,
      0,
      gridWidth * this.cellSize,
      gridHeight * this.cellSize
    );
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Optional: toggle debug grid with G is already handled in Grid constructor
  }

  update(time: number, delta: number) {
    // Update the player (movement + animations)
    this.player.update(time, delta);

    // Re-render the grid (debug only)
    this.grid.render();
  }
}
