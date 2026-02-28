import Phaser from "phaser";
import { Depth } from '../constants/DepthConstants';
import { Grid, type CellProperty } from "../systems/grid/Grid";
import { LevelLoader, type LevelData } from "../systems/level/LevelLoader";
import { EntityManager } from "../ecs/EntityManager";
import { EntityCreatorManager } from "../systems/EntityCreatorManager";
import { EntityLoader } from "../systems/EntityLoader";
import { WorldStateManager } from "../systems/WorldStateManager";
import type HudScene from "./HudScene";
import { PLAYER_MAX_HEALTH, createPlayerEntity } from "../ecs/entities/player/PlayerEntity";
import { createThrowerAnimations } from "../ecs/entities/thrower/ThrowerAnimations";
import { EventManagerSystem } from "../ecs/systems/EventManagerSystem";
import { StateMachine } from "../systems/state/StateMachine";
import { InGameState } from "./states/InGameState";
import { CELL_SIZE, CAMERA_ZOOM, CAMERA_BOUNDS_INSET_X_PX, CAMERA_BOUNDS_INSET_Y_PX } from "../constants/GameConstants";
import { SpriteComponent } from "../ecs/components/core/SpriteComponent";
import { GridPositionComponent } from "../ecs/components/movement/GridPositionComponent";
import { HealthComponent } from "../ecs/components/core/HealthComponent";
import { preloadAssets, preloadLevelAssets, getBackgroundTextures } from "../assets/AssetLoader";
import type { AssetKey } from "../assets/AssetRegistry";
import { CollisionSystem } from "../systems/CollisionSystem";
import { DungeonSceneRenderer } from "./theme/DungeonSceneRenderer";
import { WildsSceneRenderer } from "./theme/WildsSceneRenderer";
import { SwampSceneRenderer } from "./theme/SwampSceneRenderer";
import { GrassSceneRenderer } from "./theme/GrassSceneRenderer";
import { SceneOverlays } from "../systems/SceneOverlays";
import { toggleMustFaceEnemy } from "../ecs/components/combat/AttackComboComponent";
import type { GameSceneRenderer } from "./theme/GameSceneRenderer";

export default class GameScene extends Phaser.Scene {
  public entityManager!: EntityManager;
  public collisionSystem!: CollisionSystem;
  public eventManager!: EventManagerSystem;
  private entityCreatorManager!: EntityCreatorManager;
  private entityLoader!: EntityLoader;
  private stateMachine!: StateMachine<void>;
  private grid!: Grid;
  private readonly cellSize: number = CELL_SIZE;
  private levelKey!: Phaser.Input.Keyboard.Key;
  private levelData!: LevelData;
  private currentLevelName: string = 'grass_overworld1';
  private levelEntrySnapshot: string | null = null;
  private vignette?: Phaser.GameObjects.Image;
  private background?: Phaser.GameObjects.Image;
  private sceneRenderer!: GameSceneRenderer;
  public layerDebugText?: Phaser.GameObjects.Text;
  private sceneOverlays?: SceneOverlays;
  private isEditorMode: boolean = false;

  constructor() {
    super({ key: "game", active: true });
  }

  preload() {
    // Load all assets from registry
    preloadAssets(this);
  }

