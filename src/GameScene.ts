import Phaser from "phaser";
import { Grid } from "./utils/Grid";
import { LevelLoader, type LevelData } from "./level/LevelLoader";
import { EntityManager } from "./ecs/EntityManager";
import { createPlayerEntity } from "./player/PlayerEntity";
import { createBulletEntity } from "./projectile/BulletEntity";
import { createShellCasingEntity } from "./projectile/ShellCasingEntity";
import { createJoystickEntity } from "./hud/JoystickEntity";
import { createStalkingRobotEntity } from "./robot/StalkingRobotEntity";
import { SpriteComponent } from "./ecs/components/SpriteComponent";
import { GridPositionComponent } from "./ecs/components/GridPositionComponent";
import { preloadAssets } from "./assets/AssetLoader";
import { CollisionSystem } from "./systems/CollisionSystem";

export default class GameScene extends Phaser.Scene {
  private entityManager!: EntityManager;
  public collisionSystem!: CollisionSystem;
  private grid!: Grid;
  private readonly cellSize: number = 128;
  private editorKey!: Phaser.Input.Keyboard.Key;
  private levelKey!: Phaser.Input.Keyboard.Key;
  private levelData!: LevelData;
  private currentLevelName: string = 'level1';

  constructor() {
    super("game");
  }

  preload() {
    // Load all assets from registry
    preloadAssets(this);
  }

  async create() {
    this.entityManager = new EntityManager();

    this.levelData = await LevelLoader.load(this.currentLevelName);

    this.initializeScene();

    this.collisionSystem = new CollisionSystem(this, this.grid);

    this.editorKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.editorKey.on('down', () => {
      if (this.scene.isActive()) {
        void this.enterEditorMode();
      }
    });

    this.levelKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.L);
    this.levelKey.on('down', () => {
      if (this.scene.isActive()) {
        this.showLevelSelector();
      }
    });
  }

  private initializeScene(): void {
    const level = this.levelData;

    this.grid = new Grid(this, level.width, level.height, this.cellSize);

    for (const cell of level.cells) {
      this.grid.setCell(cell.col, cell.row, {
        layer: cell.layer,
        isTransition: cell.isTransition,
        backgroundTexture: cell.backgroundTexture
      });
    }

    this.grid.render();

    this.cameras.main.setBounds(
      0,
      0,
      level.width * this.grid.cellSize,
      level.height * this.grid.cellSize
    );

    this.spawnEntities();

    // Camera follow player's sprite
    const player = this.entityManager.getFirst('player');
    if (player) {
      const spriteComp = player.get(SpriteComponent)!;
      this.cameras.main.centerOn(spriteComp.sprite.x, spriteComp.sprite.y);
      this.cameras.main.startFollow(spriteComp.sprite, true, 0.1, 0.1);
    }
  }

  private async enterEditorMode(): Promise<void> {
    this.resetScene();

    this.scene.pause();

    this.scene.launch('EditorScene');
  }

  private resetScene(): void {
    this.grid.destroy();

    this.entityManager.destroyAll();

    this.initializeScene();
  }

  private spawnEntities(): void {
    const level = this.levelData;

    const joystick = this.entityManager.add(createJoystickEntity(this));

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

        const bullet = createBulletEntity({
          scene: this,
          x,
          y,
          dirX,
          dirY,
          grid: this.grid,
          layer: gridPos.currentLayer,
          fromTransition
        });
        this.entityManager.add(bullet);
      },
      (x, y, direction, playerDirection) => {
        const shell = createShellCasingEntity(this, x, y, direction, playerDirection);
        this.entityManager.add(shell);
      },
      joystick
    ));



    // Spawn robots from level data
    if (level.robots && level.robots.length > 0) {
      for (const robotData of level.robots) {
        const x = robotData.col * this.grid.cellSize + this.grid.cellSize / 2;
        const y = robotData.row * this.grid.cellSize + this.grid.cellSize / 2;

        const robot = createStalkingRobotEntity({
          scene: this,
          x,
          y,
          grid: this.grid,
          playerEntity: player,
          waypoints: robotData.waypoints,
          health: robotData.health,
          speed: robotData.speed,
          fireballSpeed: robotData.fireballSpeed,
          fireballDuration: robotData.fireballDuration
        });
        this.entityManager.add(robot);
      }
    }
  }

  update(_time: number, delta: number): void {
    // Wait for async create to finish
    if (!this.entityManager || !this.grid) return;

    // Update all entities (automatically filters destroyed ones)
    this.entityManager.update(delta);

    // Check collisions
    this.collisionSystem.update(this.entityManager.getAll());

    // Re-render the grid (debug only)
    this.grid.render(this.entityManager);
  }

  getGrid(): Grid {
    return this.grid;
  }

  getEntityManager(): EntityManager {
    return this.entityManager;
  }

  getLevelData(): LevelData {
    return this.levelData;
  }

  private showLevelSelector(): void {
    this.scene.pause();
    this.scene.launch('LevelSelectorScene');
  }

  async loadLevel(levelName: string): Promise<void> {
    this.currentLevelName = levelName;
    this.levelData = await LevelLoader.load(levelName);
    this.resetScene();
  }

  getCurrentLevelName(): string {
    return this.currentLevelName;
  }
}
