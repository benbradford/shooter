import Phaser from "phaser";
import { Grid } from "../systems/grid/Grid";
import { LevelLoader, type LevelData } from "../systems/level/LevelLoader";
import { EntityManager } from "../ecs/EntityManager";
import type HudScene from "./HudScene";
import { createPlayerEntity } from "../ecs/entities/player/PlayerEntity";
import { createStalkingRobotEntity } from "../ecs/entities/robot/StalkingRobotEntity";
import { createBugBaseEntity } from "../ecs/entities/bug/BugBaseEntity";
import { createBugEntity } from "../ecs/entities/bug/BugEntity";
import { createThrowerEntity } from "../ecs/entities/thrower/ThrowerEntity";
import { createSkeletonEntity } from "../ecs/entities/skeleton/SkeletonEntity";
import { createBulletDudeEntity } from "../ecs/entities/bulletdude/BulletDudeEntity";
import { createBoneProjectileEntity } from "../ecs/entities/skeleton/BoneProjectileEntity";
import { createGrenadeEntity } from "../ecs/entities/projectile/GrenadeEntity";
import { createThrowerAnimations } from "../ecs/entities/thrower/ThrowerAnimations";
import { createTriggerEntity } from "../trigger/TriggerEntity";
import { createEnemySpawnerEntity } from "../spawner/EnemySpawnerEntity";
import { EventManagerSystem } from "../ecs/systems/EventManagerSystem";
import { BugSpawnerComponent } from "../ecs/components/ai/BugSpawnerComponent";
import { DifficultyComponent } from "../ecs/components/ai/DifficultyComponent";
import { getBugBaseDifficultyConfig } from "../ecs/entities/bug/BugBaseDifficulty";
import type { EnemyDifficulty } from "../constants/EnemyDifficulty";
import { CELL_SIZE, CAMERA_ZOOM } from "../constants/GameConstants";
import { SpriteComponent } from "../ecs/components/core/SpriteComponent";
import { TransformComponent } from "../ecs/components/core/TransformComponent";
import { GridPositionComponent } from "../ecs/components/movement/GridPositionComponent";
import { preloadAssets, preloadLevelAssets } from "../assets/AssetLoader";
import { CollisionSystem } from "../systems/CollisionSystem";
import { DungeonSceneRenderer } from "./theme/DungeonSceneRenderer";
import { SwampSceneRenderer } from "./theme/SwampSceneRenderer";
import { GrassSceneRenderer } from "./theme/GrassSceneRenderer";
import { SceneOverlays } from "../systems/SceneOverlays";
import { toggleMustFaceEnemy } from "../ecs/components/combat/AttackComboComponent";
import type { GameSceneRenderer } from "./theme/GameSceneRenderer";

export default class GameScene extends Phaser.Scene {
  public entityManager!: EntityManager;
  public collisionSystem!: CollisionSystem;
  private eventManager!: EventManagerSystem;
  private grid!: Grid;
  private readonly cellSize: number = CELL_SIZE;
  private levelKey!: Phaser.Input.Keyboard.Key;
  private levelData!: LevelData;
  private currentLevelName: string = 'grass_overworld1';
  private vignette?: Phaser.GameObjects.Image;
  private background?: Phaser.GameObjects.Image;
  private sceneRenderer!: GameSceneRenderer;
  public layerDebugText?: Phaser.GameObjects.Text;
  private isEditorMode: boolean = false;
  private sceneOverlays?: SceneOverlays;

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
    this.eventManager = new EventManagerSystem();

    createThrowerAnimations(this);

