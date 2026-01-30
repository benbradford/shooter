import Phaser from "phaser";
import { Grid } from "../utils/Grid";
import { LevelLoader, type LevelData, type BackgroundConfig } from "../systems/level/LevelLoader";
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

export default class GameScene extends Phaser.Scene {
  private entityManager!: EntityManager;
  public collisionSystem!: CollisionSystem;
  private grid!: Grid;
  private readonly cellSize: number = CELL_SIZE;
  private editorKey!: Phaser.Input.Keyboard.Key;
  private levelKey!: Phaser.Input.Keyboard.Key;
  private levelData!: LevelData;
  private currentLevelName: string = 'level1';
  private vignette?: Phaser.GameObjects.Image;
  private backgroundImage?: Phaser.GameObjects.Image;

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

    this.levelData = await LevelLoader.load(this.currentLevelName);

    this.createGradientBackground();

    this.initializeScene();

    this.collisionSystem = new CollisionSystem(this, this.grid);

    const keyboard = this.input.keyboard;
    if (keyboard) {
      this.editorKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
      this.editorKey.on('down', () => {
        if (this.scene.isActive()) {
          this.enterEditorMode();
        }
      });

      this.levelKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L);
      this.levelKey.on('down', () => {
        if (this.scene.isActive()) {
          this.showLevelSelector();
        }
      });
    }
  }

  private createGradientBackground(): void {
    const width = this.levelData.width * this.cellSize;
    const height = this.levelData.height * this.cellSize;

    if (this.textures.exists('gradient')) {
      this.textures.remove('gradient');
    }

    const canvas = this.textures.createCanvas('gradient', width, height);
    const ctx = canvas?.context;
    if (!ctx) return;

    this.createStarfieldPattern(ctx, width, height);

    canvas?.refresh();

    if (this.backgroundImage) {
      this.backgroundImage.destroy();
    }

    this.backgroundImage = this.add.image(0, 0, 'gradient');
    this.backgroundImage.setOrigin(0, 0);
    this.backgroundImage.setDepth(-1000);
  }

  private createStarfieldPattern(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.hypot(centerX, centerY);

    const defaults = {
      centerColor: '#5a6a5a',
      midColor: '#3a4a3a',
      edgeColor: '#2a3a2a',
      outerColor: '#1a2a1a',
      crackCount: 8,
      circleCount: 100,
      crackColor: '#c8ffc8',
      crackVariation: 20,
      crackThickness: 1,
      crackLength: 30,
      circleColor: '#e0e0e0',
      circleVariation: 30,
      circleThickness: 1
    };

    const config = { ...defaults, ...this.levelData.background };

    const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
    bgGradient.addColorStop(0, config.centerColor);
    bgGradient.addColorStop(0.4, config.midColor);
    bgGradient.addColorStop(0.7, config.edgeColor);
    bgGradient.addColorStop(1, config.outerColor);
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < config.crackCount; i++) {
      const startX = Math.random() * width;
      const startY = Math.random() * height;
      const segments = Math.floor(Math.random() * 5) + 3;

      const color = this.varyColor(config.crackColor, config.crackVariation);
      ctx.strokeStyle = `rgba(${color.r},${color.g},${color.b},${Math.random() * 0.2 + 0.1})`;
      ctx.lineWidth = config.crackThickness;
      ctx.beginPath();
      ctx.moveTo(startX, startY);

      let x = startX;
      let y = startY;
      let currentAngle = Math.random() * Math.PI * 2;

      for (let j = 0; j < segments; j++) {
        const angleChange = (Math.random() - 0.5) * (90 * Math.PI / 180);
        currentAngle += angleChange;

        const distance = config.crackLength * (0.5 + Math.random());
        x += Math.cos(currentAngle) * distance;
        y += Math.sin(currentAngle) * distance;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    for (let i = 0; i < config.circleCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const radius = Math.random() * 8 + 1;
      const brightness = Math.random() * 0.3 + 0.1;

      const color = this.varyColor(config.circleColor, config.circleVariation);
      ctx.strokeStyle = `rgba(${color.r},${color.g},${color.b},${brightness})`;
      ctx.lineWidth = config.circleThickness;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private varyColor(hexColor: string | undefined, variationPercent: number): { r: number; g: number; b: number } {
    if (hexColor?.length !== 7) {
      return { r: 150, g: 150, b: 150 };
    }

    const r = Number.parseInt(hexColor.slice(1, 3), 16);
    const g = Number.parseInt(hexColor.slice(3, 5), 16);
    const b = Number.parseInt(hexColor.slice(5, 7), 16);

    const brightnessMultiplier = 1 + (Math.random() - 0.5) * 2 * (variationPercent / 100);

    return {
      r: Math.max(0, Math.min(255, Math.round(r * brightnessMultiplier))),
      g: Math.max(0, Math.min(255, Math.round(g * brightnessMultiplier))),
      b: Math.max(0, Math.min(255, Math.round(b * brightnessMultiplier)))
    };
  }

  private initializeScene(): void {
    const level = this.levelData;

    this.grid = new Grid(this, level.width, level.height, this.cellSize);

    for (const cell of level.cells) {
      this.grid.setCell(cell.col, cell.row, {
        layer: cell.layer ?? 0,
        isTransition: cell.isTransition ?? false,
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
      const spriteComp = player.get(SpriteComponent);
      if (spriteComp) {
        this.cameras.main.centerOn(spriteComp.sprite.x, spriteComp.sprite.y);
        this.cameras.main.startFollow(spriteComp.sprite, true, 0.1, 0.1);
      }
    }

    // Set camera zoom - HUD scene is separate so this won't affect touch
    this.cameras.main.setZoom(CAMERA_ZOOM);

    // Add vignette overlay
    if (this.vignette) {
      this.vignette.destroy();
    }
    const vignetteConfig = level.vignette ?? { alpha: 0.6, tint: 0x000000, blendMode: Phaser.BlendModes.MULTIPLY };
    const zoom = this.cameras.main.zoom;
    this.vignette = this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, 'vignette');
    this.vignette.setOrigin(0.5, 0.5);
    this.vignette.setScrollFactor(0);
    this.vignette.setDisplaySize(this.cameras.main.width / zoom, this.cameras.main.height / zoom);
    this.vignette.setDepth(10000);
    this.vignette.setAlpha(vignetteConfig.alpha);
    this.vignette.setTint(vignetteConfig.tint);
    this.vignette.setBlendMode(vignetteConfig.blendMode);
  }

  private enterEditorMode(): void {
    this.resetScene();

    this.grid.setGridDebugEnabled(true);

    const hudScene = this.scene.get('HudScene') as HudScene;
    hudScene.setEditorActive(true);

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

    const hudScene = this.scene.get('HudScene') as HudScene;
    const joystick = hudScene.getJoystickEntity();

    const startX = this.grid.cellSize * level.playerStart.x;
    const startY = this.grid.cellSize * level.playerStart.y;
    const player = this.entityManager.add(createPlayerEntity({
      scene: this,
      x: startX,
      y: startY,
      grid: this.grid,
      onFire: (x, y, dirX, dirY) => {
        const gridPos = player.get(GridPositionComponent);
        if (!gridPos) return;
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
      onShellEject: (x, y, direction, playerDirection) => {
        const shell = createShellCasingEntity(this, x, y, direction, playerDirection);
        this.entityManager.add(shell);
      },
      joystick,
      getEnemies: () => this.entityManager.getByType('stalking_robot').concat(this.entityManager.getByType('bug')).concat(this.entityManager.getByType('thrower'))
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

  updateVignette(): void {
    if (this.vignette && this.levelData.vignette) {
      this.vignette.setAlpha(this.levelData.vignette.alpha);
      this.vignette.setTint(this.levelData.vignette.tint);
      this.vignette.setBlendMode(this.levelData.vignette.blendMode);
    }
  }

  updateBackground(config: BackgroundConfig): void {
    this.levelData.background = config;
    this.createGradientBackground();
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
