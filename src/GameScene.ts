import Phaser from "phaser";
import { Grid } from "./utils/Grid";
import { createPlayerEntity } from "./player/PlayerEntity";
import { createBulletEntity } from "./projectile/BulletEntity";
import { createShellCasingEntity } from "./projectile/ShellCasingEntity";
import { createJoystickEntity } from "./hud/JoystickEntity";
import { SpriteComponent } from "./ecs/components/SpriteComponent";
import { GridPositionComponent } from "./ecs/components/GridPositionComponent";
import { ProjectileEmitterComponent } from "./ecs/components/ProjectileEmitterComponent";
import { preloadAssets } from "./assets/AssetLoader";
import type { Entity } from "./ecs/Entity";

export default class GameScene extends Phaser.Scene {
  private player!: Entity;
  private joystick!: Entity;
  private grid!: Grid;
  private readonly cellSize: number = 128; // fixed size
  private bullets: Entity[] = [];
  private shells: Entity[] = [];

  constructor() {
    super("game");
  }

  preload() {
    // Load all assets from registry
    preloadAssets(this);
  }

  create() {
    const gridWidth = 40; // columns
    const gridHeight = 30; // rows

    // Initialize grid
    this.grid = new Grid(this, gridWidth, gridHeight, this.cellSize);

    // Layer -1 (pit area)
    for (let col = 5; col <= 8; col++) {
      for (let row = 6; row <= 8; row++) {
        this.grid.setCell(col, row, { layer: -1 });
      }
    }

    // Transition to access layer -1 pit (above the pit)
    this.grid.setCell(7, 5, { layer: 0, isTransition: true });

    // Layer 1 (elevated platform)
    for (let col = 15; col <= 20; col++) {
      for (let row = 8; row <= 12; row++) {
        this.grid.setCell(col, row, { layer: 1 });
      }
    }

    // Transition cell to access layer 1 platform (from below)
    this.grid.setCell(17, 13, { layer: 0, isTransition: true });

    // Another layer 1 area
    for (let col = 25; col <= 28; col++) {
      for (let row = 15; row <= 18; row++) {
        this.grid.setCell(col, row, { layer: 1 });
      }
    }

    // Transition cell for second platform
    this.grid.setCell(26, 19, { layer: 0, isTransition: true });

    this.grid.render();

    // Create joystick entity
    this.joystick = createJoystickEntity(this);

    // Create the player entity, starting at the center of the visible area
    const startX = this.cellSize * 10;
    const startY = this.cellSize * 10;
    this.player = createPlayerEntity(
      this,
      startX,
      startY,
      this.grid,
      (x, y, dirX, dirY) => {
        const gridPos = this.player.get(GridPositionComponent)!;
        const playerCell = this.grid.getCell(gridPos.currentCell.col, gridPos.currentCell.row);
        const fromTransition = playerCell?.isTransition ?? false;

        const bullet = createBulletEntity(this, x, y, dirX, dirY, this.grid, gridPos.currentLayer, fromTransition);
        this.bullets.push(bullet);
      },
      (x, y, direction, playerDirection) => {
        const shell = createShellCasingEntity(this, x, y, direction, playerDirection);
        this.shells.push(shell);
      },
      this.joystick
    );

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
    // Update joystick
    this.joystick.update(delta);

    // Update the player entity (all components)
    this.player.update(delta);

    // Update bullets and remove destroyed ones
    this.bullets = this.bullets.filter(bullet => {
      if (bullet.isDestroyed) {
        return false;
      }
      bullet.update(delta);
      return true;
    });

    // Update shells and remove destroyed ones
    this.shells = this.shells.filter(shell => {
      if (shell.isDestroyed) {
        return false;
      }
      shell.update(delta);
      return true;
    });

    // Re-render the grid (debug only)
    this.grid.render();

    // Debug: Draw emitter position
    const emitter = this.player.get(ProjectileEmitterComponent)!;
    const pos = emitter.getEmitterPosition();
    this.grid.renderEmitterBox(pos.x, pos.y, 20);
  }
}
