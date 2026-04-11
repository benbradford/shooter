import Phaser from "phaser";
import { Depth } from '../constants/DepthConstants';
import { Grid, type CellProperty } from "../systems/grid/Grid";
import { LevelLoader, type LevelData, type LevelTheme } from "../systems/level/LevelLoader";
import { EntityManager } from "../ecs/EntityManager";
import { NPCIdleComponent } from "../ecs/entities/npc/NPCIdleComponent";
import { Entity } from "../ecs/Entity";
import { EntityCreatorManager } from "../systems/EntityCreatorManager";
import { EntityLoader } from "../systems/EntityLoader";
import { WorldStateManager } from "../systems/WorldStateManager";
import { NPCManager } from "../systems/NPCManager";
import type HudScene from "./HudScene";
import { PLAYER_MAX_HEALTH, createPlayerEntity } from "../ecs/entities/player/PlayerEntity";
import { EventManagerSystem } from "../ecs/systems/EventManagerSystem";
import { StateMachine } from "../systems/state/StateMachine";
import type { IState } from "../systems/state/IState";
import { InGameState } from "./states/InGameState";
import { InteractionState, type InteractionStateData } from "./states/InteractionState";
import { CELL_SIZE, CAMERA_ZOOM, CAMERA_BOUNDS_INSET_X_PX, CAMERA_BOUNDS_INSET_Y_PX } from "../constants/GameConstants";
import { SpriteComponent } from "../ecs/components/core/SpriteComponent";
import { GridPositionComponent } from "../ecs/components/movement/GridPositionComponent";
import { TransformComponent } from "../ecs/components/core/TransformComponent";
import { HealthComponent } from "../ecs/components/core/HealthComponent";
import { InputComponent } from "../ecs/components/input/InputComponent";
import { preloadAssets, preloadLevelAssets, preloadAssetGroups } from "../assets/AssetLoader";
import { CollisionSystem } from "../systems/CollisionSystem";
import { DungeonSceneRenderer } from "./theme/DungeonSceneRenderer";
import { WildsSceneRenderer } from "./theme/WildsSceneRenderer";
import { SwampSceneRenderer } from "./theme/SwampSceneRenderer";
import { GrassSceneRenderer } from "./theme/GrassSceneRenderer";
import { DefaultSceneRenderer } from "./theme/DefaultSceneRenderer";
import { SceneOverlays } from "../systems/SceneOverlays";
import { toggleMustFaceEnemy } from "../ecs/components/combat/AttackComboComponent";
import type { GameSceneRenderer } from "./theme/GameSceneRenderer";
import { BlockedAreaManager } from "../systems/BlockedAreaManager";

export default class GameScene extends Phaser.Scene {
  public entityManager!: EntityManager;
  public collisionSystem!: CollisionSystem;
  public eventManager!: EventManagerSystem;
  private entityCreatorManager!: EntityCreatorManager;
  private entityLoader!: EntityLoader;
  private stateMachine!: StateMachine<void | InteractionStateData>;
  private grid!: Grid;
  private readonly cellSize: number = CELL_SIZE;
  private levelData!: LevelData;
  private currentLevelName: string = 'house3_interior';
  private levelEntrySnapshot: string | null = null;
  private vignette?: Phaser.GameObjects.Image;
  private background?: Phaser.GameObjects.Image;
  private sceneRenderer!: GameSceneRenderer;
  public layerDebugText?: Phaser.GameObjects.Text;
  private sceneOverlays?: SceneOverlays;
  private isEditorMode: boolean = false;
  private static hasLoadedFromURL: boolean = false;
  private static hasLoadedWorldState: boolean = false;
  private static previousEntityManager?: EntityManager;
  public isInInteraction: boolean = false;
  private isResetting: boolean = false;
  public blockedAreaManager?: BlockedAreaManager;

  constructor() {
    super({ key: "game" });
  }

  preload() {
    // Load all assets from registry
    preloadAssets(this);
  }

