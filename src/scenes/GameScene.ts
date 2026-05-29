import Phaser from "phaser";
import { Depth } from '../constants/DepthConstants';
import { Grid, type CellProperty } from "../systems/grid/Grid";
import { LevelLoader, type LevelData, normalizeBgTextures, bgTextureKey } from "../systems/level/LevelLoader";
import { EntityManager } from "../ecs/EntityManager";
import { Entity } from "../ecs/Entity";
import { EntityCreatorManager } from "../systems/EntityCreatorManager";
import { EntityLoader } from "../systems/EntityLoader";
import { WorldStateManager } from "../systems/WorldStateManager";
import { WorldFlags } from "../constants/WorldFlags";
import { CompanionManager } from "../systems/CompanionManager";
import { NPCManager } from "../systems/NPCManager";
import type HudScene from "./HudScene";
import { createPlayerEntity } from "../ecs/entities/player/PlayerEntity";
import { EventManagerSystem } from "../ecs/systems/EventManagerSystem";
import { StateMachine } from "../systems/state/StateMachine";
import type { IState } from "../systems/state/IState";
import { InGameState } from "./states/InGameState";
import { InteractionState, type InteractionStateData } from "./states/InteractionState";
import { CELL_SIZE, CAMERA_ZOOM, CAMERA_BOUNDS_INSET_X_PX, CAMERA_BOUNDS_INSET_Y_PX } from "../constants/GameConstants";
import { SpriteComponent } from "../ecs/components/core/SpriteComponent";
import { AnimationComponent } from "../ecs/components/core/AnimationComponent";
import { GridPositionComponent } from "../ecs/components/movement/GridPositionComponent";
import { TransformComponent } from "../ecs/components/core/TransformComponent";
import { HealthComponent } from "../ecs/components/core/HealthComponent";
import { WalkComponent } from "../ecs/components/movement/WalkComponent";
import { Direction } from "../constants/Direction";
import { preloadAssets, preloadLevelAssets } from "../assets/AssetLoader";
import { CollisionSystem } from "../systems/CollisionSystem";
import { SoundManager } from "../systems/SoundManager";
import { MusicManager } from "../systems/MusicManager";
import { TunnelsSceneRenderer } from "./theme/TunnelsSceneRenderer";
import { SceneOverlays } from "../systems/SceneOverlays";
import { PaintRenderer } from "./theme/PaintRenderer";