    const params = new URLSearchParams(globalThis.location.search);
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
    } else if (theme === 'grass') {
      this.sceneRenderer = new GrassSceneRenderer(this, this.cellSize);
    } else {
      this.sceneRenderer = new DungeonSceneRenderer(this, this.cellSize);
    }
    const rendered = this.sceneRenderer.renderTheme(this.levelData.width, this.levelData.height);
    this.background = rendered.background;
    this.vignette = rendered.vignette;

    this.initializeScene();

    this.collisionSystem = new CollisionSystem(this, this.grid);

    this.layerDebugText = this.add.text(10, 10, '', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 }
    });
    this.layerDebugText.setScrollFactor(0);
    this.layerDebugText.setDepth(10000);
    this.layerDebugText.setVisible(false);

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
          this.isEditorMode = true;
          this.resetScene();
          this.scene.pause();
          this.scene.launch('EditorScene');
        }
      });

      const punchModeKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
      punchModeKey.on('down', () => {
        toggleMustFaceEnemy();
      });
    }
  }

  renderGrid(grid: Grid, levelData?: LevelData): void {
    this.sceneRenderer.renderGrid(grid, levelData);
  }

  private initializeScene(): void {
    const level = this.levelData;

    this.grid = new Grid(this, level.width, level.height, this.cellSize);

    for (const cell of level.cells) {
      this.grid.setCell(cell.col, cell.row, {
        layer: cell.layer ?? 0,
        properties: new Set(cell.properties ?? []),
        backgroundTexture: cell.backgroundTexture
      });
    }

    const overlays = new SceneOverlays(this, this.levelData);
    this.sceneOverlays = overlays;
    void overlays.init().then(() => {
      overlays.applyOverlays(this.grid);
      this.grid.render();
    });

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

  resetScene(): void {
    if (this.sceneOverlays) {
      this.sceneOverlays.destroy();
    }

    this.grid.destroy();
    this.entityManager.destroyAll();

    this.initializeScene();
  }

  // eslint-disable-next-line complexity
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
      joystick,
      getEnemies: () => this.entityManager.getByType('stalking_robot').concat(this.entityManager.getByType('bug')).concat(this.entityManager.getByType('thrower')),
      entityManager: this.entityManager,
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
        // In editor mode, spawn all throwers so they can be edited
        // In game mode, skip throwers with IDs (spawned by spawners)
        if (!this.isEditorMode && throwerData.id) {
          continue;
        }

        const thrower = createThrowerEntity({
          scene: this,
          col: throwerData.col,
          row: throwerData.row,
          grid: this.grid,
          playerEntity: player,
          difficulty: throwerData.difficulty as EnemyDifficulty,
          onThrow: (x, y, dirX, dirY, throwDistancePx, throwSpeedPxPerSec) => {
            const grenade = createGrenadeEntity({
              scene: this,
              x,
              y,
              dirX,
              dirY,
              maxDistancePx: throwDistancePx,
              speedPxPerSec: throwSpeedPxPerSec
            });
            this.entityManager.add(grenade);
          }
        });

        // Store ID on entity for editor
        if (throwerData.id) {
          thrower.entityId = throwerData.id;
        }

        this.entityManager.add(thrower);
      }
    }

    // Spawn skeletons from level data
    if (level.skeletons && level.skeletons.length > 0) {
      for (const skeletonData of level.skeletons) {
        if (!this.isEditorMode && skeletonData.id) {
          continue;
        }

        const skeleton = createSkeletonEntity({
          scene: this,
          col: skeletonData.col,
          row: skeletonData.row,
          grid: this.grid,
          playerEntity: player,
          difficulty: skeletonData.difficulty as EnemyDifficulty,
          onThrowBone: (x, y, dirX, dirY) => {
            const gridPos = skeleton.require(GridPositionComponent);
            const bone = createBoneProjectileEntity({
              scene: this,
              x,
              y,
              dirX,
              dirY,
              grid: this.grid,
              layer: gridPos.currentLayer
            });
            this.entityManager.add(bone);
          }
        });

        if (skeletonData.id) {
          (skeleton as { skeletonId?: string }).skeletonId = skeletonData.id;
        }

        this.entityManager.add(skeleton);
      }
    }

    // Spawn bulletDudes from level data
    if (level.bulletDudes && level.bulletDudes.length > 0) {
      for (const bulletDudeData of level.bulletDudes) {
        if (!this.isEditorMode && bulletDudeData.id) {
          continue;
        }

        const bulletDude = createBulletDudeEntity({
          scene: this,
          col: bulletDudeData.col,
          row: bulletDudeData.row,
          grid: this.grid,
          playerEntity: player,
          difficulty: bulletDudeData.difficulty as EnemyDifficulty,
          entityManager: this.entityManager,
          id: bulletDudeData.id
        });

        this.entityManager.add(bulletDude);
      }
    }

    // Spawn triggers from level data
    if (level.triggers && level.triggers.length > 0) {
      for (const triggerData of level.triggers) {
        const trigger = createTriggerEntity({
          eventName: triggerData.eventName,
          triggerCells: triggerData.triggerCells,
          grid: this.grid,
          eventManager: this.eventManager,
          oneShot: triggerData.oneShot ?? true
        });
        this.entityManager.add(trigger);
      }
    }

    // Spawn enemy spawners from level data
    if (level.spawners && level.spawners.length > 0) {
      for (const spawnerData of level.spawners) {
        const spawner = createEnemySpawnerEntity({
          eventManager: this.eventManager,
          eventName: spawnerData.eventName,
          enemyIds: spawnerData.enemyIds,
          spawnDelayMs: spawnerData.spawnDelayMs,
          onSpawnEnemy: (enemyId: string) => {
            const throwerData = level.throwers?.find(t => t.id === enemyId);
            if (throwerData) {
              const thrower = createThrowerEntity({
                scene: this,
                col: throwerData.col,
                row: throwerData.row,
                grid: this.grid,
                playerEntity: player,
                difficulty: throwerData.difficulty as EnemyDifficulty,
                onThrow: (x, y, dirX, dirY, throwDistancePx, throwSpeedPxPerSec) => {
                  const grenade = createGrenadeEntity({
                    scene: this,
                    x,
                    y,
                    dirX,
                    dirY,
                    maxDistancePx: throwDistancePx,
                    speedPxPerSec: throwSpeedPxPerSec
                  });
                  this.entityManager.add(grenade);
                }
              });
              this.entityManager.add(thrower);
              return;
            }

            const skeletonData = level.skeletons?.find(s => s.id === enemyId);
            if (skeletonData) {
              const skeleton = createSkeletonEntity({
                scene: this,
                col: skeletonData.col,
                row: skeletonData.row,
                grid: this.grid,
                playerEntity: player,
                difficulty: skeletonData.difficulty as EnemyDifficulty,
                onThrowBone: (x, y, dirX, dirY) => {
                  const gridPos = skeleton.require(GridPositionComponent);
                  const bone = createBoneProjectileEntity({
                    scene: this,
                    x,
                    y,
                    dirX,
                    dirY,
                    grid: this.grid,
                    layer: gridPos.currentLayer
                  });
                  this.entityManager.add(bone);
                }
              });
              this.entityManager.add(skeleton);
              return;
            }

            const bulletDudeData = level.bulletDudes?.find(b => b.id === enemyId);
            if (bulletDudeData) {
              const bulletDude = createBulletDudeEntity({
                scene: this,
                col: bulletDudeData.col,
                row: bulletDudeData.row,
                grid: this.grid,
                playerEntity: player,
                difficulty: bulletDudeData.difficulty as EnemyDifficulty,
                entityManager: this.entityManager,
                id: bulletDudeData.id
              });
              this.entityManager.add(bulletDude);
            }
          }
        });
        this.entityManager.add(spawner);
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

    this.grid.render(this.entityManager, this.levelData);

    // Update layer debug text
    const player = this.entityManager.getFirst('player');
    if (player && this.layerDebugText) {
      const gridPos = player.get(GridPositionComponent);
      if (gridPos) {
        this.layerDebugText.setText(`Layer: ${gridPos.currentLayer}`);
      }
    }
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

  setTheme(theme: 'dungeon' | 'swamp' | 'grass'): void {
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
    } else if (theme === 'grass') {
      this.sceneRenderer = new GrassSceneRenderer(this, this.cellSize);
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

    // Load assets for this level
    preloadLevelAssets(this, this.levelData);
    await new Promise<void>(resolve => {
      if (this.load.isLoading()) {
        this.load.once('complete', () => resolve());
      } else {
        resolve();
      }
      this.load.start();
    });

    // Clear all pending timer events
    this.time.removeAllEvents();

    if (this.sceneRenderer) {
      this.sceneRenderer.destroy();
    }

    // Destroy all game objects except HUD elements
    this.children.list
      .filter(obj => obj !== this.layerDebugText)
      .forEach(obj => obj.destroy());

    const theme = this.levelData.levelTheme ?? 'dungeon';
    if (theme === 'dungeon') {
      this.sceneRenderer = new DungeonSceneRenderer(this, this.cellSize);
    } else if (theme === 'swamp') {
      this.sceneRenderer = new SwampSceneRenderer(this, this.cellSize);
    } else if (theme === 'grass') {
      this.sceneRenderer = new GrassSceneRenderer(this, this.cellSize);
    } else {
      this.sceneRenderer = new DungeonSceneRenderer(this, this.cellSize);
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
