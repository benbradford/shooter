import Phaser from "phaser";
import { Grid } from "../systems/grid/Grid";
import { LevelLoader, type LevelData } from "../systems/level/LevelLoader";
import { EntityManager } from "../ecs/EntityManager";
import { EntityCreatorManager } from "../systems/EntityCreatorManager";
import { EntityLoader } from "../systems/EntityLoader";
import type HudScene from "./HudScene";
import { createPlayerEntity } from "../ecs/entities/player/PlayerEntity";
import { createThrowerAnimations } from "../ecs/entities/thrower/ThrowerAnimations";
import { EventManagerSystem } from "../ecs/systems/EventManagerSystem";
import { StateMachine } from "../systems/state/StateMachine";
import { InGameState } from "./states/InGameState";
import { CELL_SIZE, CAMERA_ZOOM } from "../constants/GameConstants";
import { SpriteComponent } from "../ecs/components/core/SpriteComponent";
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
  private entityCreatorManager!: EntityCreatorManager;
  private entityLoader!: EntityLoader;
  private stateMachine!: StateMachine<void>;
  private grid!: Grid;
  private readonly cellSize: number = CELL_SIZE;
  private levelKey!: Phaser.Input.Keyboard.Key;
  private levelData!: LevelData;
  private currentLevelName: string = 'dungeon1';
  private vignette?: Phaser.GameObjects.Image;
  private background?: Phaser.GameObjects.Image;
  private sceneRenderer!: GameSceneRenderer;
  public layerDebugText?: Phaser.GameObjects.Text;
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
    this.entityCreatorManager = new EntityCreatorManager(this.entityManager, this.eventManager);
    this.entityCreatorManager = new EntityCreatorManager(this.entityManager, this.eventManager);

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
    
    this.stateMachine = new StateMachine({
      inGame: new InGameState(
        () => this.entityManager,
        () => this.collisionSystem,
        () => this.grid,
        () => this.levelData
      )
    }, 'inGame');

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

    this.entityLoader = new EntityLoader(
      this, 
      this.grid, 
      this.entityManager, 
      this.eventManager, 
      this.entityCreatorManager,
      (targetLevel, targetCol, targetRow) => {
        void this.transitionToLevel(targetLevel, targetCol, targetRow);
      }
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

    // Load entities from new format
    this.entityLoader.loadEntities(level, player);
  }


  update(_time: number, delta: number): void {
    // Wait for async create to finish
    if (!this.entityManager || !this.grid || !this.stateMachine) return;

    // Update state machine (delegates to InGameState)
    this.stateMachine.update(delta);

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

  private transitionToLevel(targetLevel: string, spawnCol: number, spawnRow: number): void {
    const cam = this.cameras.main;
    const fadeRect = this.add.rectangle(
      0,
      0,
      cam.width / cam.zoom,
      cam.height / cam.zoom,
      0x000000
    );
    fadeRect.setOrigin(0, 0);
    fadeRect.setScrollFactor(0);
    fadeRect.setDepth(100000);
    fadeRect.setAlpha(0);

    this.tweens.add({
      targets: fadeRect,
      alpha: 1,
      duration: 300,
      ease: 'Linear',
      onComplete: () => {
        void this.loadLevel(targetLevel, spawnCol, spawnRow).then(() => {
          const newFadeRect = this.add.rectangle(
            0,
            0,
            this.cameras.main.width / this.cameras.main.zoom,
            this.cameras.main.height / this.cameras.main.zoom,
            0x000000
          );
          newFadeRect.setOrigin(0, 0);
          newFadeRect.setScrollFactor(0);
          newFadeRect.setDepth(100000);
          newFadeRect.setAlpha(1);

          this.tweens.add({
            targets: newFadeRect,
            alpha: 0,
            duration: 300,
            ease: 'Linear',
            onComplete: () => {
              newFadeRect.destroy();
            }
          });
        }).catch((error: unknown) => {
          console.error(`Failed to transition to level ${targetLevel}:`, error);
        });
      }
    });
  }


  async loadLevel(levelName: string, spawnCol?: number, spawnRow?: number): Promise<void> {
    this.currentLevelName = levelName;
    this.levelData = await LevelLoader.load(levelName);

    if (spawnCol !== undefined && spawnRow !== undefined) {
      this.levelData.playerStart = { x: spawnCol, y: spawnRow };
    }

    preloadLevelAssets(this, this.levelData);
    await new Promise<void>(resolve => {
      if (this.load.isLoading()) {
        this.load.once('complete', () => resolve());
      } else {
        resolve();
      }
      this.load.start();
    });

    this.time.removeAllEvents();

    if (this.sceneRenderer) {
      this.sceneRenderer.destroy();
    }

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
