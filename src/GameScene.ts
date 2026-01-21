import Phaser from "phaser";
import { Grid } from "./utils/Grid";
import { LevelLoader } from "./level/LevelLoader";
import { EntityManager } from "./ecs/EntityManager";
import { createPlayerEntity } from "./player/PlayerEntity";
import { createBulletEntity } from "./projectile/BulletEntity";
import { createShellCasingEntity } from "./projectile/ShellCasingEntity";
import { createJoystickEntity } from "./hud/JoystickEntity";
import { SpriteComponent } from "./ecs/components/SpriteComponent";
import { TransformComponent } from "./ecs/components/TransformComponent";
import { GridPositionComponent } from "./ecs/components/GridPositionComponent";
import { ProjectileEmitterComponent } from "./ecs/components/ProjectileEmitterComponent";
import { preloadAssets } from "./assets/AssetLoader";

export default class GameScene extends Phaser.Scene {
  private entityManager!: EntityManager;
  private grid!: Grid;
  private readonly cellSize: number = 128;
  private editorKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super("game");
  }

  preload() {
    // Load all assets from registry
    preloadAssets(this);
  }

  async create() {
    // Initialize entity manager
    this.entityManager = new EntityManager();

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
    const joystick = this.entityManager.add(createJoystickEntity(this));

    // Create the player entity at level start position
    const startX = this.grid.cellSize * level.playerStart.x;
    const startY = this.grid.cellSize * level.playerStart.y;
    const player = this.entityManager.add(createPlayerEntity(
      this,
      startX,
      startY,
      this.grid,
      (x, y, dirX, dirY) => {
        const gridPos = player.get(GridPositionComponent)!;
        const playerCell = this.grid.getCell(gridPos.currentCell.col, gridPos.currentCell.row);
        const fromTransition = playerCell?.isTransition ?? false;

        const bullet = createBulletEntity(this, x, y, dirX, dirY, this.grid, gridPos.currentLayer, fromTransition);
        this.entityManager.add(bullet);
      },
      (x, y, direction, playerDirection) => {
        const shell = createShellCasingEntity(this, x, y, direction, playerDirection);
        this.entityManager.add(shell);
      },
      joystick
    ));

    // Camera setup - follow the player's sprite
    const spriteComp = player.get(SpriteComponent)!;
    this.cameras.main.setBounds(
      0,
      0,
      level.width * this.grid.cellSize,
      level.height * this.grid.cellSize
    );
    // Snap camera to player immediately
    this.cameras.main.centerOn(spriteComp.sprite.x, spriteComp.sprite.y);
    this.cameras.main.startFollow(spriteComp.sprite, true, 0.1, 0.1);

    // Editor mode toggle
    this.editorKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.editorKey.on('down', () => {
      if (this.scene.isActive()) {
        this.enterEditorMode();
      }
    });
  }

  private async enterEditorMode(): Promise<void> {
    // Pause this scene (stops updates but keeps rendering)
    this.scene.pause();

    // Launch editor scene on top (don't reload - keep current state)
    this.scene.launch('EditorScene');
  }

  update(_time: number, delta: number) {
    // Wait for async create to finish
    if (!this.entityManager || !this.grid) return;

    // Update all entities (automatically filters destroyed ones)
    this.entityManager.update(delta);

    // Debug: Draw emitter position for player
    if (this.grid.sceneDebugEnabled) {
      const player = this.entityManager.getFirst('player');
      if (player) {
        const emitter = player.get(ProjectileEmitterComponent);
        if (emitter) {
          const pos = emitter.getEmitterPosition();
          this.grid.renderEmitterBox(pos.x, pos.y, 20);
        }
      }
    }

    // Re-render the grid (debug only)
    this.grid.render();
  }

  getGrid(): Grid {
    return this.grid;
  }

  getPlayer(): Phaser.GameObjects.Sprite | null {
    const player = this.entityManager.getFirst('player');
    if (player) {
      const sprite = player.get(SpriteComponent);
      return sprite ? sprite.sprite : null;
    }
    return null;
  }

  getPlayerStart(): { x: number; y: number } {
    const player = this.entityManager.getFirst('player');
    if (player) {
      const transform = player.get(TransformComponent)!;
      return {
        x: Math.round(transform.x / this.grid.cellSize),
        y: Math.round(transform.y / this.grid.cellSize)
      };
    }
    return { x: 10, y: 10 }; // Default fallback
  }

  movePlayer(x: number, y: number): void {
    const player = this.entityManager.getFirst('player');
    if (player) {
      const transform = player.get(TransformComponent)!;
      const sprite = player.get(SpriteComponent)!;
      transform.x = x;
      transform.y = y;
      sprite.sprite.setPosition(x, y);
    }
  }
}