  async create(data?: { editorMode?: boolean; levelName?: string; levelData?: LevelData }) {
    // --- EDITOR MODE ---
    if (data?.editorMode) {
      this.isEditorMode = true;
      this.currentLevelName = data.levelName ?? this.currentLevelName;

      // Outer try/catch ensures notifySceneReady() always fires (Fixed: N1)
      try {
        // Inner try/catch for level load failure (Fixed: failure #1)
        try {
          if (data.levelData) {
            this.levelData = data.levelData;
            this.levelData.name = this.currentLevelName;
          } else {
            this.levelData = await LevelLoader.load(this.currentLevelName);
          }
        } catch (e) {
          console.error('[Editor] Failed to load level:', e);
          this.levelData = {
            name: this.currentLevelName,
            width: 10, height: 10,
            playerStart: { x: 1, y: 3 },
            cells: [], entities: [],
            levelTheme: 'dungeon' as LevelTheme,
          };
        }

        // Initialize managers
        this.entityManager = new EntityManager();
        this.eventManager = new EventManagerSystem();
        this.entityManager.setEventManager(this.eventManager);
        this.entityCreatorManager = new EntityCreatorManager(this.entityManager, this.eventManager);

        // Load ALL assets upfront for editor (including all background textures and enemy sprites)
        preloadAssets(this);
        preloadAssetGroups(this, ['editor', 'stalking_robot', 'bug_base', 'thrower', 'skeleton', 'puma', 'bullet_dude', 'breakables']);
        preloadLevelAssets(this, this.levelData);
        this.load.start();
        await new Promise<void>(resolve => {
          if (this.load.isLoading()) {
            this.load.once('complete', resolve);
          } else { resolve(); }
        });

        // Setup theme renderer
        const theme = this.levelData.levelTheme ?? 'dungeon';
        if (theme === 'dungeon') {
          this.sceneRenderer = new DungeonSceneRenderer(this, this.cellSize);
        } else if (theme === 'swamp') {
          this.sceneRenderer = new SwampSceneRenderer(this, this.cellSize);
        } else if (theme === 'grass') {
          this.sceneRenderer = new GrassSceneRenderer(this, this.cellSize);
        } else if (theme === 'wilds') {
          this.sceneRenderer = new WildsSceneRenderer(this, this.cellSize, this.levelData.mistConfig);
        } else {
          this.sceneRenderer = new DefaultSceneRenderer(this, this.cellSize);
        }

        await this.sceneRenderer.loadAllAssets(this.levelData);

        const rendered = this.sceneRenderer.renderTheme(this.levelData.width, this.levelData.height);
        this.background = rendered.background;
        this.vignette = rendered.vignette;
        if (this.background) this.background.setAlpha(1);
        if (this.vignette) {
          const targetAlpha = theme === 'grass' ? 0.25 : theme === 'swamp' ? 0.3 : theme === 'wilds' ? 0.3 : 0.2;
          this.vignette.setAlpha(targetAlpha);
        }

        // Initialize grid
        this.grid = new Grid(this, this.levelData.width, this.levelData.height, this.cellSize);
        for (const cell of this.levelData.cells) {
          const bgTexture = cell.backgroundTexture
            ? (typeof cell.backgroundTexture === 'string' ? cell.backgroundTexture : cell.backgroundTexture.image)
            : undefined;
          this.grid.setCell(cell.col, cell.row, {
            layer: cell.layer ?? 0,
            properties: new Set(cell.properties ?? []),
            backgroundTexture: bgTexture
          });
        }

        this.sceneRenderer.initializeSprites(this.grid, this.levelData);
        this.grid.render();
        this.grid.setGridDebugEnabled(true);
        this.sceneRenderer.updateGraphics(this.grid, this.levelData);

        // Free camera for editor
        this.cameras.main.setBounds(-10000, -10000, 20000, 20000);
        this.cameras.main.setZoom(1);

        // Create minimal editor player first (needed by EntityLoader)
        const editorPlayer = this.createEditorPlayer();

        // Spawn entities in editor mode (all immediately, no events, no player input)
        const noopTransition = (_level: string, _col: number, _row: number): void => { /* editor: no transitions */ };
        this.entityLoader = new EntityLoader(
          this, this.grid, this.entityManager, this.eventManager,
          this.entityCreatorManager,
          noopTransition
        );

        this.entityLoader.loadEntities(this.levelData, editorPlayer, true);

        // Force all sprites visible in editor (spawn animations leave alpha/scale at 0)
        for (const entity of this.entityManager.getAll()) {
          const sprite = entity.get(SpriteComponent);
          if (sprite) {
            sprite.sprite.setAlpha(1);
            if (sprite.sprite.scaleX === 0 || sprite.sprite.scaleY === 0) {
              const fitScale = this.cellSize / Math.max(sprite.sprite.width, sprite.sprite.height);
              sprite.sprite.setScale(fitScale);
            }
          }
          // Initialize NPC idle components in editor (update() doesn't run)
          const idle = entity.get(NPCIdleComponent);
          if (idle) {
            idle.update(0);
          }
        }

      } catch (e) {
        console.error('[Editor] Scene init failed:', e);
        // Minimal fallback so bridge accessors don't crash
        if (!this.entityManager) this.entityManager = new EntityManager();
        if (!this.eventManager) this.eventManager = new EventManagerSystem();
        if (!this.grid) this.grid = new Grid(this, 10, 10, this.cellSize);
        if (!this.sceneRenderer) this.sceneRenderer = new DungeonSceneRenderer(this, this.cellSize);
      }

      // ALWAYS notify bridge (Fixed: runtime violation #2, N1)
      // Only in dev mode — editor is excluded from production builds
      if (import.meta.env.DEV) {
        const { EditorBridge } = await import('../../editor/EditorBridge');
        const bridge = EditorBridge.getInstance();
        bridge.setScene(this);
        bridge.notifySceneReady();
      }
      return;
    }

    // --- NORMAL GAME MODE ---
    // Destroy entities from previous scene instance
    if (GameScene.previousEntityManager) {
      console.log('[DBGAME] Destroying', GameScene.previousEntityManager.count, 'entities from previous scene');
      const worldState = WorldStateManager.getInstance();
      worldState.setTrackDestructions(false);
      GameScene.previousEntityManager.destroyAll();
      worldState.setTrackDestructions(true);
      GameScene.previousEntityManager = undefined;
    }

    // Start with camera faded out (prevents green flash)
    this.cameras.main.fadeFrom(0, 0, 0, 0, true);

    // Load world state only on first load
    const worldState = WorldStateManager.getInstance();
    if (!GameScene.hasLoadedWorldState) {
      const profileName = (this.scene.settings.data as { profileName?: string })?.profileName;
      await worldState.loadFromFile(profileName);
      GameScene.hasLoadedWorldState = true;
    }

    // Initialize event manager first (needed by HudScene)
    this.entityManager = new EntityManager();
    this.eventManager = new EventManagerSystem();
    this.entityManager.setEventManager(this.eventManager);
    this.entityCreatorManager = new EntityCreatorManager(this.entityManager, this.eventManager);

    // Initialize NPC manager
    NPCManager.getInstance(this);

    // Wait for HudScene to be ready
    if (!this.scene.isActive('HudScene')) {
      this.scene.launch('HudScene');
      await new Promise<void>(resolve => {
        this.scene.get('HudScene').events.once('create', () => resolve());
      });
    }

    const params = new URLSearchParams(globalThis.location.search);
    const levelParam = params.get('level');

    // Only use URL parameter on first load, not on transitions
    if (levelParam && !GameScene.hasLoadedFromURL) {
      this.currentLevelName = levelParam;
      worldState.setCurrentLevel(levelParam);
      worldState.clearPlayerSpawnPosition();
      GameScene.hasLoadedFromURL = true;
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
      this.sceneRenderer = new WildsSceneRenderer(this, this.cellSize, this.levelData.mistConfig);
    } else if (theme === 'default') {
      this.sceneRenderer = new DefaultSceneRenderer(this, this.cellSize);
    } else {
      this.sceneRenderer = new DungeonSceneRenderer(this, this.cellSize);
    }

    preloadLevelAssets(this, this.levelData);
    this.load.start();

    await new Promise<void>(resolve => {
      if (this.load.isLoading()) {
        this.load.once('complete', () => {
          console.log('[GameScene] Asset loading complete in create()');
          resolve();
        });
      } else {
        resolve();
      }
    });

    await this.sceneRenderer.loadAllAssets(this.levelData);

    const rippleKey = this.levelData.background?.water?.rippleSpritesheet ?? 'water_ripple';
    if (!this.anims.exists(`${rippleKey}_anim`)) {
      this.anims.create({
        key: `${rippleKey}_anim`,
        frames: this.anims.generateFrameNumbers(rippleKey, { start: 0, end: 3 }),
        frameRate: 12,
        repeat: 0
      });
    }

    const rendered = this.sceneRenderer.renderTheme(this.levelData.width, this.levelData.height);
    this.background = rendered.background;
    this.vignette = rendered.vignette;

    await this.initializeScene();

    this.sceneRenderer.initializeSprites(this.grid, this.levelData);

    this.collisionSystem = new CollisionSystem(this, this.grid);

    this.stateMachine = new StateMachine({
      inGame: new InGameState(
        () => this.entityManager,
        () => this.collisionSystem,
        () => this.grid,
        () => this.levelData
      ) as IState<void | InteractionStateData>,
      interaction: new InteractionState(
        this,
        () => this.entityManager,
        () => this.collisionSystem,
        () => this.grid,
        () => this.levelData
      ) as IState<void | InteractionStateData>
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
    this.sceneRenderer.updateGraphics(grid, levelData);
  }

  refreshSprites(): void {
    this.sceneRenderer.reinitializeSprites(this.grid, this.levelData);
    this.sceneRenderer.updateGraphics(this.grid, this.levelData);
  }

  private async initializeScene(): Promise<void> {
    const level = this.levelData;
    const worldState = WorldStateManager.getInstance();
    const levelState = worldState.getLevelState(level.name!);

    this.grid = new Grid(this, level.width, level.height, this.cellSize);

    for (const cell of level.cells) {
      const bgTexture = cell.backgroundTexture
        ? (typeof cell.backgroundTexture === 'string' ? cell.backgroundTexture : cell.backgroundTexture.image)
        : undefined;

      this.grid.setCell(cell.col, cell.row, {
        layer: cell.layer ?? 0,
        properties: new Set(cell.properties ?? []),
        backgroundTexture: bgTexture
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
          // Only update if level cell doesn't have a transform object
          if (typeof levelCell.backgroundTexture === 'string' || !levelCell.backgroundTexture) {
            levelCell.backgroundTexture = modCell.backgroundTexture;
          }
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
    await overlays.init();
    overlays.applyOverlays(this.grid);

    this.blockedAreaManager = new BlockedAreaManager(
      this.levelData.blockedAreas ?? [], this.grid
    );
    this.grid.setBlockedAreaManager(this.blockedAreaManager);

    const levelWidth = level.width * this.grid.cellSize;
    const levelHeight = level.height * this.grid.cellSize;
    const viewportWidth = this.cameras.main.width;
    const viewportHeight = this.cameras.main.height;

    // Center small levels on screen
    if (levelWidth < viewportWidth || levelHeight < viewportHeight) {
      const offsetX = levelWidth < viewportWidth ? (viewportWidth - levelWidth) / 2 : 0;
      const offsetY = levelHeight < viewportHeight ? (viewportHeight - levelHeight) / 2 : 0;

      this.cameras.main.setBounds(
        -offsetX,
        -offsetY,
        Math.max(levelWidth, viewportWidth),
        Math.max(levelHeight, viewportHeight)
      );
    } else {
      this.cameras.main.setBounds(
        CAMERA_BOUNDS_INSET_X_PX,
        CAMERA_BOUNDS_INSET_Y_PX,
        levelWidth - CAMERA_BOUNDS_INSET_X_PX,
        levelHeight - CAMERA_BOUNDS_INSET_Y_PX
      );
    }

    // Set camera zoom - HUD scene is separate so this won't affect touch
    this.cameras.main.setZoom(CAMERA_ZOOM);

    this.entityLoader = new EntityLoader(
      this,
      this.grid,
      this.entityManager,
      this.eventManager,
      this.entityCreatorManager,
      (targetLevel, targetCol, targetRow) => {
        this.startLevelTransition(targetLevel, targetCol, targetRow);
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

    // Fade in after level loads (skip in editor mode - scene is paused)
    if (!this.isEditorMode) {
      this.cameras.main.fadeIn(500, 0, 0, 0);

      // Fade in background and vignette after camera fade completes
      this.cameras.main.once('camerafadeincomplete', () => {
        if (this.background) {
          this.tweens.add({
            targets: this.background,
            alpha: 1,
            duration: 300,
            ease: 'Linear'
          });
        }
        if (this.vignette) {
          // Fade to original alpha based on theme
          const targetAlpha = this.levelData.levelTheme === 'grass' ? 0.25 :
                             this.levelData.levelTheme === 'swamp' ? 0.3 :
                             this.levelData.levelTheme === 'wilds' ? 0.3 : 0.2;
          this.tweens.add({
            targets: this.vignette,
            alpha: targetAlpha,
            duration: 300,
            ease: 'Linear'
          });
        }
      });
    } else {
      if (this.background) this.background.setAlpha(1);
      if (this.vignette) {
        const targetAlpha = this.levelData.levelTheme === 'grass' ? 0.25 :
                           this.levelData.levelTheme === 'swamp' ? 0.3 :
                           this.levelData.levelTheme === 'wilds' ? 0.3 : 0.2;
        this.vignette.setAlpha(targetAlpha);
      }
    }

    this.eventManager.raiseEvent('level_loaded');
  }

  async resetScene(): Promise<void> {
    if (this.isResetting) {
      console.log('[GameScene] Already resetting, skipping');
      return;
    }

    console.log('[GameScene] resetScene called from:', new Error().stack);
    this.isResetting = true;
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

    await this.initializeScene();

    if (wasGridDebugEnabled) {
      this.grid.setGridDebugEnabled(true);
    }

    this.isResetting = false;
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
      eventManager: this.eventManager,
      vignetteSprite: this.vignette,
      initialHealth: playerHealth,
      levelData: () => this.levelData,
      blockedAreaManager: this.blockedAreaManager,
    }));

    // Initialize PetManager
    void this.initializePetManager(player);

    // Load entities from new format
    this.entityLoader.loadEntities(level, player, this.isEditorMode);
  }

  private async initializePetManager(player: Entity): Promise<void> {
    const { PetManager } = await import('../systems/PetManager');
    const petManager = PetManager.getInstance();
    await petManager.initialize(this, this.grid, player);
  }


  update(_time: number, delta: number): void {
    // Skip all gameplay in editor mode
    if (this.isEditorMode) {
      if (this.sceneRenderer) this.sceneRenderer.update(delta);
      return;
    }
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

  getEntityLoader(): EntityLoader {
    return this.entityLoader;
  }

  getSceneRenderer(): GameSceneRenderer {
    return this.sceneRenderer;
  }

  public startInteraction(scriptContent: string, filename?: string, npcId?: string): void {
    this.stateMachine.enter('interaction', { scriptContent, filename, npcId });
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
      this.sceneRenderer = new WildsSceneRenderer(this, this.cellSize, this.levelData.mistConfig);
    } else if (theme === 'default') {
      this.sceneRenderer = new DefaultSceneRenderer(this, this.cellSize);
    }

    const rendered = this.sceneRenderer.renderTheme(this.levelData.width, this.levelData.height);
    this.background = rendered.background;
    this.vignette = rendered.vignette;

    this.grid.render();
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

    this.startLevelTransition(this.currentLevelName, spawnCol, spawnRow);
  }

  startLevelTransition(targetLevel: string, spawnCol: number, spawnRow: number): void {
    console.log('[DBGAME] Transition to:', targetLevel);
    const worldState = WorldStateManager.getInstance();
    const player = this.entityManager.getFirst('player');
    if (player) {
      const health = player.get(HealthComponent);
      if (health && health.getHealth() > 0) {
        worldState.setPlayerHealth(health.getHealth());
      }

      const input = player.get(InputComponent);
      if (input) {
        input.setEnabled(false);
      }
    }

    worldState.updateModifiedCells(this.currentLevelName, this.grid, this.levelData);
    worldState.updateTimePlayed();
    worldState.setCurrentLevel(targetLevel);
    worldState.setPlayerSpawnPosition(spawnCol, spawnRow);
    void worldState.saveToFile();

    // Save entity manager for cleanup BEFORE fade
    console.log('[DBGAME] Saving', this.entityManager.count, 'entities for cleanup');
    GameScene.previousEntityManager = this.entityManager;

    // Fade out, then start transition
    console.log('[DBGAME] Starting fade out');
    this.cameras.main.fadeOut(500, 0, 0, 0);

    // Use timeout instead of callback (more reliable)
    this.time.delayedCall(500, () => {
      console.log('[DBGAME] Fade complete (timeout), starting LoadingScene');
      this.scene.start('LoadingScene', {
        targetLevel,
        targetCol: spawnCol,
        targetRow: spawnRow,
        previousLevel: this.currentLevelName
      });
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


  getCurrentLevelName(): string {
    return this.currentLevelName;
  }

  private createEditorPlayer(): Entity {
    // Minimal player entity for editor mode (no input, no HUD, just position)
    const player = new Entity('player');
    const startX = this.grid.cellSize * this.levelData.playerStart.x + this.grid.cellSize / 2;
    const startY = this.grid.cellSize * this.levelData.playerStart.y + this.grid.cellSize / 2;
    player.add(new TransformComponent(startX, startY));
    this.entityManager.add(player);
    return player;
  }
}