import type { GameSceneRenderer } from "./theme/GameSceneRenderer";
import { BlockedAreaManager } from "../systems/BlockedAreaManager";
import { createThemeRenderer } from "./theme/ThemeRendererFactory";
import { HoleDropInAnimator } from "../systems/animations/HoleDropInAnimator";
import { EscortSpawnManager } from "../systems/escort/EscortSpawnManager";
import { LevelTransitionManager } from "../systems/LevelTransitionManager";
import { WaterEffectComponent } from "../ecs/components/visual/WaterEffectComponent";

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
  private screenTint?: Phaser.GameObjects.Rectangle;
  private background?: Phaser.GameObjects.Image;
  private sceneRenderer!: GameSceneRenderer;
  public layerDebugText?: Phaser.GameObjects.Text;
  private sceneOverlays?: SceneOverlays;
  private paintRenderer?: PaintRenderer;
  private static hasLoadedFromURL: boolean = false;
  private static hasLoadedWorldState: boolean = false;
  private static previousEntityManager?: EntityManager;
  public isInInteraction: boolean = false;
  private isResetting: boolean = false;
  public blockedAreaManager?: BlockedAreaManager;
  private readonly levelTransitions: LevelTransitionManager = new LevelTransitionManager(this);

  constructor() {
    super({ key: "game" });
  }

  preload() {
    // Load all assets from registry
    preloadAssets(this);
  }

  async create() {
    await this.createGameScene();
  }

  // ── Game Mode ────────────────────────────────────────────────

  private async createGameScene(): Promise<void> {
    // Clear display list from previous scene instance
    this.children.removeAll(true);
    
    // Destroy entities from previous scene instance
    if (GameScene.previousEntityManager) {
      console.log('[DBGAME] Destroying', GameScene.previousEntityManager.count, 'entities from previous scene');
      const worldState = WorldStateManager.getInstance();
      worldState.setTrackDestructions(false);
      GameScene.previousEntityManager.destroyAll();
      worldState.setTrackDestructions(true);
      GameScene.previousEntityManager = undefined;
    }

    this.cameras.main.fadeFrom(0, 0, 0, 0, true);

    // Load world state only on first load
    const worldState = WorldStateManager.getInstance();
    const profileName = (this.scene.settings.data as { profileName?: string })?.profileName;
    if (!GameScene.hasLoadedWorldState || profileName) {
      await worldState.loadFromFile(profileName);
      GameScene.hasLoadedWorldState = true;
    }

    this.initializeManagers();
    NPCManager.getInstance(this);

    // Wait for HudScene to be ready
    if (!this.scene.isActive('HudScene')) {
      this.scene.launch('HudScene');
      await new Promise<void>(resolve => {
        this.scene.get('HudScene').events.once('create', () => resolve());
      });
    }

    this.resolveCurrentLevel(worldState);

    this.levelData = await LevelLoader.load(this.currentLevelName);
    worldState.setFlag(`level_entered_${this.currentLevelName}`, 'true');

    const theme = this.levelData.levelTheme ?? 'dungeon';
    this.sceneRenderer = createThemeRenderer(this, this.cellSize, theme, this.levelData.mistConfig);

    preloadLevelAssets(this, this.levelData);
    await this.waitForLoad();
    await this.loadPaintAsync();
    this.sceneRenderer.loadAllAssets(this.levelData);

    MusicManager.getInstance().play(this, this.levelData.music ?? null);

    this.createRippleAnimation();

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

    this.createDebugText();
    this.registerDebugKeys();
  }

  // ── Shared Helpers ───────────────────────────────────────────

  private initializeManagers(): void {
    this.entityManager = new EntityManager();
    this.eventManager = new EventManagerSystem();
    this.entityManager.setEventManager(this.eventManager);
    this.entityCreatorManager = new EntityCreatorManager(this.entityManager, this.eventManager);
  }

  private async waitForLoad(): Promise<void> {
    this.load.start();
    if (this.load.isLoading()) {
      await new Promise<void>(resolve => { this.load.once('complete', resolve); });
    }
  }

  private resolveCurrentLevel(worldState: WorldStateManager): void {
    const params = new URLSearchParams(globalThis.location.search);
    const levelParam = params.get('level');

    if (levelParam && !GameScene.hasLoadedFromURL) {
      this.currentLevelName = levelParam;
      worldState.setCurrentLevel(levelParam);
      worldState.clearPlayerSpawnPosition();
      GameScene.hasLoadedFromURL = true;
    } else {
      this.currentLevelName = worldState.getCurrentLevelName();
    }
  }

  private createRippleAnimation(): void {
    const rippleKey = this.levelData.background?.water?.rippleSpritesheet ?? 'water_ripple';
    if (!this.anims.exists(`${rippleKey}_anim`)) {
      this.anims.create({
        key: `${rippleKey}_anim`,
        frames: this.anims.generateFrameNumbers(rippleKey, { start: 0, end: 3 }),
        frameRate: 12,
        repeat: 0
      });
    }
  }

  private createDebugText(): void {
    this.layerDebugText = this.add.text(10, 10, '', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 }
    });
    this.layerDebugText.setScrollFactor(0);
    this.layerDebugText.setDepth(Depth.debugText);
    this.layerDebugText.setVisible(false);
  }

  private registerDebugKeys(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;

    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Y).on('down', () => {
      this.saveWorldState();
    });

    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R).on('down', () => {
      const wsm = WorldStateManager.getInstance();
      void wsm.loadFromFile(wsm.getProfileName()).then(() => {
        console.log('[DBGAME] State reloaded from file');
        void this.resetScene();
      });
    });

    keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M).on('down', () => {
      const player = this.entityManager.getFirst('player');
      const health = player?.get(HealthComponent);
      if (health) {
        health.setHealth(health.getMaxHealth());
        console.log('[DBGAME] Player health set to max');
      }
    });
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
    const levelState = worldState.getLevelState(level.name ?? '');

    this.initializeGrid(level, levelState);
    this.initializePaint();
    await this.initializeOverlays();
    this.initializeBlockedAreas();
    this.initializeCamera(level);
    this.initializeEntityLoader();

    // Ensure SoundManager has a game reference (covers ?level= skip-boot path)
    if (!SoundManager.getInstance().isInitialized) {
      void SoundManager.getInstance().initialize(this);
    }

    this.spawnEntities();

    // Snapshot world state at level entry for death/reload reset
    this.levelEntrySnapshot = WorldStateManager.getInstance().serializeToJSON();

    this.initializeCameraFollow();
    this.initializeScreenTint();
    this.initializeFadeIn();

    this.eventManager.raiseEvent('level_loaded');
  }

  private initializeGrid(level: typeof this.levelData, levelState: ReturnType<WorldStateManager['getLevelState']>): void {
    this.grid = new Grid(this, level.width, level.height, this.cellSize, false);

    for (const cell of level.cells) {
      const textures = normalizeBgTextures(cell.backgroundTexture);
      const bgTexture = textures ? bgTextureKey(textures[0]) : undefined;
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
      const levelCell = level.cells.find(c => c.col === modCell.col && c.row === modCell.row);
      if (levelCell) {
        if (modCell.backgroundTexture) {
          if (typeof levelCell.backgroundTexture === 'string' || !levelCell.backgroundTexture) {
            levelCell.backgroundTexture = modCell.backgroundTexture;
          }
        } else {
          delete levelCell.backgroundTexture;
        }
      }
      cellsToInvalidate.push({ col: modCell.col, row: modCell.row });
    }

    if (cellsToInvalidate.length > 0 && this.sceneRenderer) {
      this.sceneRenderer.invalidateCells(cellsToInvalidate);
    }
  }

  private initializePaint(): void {
    if (this.paintRenderer) this.paintRenderer.destroy();
    this.paintRenderer = new PaintRenderer(this);
    const key = PaintRenderer.buildKey(this.currentLevelName);
    this.paintRenderer.render(key, this.levelData.width, this.levelData.height, this.cellSize);
  }

  async loadPaintAsync(): Promise<void> {
    const key = PaintRenderer.buildKey(this.currentLevelName);
    if (this.textures.exists(key)) {
      this.textures.remove(key);
    }
    const isDev = import.meta.env.DEV;
    const url = isDev
      ? `/api/paint?level=${this.currentLevelName}&t=${Date.now()}`
      : `/levels/${this.currentLevelName}_paint.png`;
    try {
      const response = await fetch(url);
      if (!response.ok) return;
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const img = new globalThis.Image();
      await new Promise<void>((resolve) => {
        img.onload = () => {
          if (this.textures.exists(key)) this.textures.remove(key);
          this.textures.addImage(key, img);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = blobUrl;
      });
      URL.revokeObjectURL(blobUrl);
    } catch { /* no paint file */ }
  }

  private async initializeOverlays(): Promise<void> {
    const overlays = new SceneOverlays(this, this.levelData);
    this.sceneOverlays = overlays;
    await overlays.init();
    overlays.applyOverlays(this.grid);
  }

  private initializeBlockedAreas(): void {
    this.blockedAreaManager = new BlockedAreaManager(
      this.levelData.blockedAreas ?? [], this.grid
    );
    this.grid.setBlockedAreaManager(this.blockedAreaManager);
  }

  private initializeCamera(level: typeof this.levelData): void {
    const levelWidth = level.width * this.grid.cellSize;
    const levelHeight = level.height * this.grid.cellSize;
    const viewportWidth = this.cameras.main.width;
    const viewportHeight = this.cameras.main.height;

    if (levelWidth < viewportWidth || levelHeight < viewportHeight) {
      const offsetX = levelWidth < viewportWidth ? (viewportWidth - levelWidth) / 2 : 0;
      const offsetY = levelHeight < viewportHeight ? (viewportHeight - levelHeight) / 2 : 0;
      this.cameras.main.setBounds(-offsetX, -offsetY, Math.max(levelWidth, viewportWidth), Math.max(levelHeight, viewportHeight));
    } else {
      this.cameras.main.setBounds(CAMERA_BOUNDS_INSET_X_PX, CAMERA_BOUNDS_INSET_Y_PX, levelWidth - CAMERA_BOUNDS_INSET_X_PX, levelHeight - CAMERA_BOUNDS_INSET_Y_PX);
    }
    this.cameras.main.setZoom(CAMERA_ZOOM);
  }

  private initializeEntityLoader(): void {
    this.entityLoader = new EntityLoader(
      this, this.grid, this.entityManager, this.eventManager, this.entityCreatorManager,
      (targetLevel, targetCol, targetRow) => { this.startLevelTransition(targetLevel, targetCol, targetRow); }
    );
  }

  private initializeCameraFollow(): void {
    const levelData = this.getLevelData();
    if (levelData.fixedCamera) {
      const grid = this.grid;
      const worldPos = grid.cellToWorld(levelData.fixedCamera.centerCol, levelData.fixedCamera.centerRow);
      this.cameras.main.centerOn(worldPos.x + grid.cellSize / 2, worldPos.y + grid.cellSize / 2);
      return;
    }

    const player = this.entityManager.getFirst('player');
    if (player) {
      const spriteComp = player.get(SpriteComponent);
      if (spriteComp) {
        this.cameras.main.centerOn(spriteComp.sprite.x, spriteComp.sprite.y);
        this.cameras.main.startFollow(spriteComp.sprite, true, 0.1, 0.1);
        if (this.sceneRenderer instanceof TunnelsSceneRenderer) {
          this.sceneRenderer.setPlayerSprite(spriteComp.sprite);
        }
      }
    }
  }

  private initializeScreenTint(): void {
    if (this.screenTint) {
      this.screenTint.destroy();
      this.screenTint = undefined;
    }
    const tintConfig = this.levelData.background?.screenTint;
    if (!tintConfig) return;

    const color = Number.parseInt(tintConfig.color.replace('#', ''), 16);
    const cam = this.cameras.main;
    this.screenTint = this.add.rectangle(cam.width / 2, cam.height / 2, cam.width, cam.height, color);
    this.screenTint.setScrollFactor(0);
    this.screenTint.setDepth(Depth.debugText);
    this.screenTint.setAlpha(tintConfig.alpha);
  }

  private initializeFadeIn(): void {
    this.cameras.main.fadeIn(500, 0, 0, 0);
    this.cameras.main.once('camerafadeincomplete', () => {
      if (this.background) {
        this.tweens.add({ targets: this.background, alpha: 1, duration: 300, ease: 'Linear' });
      }
      if (this.vignette) {
        this.tweens.add({ targets: this.vignette, alpha: this.getVignetteAlpha(), duration: 300, ease: 'Linear' });
      }
    });
  }

  private getVignetteAlpha(): number {
    const theme = this.levelData.levelTheme;
    if (theme === 'grass') return 0.25;
    if (theme === 'swamp' || theme === 'wilds') return 0.3;
    return 0.2;
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
    if (this.paintRenderer) {
      this.paintRenderer.destroy();
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
      getEnemies: () => this.entityManager.getByTag('enemy'),
      entityManager: this.entityManager,
      eventManager: this.eventManager,
      vignetteSprite: this.vignette,
      initialHealth: playerHealth,
      levelData: () => this.levelData,
      blockedAreaManager: this.blockedAreaManager,
    }));

    const savedDir = worldState.getPlayerSpawnDirection();
    if (savedDir !== undefined && savedDir !== Direction.None) {
      const walk = player.get(WalkComponent);
      const anim = player.get(AnimationComponent);
      if (walk) {
        walk.lastDir = savedDir;
        const hasLeft = savedDir === Direction.Left || savedDir === Direction.UpLeft || savedDir === Direction.DownLeft;
        const hasRight = savedDir === Direction.Right || savedDir === Direction.UpRight || savedDir === Direction.DownRight;
        const hasUp = savedDir === Direction.Up || savedDir === Direction.UpLeft || savedDir === Direction.UpRight;
        const hasDown = savedDir === Direction.Down || savedDir === Direction.DownLeft || savedDir === Direction.DownRight;
        walk.lastMoveX = hasLeft ? -1 : hasRight ? 1 : 0;
        walk.lastMoveY = hasUp ? -1 : hasDown ? 1 : 0;
      }
      if (anim) {
        anim.animationSystem.play(`idle_${savedDir}`);
      }
    }

    // If spawning on water, enter swimming state immediately (no jump-in animation)
    const spawnCell = this.grid.getCell(
      spawnPos.col ?? level.playerStart.x,
      spawnPos.row ?? level.playerStart.y
    );
    if (spawnCell?.properties.has('water') && !spawnCell.properties.has('bridge')) {
      const waterEffect = player.get(WaterEffectComponent);
      if (waterEffect) {
        waterEffect.enterWaterImmediate();
        const anim = player.get(AnimationComponent);
        const walk = player.get(WalkComponent);
        const dir = walk?.lastDir ?? Direction.Down;
        if (anim) anim.animationSystem.play(`swim_${dir}`);
      }
    }

    // Initialize PetManager
    void this.initializePetManager(player);

    // Initialize CompanionManager
    this.initializeCompanionManager(player);

    // Load entities from new format
    this.entityLoader.loadEntities(level, player, false);

    // Spawn cross-level escorts
    const escortManager = new EscortSpawnManager(this, this.grid, this.entityManager, this.eventManager);
    escortManager.spawnCrossLevelEscort(player, this.currentLevelName, this.levelData.playerStart.x, this.levelData.playerStart.y);
    escortManager.spawnCompletedEscorts(player, this.currentLevelName);

    // Hole drop-in sequence
    const worldState2 = WorldStateManager.getInstance();
    if (worldState2.isFlagTrue(WorldFlags.enteredViaHole)) {
      new HoleDropInAnimator(this, this.entityManager).play(player, startX, startY);
    }
  }

  private async initializePetManager(player: Entity): Promise<void> {
    const { PetManager } = await import('../systems/PetManager');
    const petManager = PetManager.getInstance();
    petManager.initialize(this, this.grid, player);
  }

  private initializeCompanionManager(player: Entity): void {
    CompanionManager.getInstance().initialize(this, this.entityManager, player);
  }


  update(_time: number, delta: number): void {
    // Wait for async create to finish
    if (!this.entityManager || !this.grid || !this.stateMachine) return;

    // Update state machine (delegates to InGameState)
    this.stateMachine.update(delta);

    // Update scene renderer (water animation + dynamic Z)
    const player = this.entityManager.getFirst('player');
    const playerTransform = player?.get(TransformComponent);
    this.sceneRenderer.update(delta, playerTransform?.y);

    // Update layer debug text
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

  /** Read the world state snapshot taken at level entry — used by LevelTransitionManager to restore on reload. */
  getLevelEntrySnapshot(): string | null {
    return this.levelEntrySnapshot;
  }

  /** Hand off the current entity manager to the next scene for cleanup. */
  savePreviousEntityManager(manager: EntityManager): void {
    GameScene.previousEntityManager = manager;
  }

  refreshPaint(): void {
    this.initializePaint();
  }

  destroyPaintImage(): void {
    if (this.paintRenderer) {
      this.paintRenderer.destroy();
    }
  }

  public startInteraction(scriptContent: string, filename?: string, npcId?: string): void {
    this.stateMachine.enter('interaction', { scriptContent, filename, npcId });
  }

  setTheme(theme: 'dungeon' | 'swamp' | 'grass' | 'wilds' | 'tunnels'): void {
    this.levelData.levelTheme = theme;

    if (this.background) this.background.destroy();
    if (this.vignette) this.vignette.destroy();
    if (this.screenTint) this.screenTint.destroy();
    if (this.sceneRenderer) {
      this.sceneRenderer.destroy();
    }

    this.sceneRenderer = createThemeRenderer(this, this.cellSize, theme, this.levelData.mistConfig);

    const rendered = this.sceneRenderer.renderTheme(this.levelData.width, this.levelData.height);
    this.background = rendered.background;
    this.vignette = rendered.vignette;

    this.grid.render();
  }

  reloadCurrentLevel(): void {
    this.levelTransitions.reload();
  }

  startLevelTransition(targetLevel: string, spawnCol: number, spawnRow: number): void {
    this.levelTransitions.start(targetLevel, spawnCol, spawnRow);
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


  // --- Escort Cross-Level Spawning ---

  getCurrentLevelName(): string {
    return this.currentLevelName;
  }

}
