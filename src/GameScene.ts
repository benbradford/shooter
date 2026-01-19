import Phaser from "phaser";
import { Grid } from "./utils/Grid";
import { LevelLoader } from "./level/LevelLoader";
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

  async create() {
    // Load level data
    const level = await LevelLoader.load('default');

    // Initialize grid
    this.grid = new Grid(this, level.width, level.height, this.cellSize);

    // Apply level cells
    for (const cell of level.cells) {
      this.grid.setCell(cell.col, cell.row, {
        layer: cell.layer,
        isTransition: cell.isTransition
      });
    }

    this.grid.render();

    // Create joystick entity
    this.joystick = createJoystickEntity(this);

    // Create the player entity at level start position
    const startX = this.cellSize * level.playerStart.x;
    const startY = this.cellSize * level.playerStart.y;
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
      level.width * this.cellSize,
      level.height * this.cellSize
    );
    this.cameras.main.startFollow(spriteComp.sprite, true, 0.1, 0.1);

    // Optional: toggle debug grid with G is already handled in Grid constructor
  }

  update(_time: number, delta: number) {
    // Wait for async create to finish
    if (!this.player || !this.joystick) return;

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
