import Phaser from "phaser";
import { Grid } from "./utils/Grid";
import { LevelLoader, type LevelData } from "./level/LevelLoader";
import { EntityManager } from "./ecs/EntityManager";
import { createPlayerEntity } from "./player/PlayerEntity";
import { createBulletEntity } from "./projectile/BulletEntity";
import { createShellCasingEntity } from "./projectile/ShellCasingEntity";
import { createJoystickEntity } from "./hud/JoystickEntity";
import { createStalkingRobotEntity } from "./robot/StalkingRobotEntity";
import { createBugBaseEntity } from "./bug/BugBaseEntity";
import { createBugEntity } from "./bug/BugEntity";
import { BugSpawnerComponent } from "./ecs/components/ai/BugSpawnerComponent";
import { BugBaseDifficultyComponent } from "./bug/BugBaseDifficultyComponent";
import { getBugBaseDifficultyConfig } from "./bug/BugBaseDifficulty";
import type { RobotDifficulty } from "./robot/RobotDifficulty";
import { SpriteComponent } from "./ecs/components/core/SpriteComponent";
import { GridPositionComponent } from "./ecs/components/movement/GridPositionComponent";
import { TransformComponent } from "./ecs/components/core/TransformComponent";
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
  private vignette?: Phaser.GameObjects.Image;
  private backgroundImage?: Phaser.GameObjects.Image;
  private currentGradientStyle: number = 9;

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
      
      for (let i = 3; i <= 9; i++) {
        const keyCode = Phaser.Input.Keyboard.KeyCodes[`ONE` as keyof typeof Phaser.Input.Keyboard.KeyCodes] + (i - 1);
        const key = keyboard.addKey(keyCode);
        key.on('down', () => {
          if (this.scene.isActive()) {
            this.currentGradientStyle = i;
            this.createGradientBackground();
          }
        });
      }
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
    
    this.applyGradientStyle(ctx, width, height);
    
    canvas?.refresh();
    
    if (this.backgroundImage) {
      this.backgroundImage.destroy();
    }
    
    this.backgroundImage = this.add.image(0, 0, 'gradient');
    this.backgroundImage.setOrigin(0, 0);
    this.backgroundImage.setDepth(-1000);
  }

  private applyGradientStyle(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.hypot(centerX, centerY);
    let gradient;
    
    switch (this.currentGradientStyle) {
      case 1:
        gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
        gradient.addColorStop(0, '#a0a0a0');
        gradient.addColorStop(1, '#1a2e1a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        break;
        
      case 2:
        gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
        gradient.addColorStop(0, '#ff00ff');
        gradient.addColorStop(0.3, '#00ffff');
        gradient.addColorStop(0.6, '#ffff00');
        gradient.addColorStop(1, '#000000');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        break;
        
      case 3:
        this.createNoisyRadialPattern(ctx, width, height);
        break;
        
      case 4:
        gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#ff0000');
        gradient.addColorStop(0.2, '#ff00ff');
        gradient.addColorStop(0.4, '#0000ff');
        gradient.addColorStop(0.6, '#00ffff');
        gradient.addColorStop(0.8, '#00ff00');
        gradient.addColorStop(1, '#ffff00');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        break;
        
      case 5:
        this.createRandomLinearPattern(ctx, width, height);
        break;
        
      case 6:
        this.createSpotlightPattern(ctx, width, height);
        break;
        
      case 7:
        this.createGridPattern(ctx, width, height);
        break;
        
      case 8:
        gradient = ctx.createLinearGradient(0, 0, width, 0);
        for (let i = 0; i <= 1; i += 0.1) {
          gradient.addColorStop(i, `hsl(${i * 360}, 100%, 50%)`);
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        break;
        
      case 9:
        this.createStarfieldPattern(ctx, width, height);
        break;
        
      default:
        gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
        gradient.addColorStop(0, '#a0a0a0');
        gradient.addColorStop(1, '#1a2e1a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }
  }

  private createNoisyRadialPattern(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 100 + 50;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, size);
      grad.addColorStop(0, `rgba(${Math.random()*255},${Math.random()*255},${Math.random()*255},0.3)`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
  }

  private createRandomLinearPattern(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 20; i++) {
      const x1 = Math.random() * width;
      const y1 = Math.random() * height;
      const x2 = Math.random() * width;
      const y2 = Math.random() * height;
      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, `rgba(${Math.random()*255},${Math.random()*255},${Math.random()*255},0.4)`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
  }

  private createSpotlightPattern(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, Math.random() * 200);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(1, '#000000');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
  }

  private createGridPattern(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    for (let x = 0; x < width; x += 100) {
      for (let y = 0; y < height; y += 100) {
        const grad = ctx.createRadialGradient(x, y, 0, x, y, 100);
        grad.addColorStop(0, `hsl(${Math.random()*360}, 100%, 50%)`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }
    }
  }

  private createStarfieldPattern(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.hypot(centerX, centerY);
    
    const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
    bgGradient.addColorStop(0, '#4a4a4a');
    bgGradient.addColorStop(0.4, '#2a3a2a');
    bgGradient.addColorStop(0.7, '#1a2a1a');
    bgGradient.addColorStop(1, '#0a1a0a');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    for (let i = 0; i < 8; i++) {
      const startX = Math.random() * width;
      const startY = Math.random() * height;
      const segments = Math.floor(Math.random() * 5) + 3;
      
      ctx.strokeStyle = `rgba(150,200,150,${Math.random() * 0.2 + 0.1})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      
      let x = startX;
      let y = startY;
      for (let j = 0; j < segments; j++) {
        x += (Math.random() - 0.5) * 80;
        y += (Math.random() - 0.5) * 80;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const radius = Math.random() * 8 + 1;
      const brightness = Math.random() * 0.3 + 0.1;
      
      const colorChoice = Math.random();
      let color;
      if (colorChoice < 0.7) {
        color = `rgba(150,150,150,${brightness})`;
      } else if (colorChoice < 0.85) {
        color = `rgba(120,160,120,${brightness})`;
      } else {
        color = `rgba(100,130,100,${brightness})`;
      }
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
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

    // Add vignette overlay
    if (this.vignette) {
      this.vignette.destroy();
    }
    const vignetteConfig = level.vignette || { alpha: 0.6, tint: 0x000000, blendMode: Phaser.BlendModes.MULTIPLY };
    this.vignette = this.add.image(0, 0, 'vignette');
    this.vignette.setOrigin(0, 0);
    this.vignette.setScrollFactor(0);
    this.vignette.setDisplaySize(this.cameras.main.width, this.cameras.main.height);
    this.vignette.setDepth(10000);
    this.vignette.setAlpha(vignetteConfig.alpha);
    this.vignette.setTint(vignetteConfig.tint);
    this.vignette.setBlendMode(vignetteConfig.blendMode);
  }

  private enterEditorMode(): void {
    this.resetScene();

    this.grid.setGridDebugEnabled(true); // Enable grid in editor

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
          difficulty: robotData.difficulty as RobotDifficulty
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
            const transform = base.get(TransformComponent);
            const difficultyComp = base.get(BugBaseDifficultyComponent);
            if (!transform || !difficultyComp) return;
            
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
