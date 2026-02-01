import Phaser from "phaser";
import { Grid } from "../systems/grid/Grid";
import { LevelLoader, type LevelData } from "../systems/level/LevelLoader";
import { EntityManager } from "../ecs/EntityManager";
import type HudScene from "./HudScene";
import { createPlayerEntity } from "../ecs/entities/player/PlayerEntity";
import { createBulletEntity } from "../ecs/entities/projectile/BulletEntity";
import { createShellCasingEntity } from "../ecs/entities/projectile/ShellCasingEntity";
import { createStalkingRobotEntity } from "../ecs/entities/robot/StalkingRobotEntity";
import { createBugBaseEntity } from "../ecs/entities/bug/BugBaseEntity";
import { createBugEntity } from "../ecs/entities/bug/BugEntity";
import { createThrowerEntity } from "../ecs/entities/thrower/ThrowerEntity";
import { createGrenadeEntity } from "../ecs/entities/projectile/GrenadeEntity";
import { createThrowerAnimations } from "../ecs/entities/thrower/ThrowerAnimations";
import { BugSpawnerComponent } from "../ecs/components/ai/BugSpawnerComponent";
import { DifficultyComponent } from "../ecs/components/ai/DifficultyComponent";
import { getBugBaseDifficultyConfig } from "../ecs/entities/bug/BugBaseDifficulty";
import type { EnemyDifficulty } from "../constants/EnemyDifficulty";
import { CELL_SIZE, CAMERA_ZOOM } from "../constants/GameConstants";
import { SpriteComponent } from "../ecs/components/core/SpriteComponent";
import { GridPositionComponent } from "../ecs/components/movement/GridPositionComponent";
import { TransformComponent } from "../ecs/components/core/TransformComponent";
import { preloadAssets } from "../assets/AssetLoader";
import { CollisionSystem } from "../systems/CollisionSystem";
import { DungeonSceneRenderer } from "./theme/DungeonSceneRenderer";
import { SwampSceneRenderer } from "./theme/SwampSceneRenderer";
import type { GameSceneRenderer } from "./theme/GameSceneRenderer";

export default class GameScene extends Phaser.Scene {
  private entityManager!: EntityManager;
  public collisionSystem!: CollisionSystem;
  private grid!: Grid;
  private readonly cellSize: number = CELL_SIZE;
  private levelKey!: Phaser.Input.Keyboard.Key;
  private levelData!: LevelData;
  private currentLevelName: string = 'level1';
  private vignette?: Phaser.GameObjects.Image;
  private background?: Phaser.GameObjects.Image;
  private sceneRenderer!: GameSceneRenderer;

  constructor() {
    super({ key: "game", active: true });
  }

  preload() {
    // Load all assets from registry
    preloadAssets(this);
  }