  async create() {
    // Load world state
    const worldState = WorldStateManager.getInstance();
    await worldState.loadFromFile();

    // Initialize event manager first (needed by HudScene)
    this.entityManager = new EntityManager();
    this.eventManager = new EventManagerSystem();
    this.entityManager.setEventManager(this.eventManager);
    this.entityCreatorManager = new EntityCreatorManager(this.entityManager, this.eventManager);

    // Wait for HudScene to be ready
    if (!this.scene.isActive('HudScene')) {
      this.scene.launch('HudScene');
      await new Promise<void>(resolve => {
        this.scene.get('HudScene').events.once('create', () => resolve());
      });
    }

    const params = new URLSearchParams(globalThis.location.search);
    const levelParam = params.get('level');
    if (levelParam) {
      this.currentLevelName = levelParam;
    } else {
      this.currentLevelName = worldState.getCurrentLevelName();
    }

    this.levelData = await LevelLoader.load(this.currentLevelName);

    const theme = this.levelData.levelTheme ?? 'dungeon';
    if (theme === 'dungeon') {
      this.sceneRenderer = new DungeonSceneRenderer(this, this.cellSize);
    } else if (theme === 'swamp') {
      this.sceneRenderer = new SwampSceneRenderer(this, this.cellSize);
    } else if (theme === 'grass') {
      this.sceneRenderer = new GrassSceneRenderer(this, this.cellSize);
    } else if (theme === 'wilds') {
      this.sceneRenderer = new WildsSceneRenderer(this, this.cellSize);
    } else {
      this.sceneRenderer = new DungeonSceneRenderer(this, this.cellSize);
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

    await this.sceneRenderer.prepareRuntimeTilesets(this.levelData);
    this.sceneRenderer.markAssetsReady();

    createThrowerAnimations(this);

    this.anims.create({
      key: 'water_ripple_anim',
      frames: this.anims.generateFrameNumbers('water_ripple', { start: 0, end: 3 }),
      frameRate: 12,
      repeat: 0
    });
    
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
    this.layerDebugText.setDepth(Depth.debugText);
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
          this.isEditorMode = !this.isEditorMode;
          if (this.isEditorMode) {
            this.resetScene();
            this.scene.pause();
            this.scene.launch('EditorScene');
          } else {
            this.scene.resume();
            this.scene.stop('EditorScene');
          }
        }
      });

      const punchModeKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
      punchModeKey.on('down', () => {
        toggleMustFaceEnemy();
      });

      const worldStateKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Y);
      worldStateKey.on('down', () => {
        this.saveWorldState();
      });
    }
  }

  renderGrid(grid: Grid, levelData?: LevelData): void {
    this.sceneRenderer.renderGrid(grid, levelData);
  }

  private initializeScene(): void {
    const level = this.levelData;
    const worldState = WorldStateManager.getInstance();
    const levelState = worldState.getLevelState(level.name!);

    this.grid = new Grid(this, level.width, level.height, this.cellSize);

    for (const cell of level.cells) {
      this.grid.setCell(cell.col, cell.row, {
        layer: cell.layer ?? 0,
        properties: new Set(cell.properties ?? []),
        backgroundTexture: cell.backgroundTexture
      });
    }

    // Apply modified cells from world state
    const cellsToInvalidate: Array<{ col: number; row: number }> = [];
    for (const modCell of levelState.modifiedCells) {
      this.grid.setCell(modCell.col, modCell.row, {
        layer: modCell.layer ?? 0,
        properties: new Set(modCell.properties as CellProperty[] ?? []),
        backgroundTexture: modCell.backgroundTexture ?? ''
      });

      // Update level data to match
      const levelCell = level.cells.find(c => c.col === modCell.col && c.row === modCell.row);
      if (levelCell) {
        if (modCell.backgroundTexture) {
          levelCell.backgroundTexture = modCell.backgroundTexture;
        } else {
          delete levelCell.backgroundTexture;
        }
      }

      cellsToInvalidate.push({ col: modCell.col, row: modCell.row });
    }

    // Invalidate renderer cache for modified cells
    if (cellsToInvalidate.length > 0 && this.sceneRenderer) {
      this.sceneRenderer.invalidateCells(cellsToInvalidate);
    }

    const overlays = new SceneOverlays(this, this.levelData);
    this.sceneOverlays = overlays;
    void overlays.init().then(() => {
      overlays.applyOverlays(this.grid);
      this.grid.render();
    });

    this.cameras.main.setBounds(
      CAMERA_BOUNDS_INSET_X_PX,
      CAMERA_BOUNDS_INSET_Y_PX,
      level.width * this.grid.cellSize - CAMERA_BOUNDS_INSET_X_PX,
      level.height * this.grid.cellSize - CAMERA_BOUNDS_INSET_Y_PX
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
        this.transitionToLevel(targetLevel, targetCol, targetRow);
      }
    );

    this.spawnEntities();

    // Camera follow player's sprite (unless in editor mode)
    const player = this.entityManager.getFirst('player');
    if (player && !this.isEditorMode) {
      const spriteComp = player.get(SpriteComponent);
      if (spriteComp) {
        this.cameras.main.centerOn(spriteComp.sprite.x, spriteComp.sprite.y);
        this.cameras.main.startFollow(spriteComp.sprite, true, 0.1, 0.1);
      }
    }

    this.eventManager.raiseEvent('level_loaded');
  }

  resetScene(): void {
    const wasGridDebugEnabled = this.grid.gridDebugEnabled;

    if (this.sceneOverlays) {
      this.sceneOverlays.destroy();
    }

    this.grid.destroy();

    // Don't track destructions during reset
    const worldState = WorldStateManager.getInstance();
    worldState.setTrackDestructions(false);
    this.entityManager.destroyAll();
    worldState.setTrackDestructions(true);

    this.entityCreatorManager.clear();

    this.initializeScene();

    if (wasGridDebugEnabled) {
      this.grid.setGridDebugEnabled(true);
    }
  }

   
  private spawnEntities(): void {
    const level = this.levelData;
    const worldState = WorldStateManager.getInstance();
    const spawnPos = worldState.getPlayerSpawnPosition();

    const hudScene = this.scene.get('HudScene') as HudScene;
    const joystick = hudScene.getJoystickEntity();

    let startX: number;
    let startY: number;

    if (spawnPos.col !== undefined && spawnPos.row !== undefined) {
      startX = this.grid.cellSize * spawnPos.col + this.grid.cellSize / 2;
      startY = this.grid.cellSize * spawnPos.row + this.grid.cellSize / 2;
    } else {
      startX = this.grid.cellSize * level.playerStart.x + this.grid.cellSize / 2;
      startY = this.grid.cellSize * level.playerStart.y + this.grid.cellSize / 2;
    }

    const playerHealth = worldState.getPlayerHealth();

    const player = this.entityManager.add(createPlayerEntity({
      scene: this,
      x: startX,
      y: startY,
      grid: this.grid,
      joystick,
      getEnemies: () => this.entityManager.getByType('stalking_robot').concat(this.entityManager.getByType('bug')).concat(this.entityManager.getByType('thrower')),
      entityManager: this.entityManager,
      vignetteSprite: this.vignette,
      initialHealth: playerHealth,
      levelData: () => this.levelData
    }));

    // Load entities from new format
    this.entityLoader.loadEntities(level, player, this.isEditorMode);
  }


  update(_time: number, delta: number): void {
    // Wait for async create to finish
    if (!this.entityManager || !this.grid || !this.stateMachine) return;

    // Update state machine (delegates to InGameState)
    this.stateMachine.update(delta);

    // Update scene renderer (for water animation)
    this.sceneRenderer.update(delta);

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

  setTheme(theme: 'dungeon' | 'swamp' | 'grass' | 'wilds'): void {
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
    } else if (theme === 'wilds') {
      this.sceneRenderer = new WildsSceneRenderer(this, this.cellSize);
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

  reloadCurrentLevel(): void {
    const worldState = WorldStateManager.getInstance();

    // Restore world state to when we entered the level
    if (this.levelEntrySnapshot) {
      worldState.loadFromJSON(this.levelEntrySnapshot);
    } else {
      // Fallback: just restore health
      worldState.setPlayerHealth(PLAYER_MAX_HEALTH);
    }

    const state = worldState.getState();
    const spawnCol = state.player.spawnCol ?? this.levelData.playerStart.x;
    const spawnRow = state.player.spawnRow ?? this.levelData.playerStart.y;

    this.transitionToLevel(this.currentLevelName, spawnCol, spawnRow);
  }

  private transitionToLevel(targetLevel: string, spawnCol: number, spawnRow: number): void {
    // Update world state before transition
    const worldState = WorldStateManager.getInstance();
    const player = this.entityManager.getFirst('player');
    if (player) {
      const health = player.get(HealthComponent);
      // Only save health if player is alive
      if (health && health.getHealth() > 0) {
        worldState.setPlayerHealth(health.getHealth());
      }
    }

    worldState.updateModifiedCells(this.currentLevelName, this.grid, this.levelData);
    worldState.setCurrentLevel(targetLevel);
    worldState.setPlayerSpawnPosition(spawnCol, spawnRow);

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
    fadeRect.setDepth(Depth.fade);
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
          newFadeRect.setDepth(Depth.fade);
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

  private saveWorldState(): void {
    const worldState = WorldStateManager.getInstance();

    // Update player health
    const player = this.entityManager.getFirst('player');
    if (player) {
      const health = player.get(HealthComponent);
      if (health) {
        worldState.setPlayerHealth(health.getHealth());
      }
    }

    // Update modified cells
    worldState.updateModifiedCells(this.currentLevelName, this.grid, this.levelData);

    const json = worldState.serializeToJSON();
    console.log('World State (copy to public/states/default.json):');
    console.log(json);

    // Copy to clipboard
    void navigator.clipboard.writeText(json).then(() => {
      console.log('[WorldState] Copied to clipboard');
    }).catch((error: unknown) => {
      console.error('[WorldState] Failed to copy to clipboard:', error);
    });
  }


  async loadLevel(levelName: string, spawnCol?: number, spawnRow?: number): Promise<void> {
    // Pause game during level transition
    this.scene.pause();

    // Track what textures were used in previous level
    const prevLevelTextures = this.levelData ? getBackgroundTextures(this.levelData) : [];

    this.currentLevelName = levelName;
    this.levelData = await LevelLoader.load(levelName);

    if (spawnCol !== undefined && spawnRow !== undefined) {
      this.levelData.playerStart = { x: spawnCol, y: spawnRow };
    }

    // Get textures needed for new level
    const newLevelTextures = getBackgroundTextures(this.levelData);

    // Calculate texture deltas
    const unusedTextures = [...new Set(prevLevelTextures.filter((tex: string) => !newLevelTextures.includes(tex as AssetKey)))];
    const newTextures = [...new Set(newLevelTextures.filter((tex: AssetKey) => !prevLevelTextures.includes(tex)))];

    // Cleanup before loading new level
    this.time.removeAllEvents();

    if (this.sceneRenderer) {
      this.sceneRenderer.destroy();
    }

    this.children.list
      .filter(obj => obj !== this.layerDebugText)
      .forEach(obj => obj.destroy());

    // Unload unused textures after destroying sprites
    if (prevLevelTextures.length > 0) {
      if (newTextures.length > 0) {
        console.log('[AssetLoader] New textures to load:', newTextures);
      }
      if (unusedTextures.length > 0) {
        console.log('[AssetLoader] Unloading unused textures:', unusedTextures);
        unusedTextures.forEach(tex => {
          if (this.textures.exists(tex)) {
            this.textures.remove(tex);
          }
        });
      }
    }

    // Load new level assets
    preloadLevelAssets(this, this.levelData, () => {
      this.sceneRenderer.markAssetsReady();
    });
    await new Promise<void>(resolve => {
      if (this.load.isLoading()) {
        this.load.once('complete', () => resolve());
      } else {
        resolve();
      }
      this.load.start();
    });

    const theme = this.levelData.levelTheme ?? 'dungeon';
    if (theme === 'dungeon') {
      this.sceneRenderer = new DungeonSceneRenderer(this, this.cellSize);
    } else if (theme === 'swamp') {
      this.sceneRenderer = new SwampSceneRenderer(this, this.cellSize);
    } else if (theme === 'grass') {
      this.sceneRenderer = new GrassSceneRenderer(this, this.cellSize);
    } else if (theme === 'wilds') {
      this.sceneRenderer = new WildsSceneRenderer(this, this.cellSize);
    } else {
      this.sceneRenderer = new DungeonSceneRenderer(this, this.cellSize);
    }

    const rendered = this.sceneRenderer.renderTheme(this.levelData.width, this.levelData.height);
    this.background = rendered.background;
    this.vignette = rendered.vignette;

    // Save snapshot of world state BEFORE spawning entities
    const worldState = WorldStateManager.getInstance();
    this.levelEntrySnapshot = worldState.serializeToJSON();

    this.resetScene();

    // Resume game after level is fully loaded
    this.scene.resume();
  }

  getCurrentLevelName(): string {
    return this.currentLevelName;
  }
}