  async create() {
    // Wait for HudScene to be ready
    if (!this.scene.isActive('HudScene')) {
      this.scene.launch('HudScene');
      await new Promise<void>(resolve => {
        this.scene.get('HudScene').events.once('create', () => resolve());
      });
    }

    this.entityManager = new EntityManager();

    createThrowerAnimations(this);

    const params = new URLSearchParams(window.location.search);
    const levelParam = params.get('level');
    if (levelParam) {
      this.currentLevelName = levelParam;
    }

    this.levelData = await LevelLoader.load(this.currentLevelName);

    const theme = this.levelData.levelTheme ?? 'dungeon';
    if (theme === 'dungeon') {
      this.sceneRenderer = new DungeonSceneRenderer(this, this.cellSize);
    } else if (theme === 'swamp') {
      this.sceneRenderer = new SwampSceneRenderer(this, this.cellSize);
    } else {
      this.sceneRenderer = new DungeonSceneRenderer(this, this.cellSize);
    }
    const rendered = this.sceneRenderer.renderTheme(this.levelData.width, this.levelData.height);
    this.background = rendered.background;
    this.vignette = rendered.vignette;

    this.initializeScene();

    this.collisionSystem = new CollisionSystem(this, this.grid);

    const keyboard = this.input.keyboard;
    if (keyboard) {
      this.levelKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L);
      this.levelKey.on('down', () => {
        if (this.scene.isActive()) {
          this.showLevelSelector();
        }
      });
      
      const editorKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
      editorKey.on('down', () => {
        if (this.scene.isActive()) {
          this.scene.pause();
          this.scene.launch('EditorScene');
        }
      });
    }
  }

  renderGrid(grid: Grid): void {
    this.sceneRenderer.renderGrid(grid);
  }

  private initializeScene(): void {
    const level = this.levelData;

    this.grid = new Grid(this, level.width, level.height, this.cellSize);

    for (const cell of level.cells) {
      this.grid.setCell(cell.col, cell.row, {
        properties: new Set(cell.properties ?? []),
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

    // Set camera zoom - HUD scene is separate so this won't affect touch
    this.cameras.main.setZoom(CAMERA_ZOOM);

    this.spawnEntities();

    // Camera follow player's sprite
    const player = this.entityManager.getFirst('player');
    if (player) {
      const spriteComp = player.get(SpriteComponent);
      if (spriteComp) {
        this.cameras.main.centerOn(spriteComp.sprite.x, spriteComp.sprite.y);
        this.cameras.main.startFollow(spriteComp.sprite, true, 0.1, 0.1);
      }
    }
  }

  private resetScene(): void {
    this.grid.destroy();

    this.entityManager.destroyAll();

    this.initializeScene();
  }

  private spawnEntities(): void {
    const level = this.levelData;

    const hudScene = this.scene.get('HudScene') as HudScene;
    const joystick = hudScene.getJoystickEntity();

    const startX = this.grid.cellSize * level.playerStart.x + this.grid.cellSize / 2;
    const startY = this.grid.cellSize * level.playerStart.y + this.grid.cellSize / 2;
    const player = this.entityManager.add(createPlayerEntity({
      scene: this,
      x: startX,
      y: startY,
      grid: this.grid,
      onFire: (x, y, dirX, dirY) => {
        const gridPos = player.get(GridPositionComponent);
        if (!gridPos) return;
        const playerCell = this.grid.getCell(gridPos.currentCell.col, gridPos.currentCell.row);
        const fromTransition = playerCell ? this.grid.isTransition(playerCell) : false;

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
      onShellEject: (x, y, direction, playerDirection) => {
        const shell = createShellCasingEntity(this, x, y, direction, playerDirection);
        this.entityManager.add(shell);
      },
      joystick,
      getEnemies: () => this.entityManager.getByType('stalking_robot').concat(this.entityManager.getByType('bug')).concat(this.entityManager.getByType('thrower')),
      vignetteSprite: this.vignette
    }));



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
          difficulty: robotData.difficulty as EnemyDifficulty
        });
        this.entityManager.add(robot);
      }
    }

    // Spawn bug bases from level data
    if (level.bugBases && level.bugBases.length > 0) {
      for (const baseData of level.bugBases) {
        const base = createBugBaseEntity(
          this,
          baseData.col,
          baseData.row,
          this.grid,
          player,
          (spawnCol, spawnRow) => {
            const transform = base.require(TransformComponent);
            const difficultyComp = base.require(DifficultyComponent);

            const basePos = this.grid.worldToCell(transform.x, transform.y);
            const config = getBugBaseDifficultyConfig(difficultyComp.difficulty);

            const bug = createBugEntity({
              scene: this,
              col: basePos.col,
              row: basePos.row,
              grid: this.grid,
              playerEntity: player,
              spawnCol,
              spawnRow,
              health: config.bugHealth,
              speed: config.bugSpeed
            });
            this.entityManager.add(bug);

            const spawner = base.get(BugSpawnerComponent);
            if (spawner) {
              spawner.registerBug(bug);
            }
          },
          baseData.difficulty
        );
        this.entityManager.add(base);
      }
    }

    // Spawn throwers from level data
    if (level.throwers && level.throwers.length > 0) {
      for (const throwerData of level.throwers) {
        const thrower = createThrowerEntity({
          scene: this,
          col: throwerData.col,
          row: throwerData.row,
          grid: this.grid,
          playerEntity: player,
          difficulty: throwerData.difficulty as EnemyDifficulty,
          onThrow: (x, y, dirX, dirY, throwDistancePx) => {
            const grenade = createGrenadeEntity({
              scene: this,
              x,
              y,
              dirX,
              dirY,
              maxDistancePx: throwDistancePx
            });
            this.entityManager.add(grenade);
          }
        });
        this.entityManager.add(thrower);
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

  setTheme(theme: 'dungeon' | 'swamp'): void {
    this.levelData.levelTheme = theme;
    
    if (this.background) this.background.destroy();
    if (this.vignette) this.vignette.destroy();
    if (this.sceneRenderer) {
      this.sceneRenderer.destroy();
    }
    
    if (theme === 'dungeon') {
      this.sceneRenderer = new DungeonSceneRenderer(this, this.cellSize);
    } else if (theme === 'swamp') {
      this.sceneRenderer = new SwampSceneRenderer(this, this.cellSize);
    }
    
    const rendered = this.sceneRenderer.renderTheme(this.levelData.width, this.levelData.height);
    this.background = rendered.background;
    this.vignette = rendered.vignette;
    
    this.grid.render();
  }

  private showLevelSelector(): void {
    this.scene.pause();
    this.scene.launch('LevelSelectorScene');
  }

  async loadLevel(levelName: string): Promise<void> {
    this.currentLevelName = levelName;
    this.levelData = await LevelLoader.load(levelName);
    
    const theme = this.levelData.levelTheme ?? 'dungeon';
    if (theme === 'dungeon') {
      this.sceneRenderer = new DungeonSceneRenderer(this, this.cellSize);
    } else if (theme === 'swamp') {
      this.sceneRenderer = new SwampSceneRenderer(this, this.cellSize);
    } else {
      this.sceneRenderer = new DungeonSceneRenderer(this, this.cellSize);
    }
    
    if (this.background) {
      this.background.destroy();
    }
    if (this.vignette) {
      this.vignette.destroy();
    }
    
    const rendered = this.sceneRenderer.renderTheme(this.levelData.width, this.levelData.height);
    this.background = rendered.background;
    this.vignette = rendered.vignette;
    
    this.resetScene();
  }

  getCurrentLevelName(): string {
    return this.currentLevelName;
  }
}
