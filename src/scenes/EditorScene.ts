import Phaser from "phaser";
import { Grid } from "../systems/grid/Grid";
import { LevelLoader, type LevelData, type LevelTheme, normalizeBgTextures, bgTextureKey } from "../systems/level/LevelLoader";
import { EntityManager } from "../ecs/EntityManager";
import { NPCIdleComponent } from "../ecs/entities/npc/NPCIdleComponent";
import { Entity } from "../ecs/Entity";
import { EntityCreatorManager } from "../systems/EntityCreatorManager";
import { EntityLoader } from "../systems/EntityLoader";
import { SpriteComponent } from "../ecs/components/core/SpriteComponent";
import { TransformComponent } from "../ecs/components/core/TransformComponent";
import { preloadAssets, preloadLevelAssets, preloadAssetGroups } from "../assets/AssetLoader";
import { TunnelsSceneRenderer } from "./theme/TunnelsSceneRenderer";
import { PaintRenderer } from "./theme/PaintRenderer";
import type { GameSceneRenderer } from "./theme/GameSceneRenderer";
import { createThemeRenderer } from "./theme/ThemeRendererFactory";
import { EventManagerSystem } from "../ecs/systems/EventManagerSystem";
import { CELL_SIZE } from "../constants/GameConstants";

export default class EditorScene extends Phaser.Scene {
  public entityManager!: EntityManager;
  public eventManager!: EventManagerSystem;
  private entityCreatorManager!: EntityCreatorManager;
  private entityLoader!: EntityLoader;
  private grid!: Grid;
  private readonly cellSize: number = CELL_SIZE;
  private levelData!: LevelData;
  private currentLevelName: string = 'house3_interior';
  private sceneRenderer!: GameSceneRenderer;
  private background?: Phaser.GameObjects.Image;
  private vignette?: Phaser.GameObjects.Image;
  private paintRenderer?: PaintRenderer;

  constructor() {
    super({ key: "editor" });
  }

  preload() {
    preloadAssets(this);
  }

  async create(data?: { levelName?: string; levelData?: LevelData }) {
    this.currentLevelName = data?.levelName ?? this.currentLevelName;

    try {
      try {
        if (data?.levelData) {
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

      this.initializeManagers();

      preloadAssets(this);
      preloadAssetGroups(this, ['editor', 'stalking_robot', 'bug_base', 'thrower', 'skeleton', 'puma', 'bullet_dude', 'breakables', 'beetle']);
      preloadLevelAssets(this, this.levelData);
      await this.waitForLoad();
      await this.loadPaintAsync();

      this.setupThemeRenderer();

      this.grid = new Grid(this, this.levelData.width, this.levelData.height, this.cellSize, true);
      for (const cell of this.levelData.cells) {
        const textures = normalizeBgTextures(cell.backgroundTexture);
        const bgTexture = textures ? bgTextureKey(textures[0]) : undefined;
        this.grid.setCell(cell.col, cell.row, {
          layer: cell.layer ?? 0,
          properties: new Set(cell.properties ?? []),
          backgroundTexture: bgTexture
        });
      }

      this.sceneRenderer.initializeSprites(this.grid, this.levelData);
      this.initializePaint();
      this.grid.render();
      this.grid.setGridDebugEnabled(true);
      this.sceneRenderer.updateGraphics(this.grid, this.levelData);

      // Free camera for editor
      this.cameras.main.setBounds(-10000, -10000, 20000, 20000);
      this.cameras.main.setZoom(1);

      // Spawn entities (all immediately, no events, no player input)
      const editorPlayer = this.createEditorPlayer();
      const noopTransition = (_level: string, _col: number, _row: number): void => { /* editor: no transitions */ };
      this.entityLoader = new EntityLoader(
        this, this.grid, this.entityManager, this.eventManager,
        this.entityCreatorManager,
        noopTransition
      );
      this.entityLoader.loadEntities(this.levelData, editorPlayer, true);

      this.forceEditorSpritesVisible();

    } catch (e) {
      console.error('[Editor] Scene init failed:', e);
      if (!this.entityManager) this.entityManager = new EntityManager();
      if (!this.eventManager) this.eventManager = new EventManagerSystem();
      if (!this.grid) this.grid = new Grid(this, 10, 10, this.cellSize, true);
      if (!this.sceneRenderer) this.sceneRenderer = createThemeRenderer(this, this.cellSize, 'dungeon');
    }

    // Notify bridge
    const { EditorBridge } = await import('../../editor/EditorBridge');
    const bridge = EditorBridge.getInstance();
    bridge.setScene(this);
    bridge.notifySceneReady();
  }

  update(_time: number, delta: number): void {
    if (this.sceneRenderer) this.sceneRenderer.update(delta);
  }

  // ── Public API (used by EditorBridge) ──────────────────────

  getGrid(): Grid { return this.grid; }
  getEntityManager(): EntityManager { return this.entityManager; }
  getLevelData(): LevelData { return this.levelData; }
  getSceneRenderer(): GameSceneRenderer { return this.sceneRenderer; }
  getEntityLoader(): EntityLoader { return this.entityLoader; }
  getCurrentLevelName(): string { return this.currentLevelName; }

  renderGrid(grid: Grid, levelData?: LevelData): void {
    this.sceneRenderer.updateGraphics(grid, levelData);
  }

  refreshSprites(): void {
    this.sceneRenderer.reinitializeSprites(this.grid, this.levelData);
    this.sceneRenderer.updateGraphics(this.grid, this.levelData);
  }

  refreshPaint(): void {
    this.initializePaint();
  }

  destroyPaintImage(): void {
    if (this.paintRenderer) {
      this.paintRenderer.destroy();
    }
  }

  setTheme(theme: 'dungeon' | 'swamp' | 'grass' | 'wilds' | 'tunnels'): void {
    this.levelData.levelTheme = theme;

    if (this.background) this.background.destroy();
    if (this.vignette) this.vignette.destroy();
    if (this.sceneRenderer) this.sceneRenderer.destroy();

    this.sceneRenderer = createThemeRenderer(this, this.cellSize, theme, this.levelData.mistConfig);

    const rendered = this.sceneRenderer.renderTheme(this.levelData.width, this.levelData.height);
    this.background = rendered.background;
    this.vignette = rendered.vignette;

    this.grid.render();
  }

  // ── Private Helpers ────────────────────────────────────────

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

  private setupThemeRenderer(): void {
    const theme = this.levelData.levelTheme ?? 'dungeon';
    this.sceneRenderer = createThemeRenderer(this, this.cellSize, theme, this.levelData.mistConfig);

    if (this.sceneRenderer instanceof TunnelsSceneRenderer) {
      this.sceneRenderer.setEditorMode(true);
    }

    this.sceneRenderer.loadAllAssets(this.levelData);

    const rendered = this.sceneRenderer.renderTheme(this.levelData.width, this.levelData.height);
    this.background = rendered.background;
    this.vignette = rendered.vignette;
    if (this.background) this.background.setAlpha(1);
    if (this.vignette) {
      const targetAlpha = theme === 'grass' ? 0.25 : theme === 'swamp' ? 0.3 : theme === 'wilds' ? 0.3 : 0.2;
      this.vignette.setAlpha(targetAlpha);
    }
  }

  private initializePaint(): void {
    if (this.paintRenderer) this.paintRenderer.destroy();
    this.paintRenderer = new PaintRenderer(this);
    const key = PaintRenderer.buildKey(this.currentLevelName);
    this.paintRenderer.render(key, this.levelData.width, this.levelData.height, this.cellSize);
  }

  private async loadPaintAsync(): Promise<void> {
    const key = PaintRenderer.buildKey(this.currentLevelName);
    if (this.textures.exists(key)) {
      this.textures.remove(key);
    }
    const url = `/api/paint?level=${this.currentLevelName}&t=${Date.now()}`;
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

  private createEditorPlayer(): Entity {
    const player = new Entity('player');
    const startX = this.grid.cellSize * this.levelData.playerStart.x + this.grid.cellSize / 2;
    const startY = this.grid.cellSize * this.levelData.playerStart.y + this.grid.cellSize / 2;
    player.add(new TransformComponent(startX, startY));
    this.entityManager.add(player);
    return player;
  }

  private forceEditorSpritesVisible(): void {
    for (const entity of this.entityManager.getAll()) {
      const sprite = entity.get(SpriteComponent);
      if (sprite) {
        sprite.sprite.setAlpha(1);
        if (sprite.sprite.scaleX === 0 || sprite.sprite.scaleY === 0) {
          const fitScale = this.cellSize / Math.max(sprite.sprite.width, sprite.sprite.height);
          sprite.sprite.setScale(fitScale);
        }
      }
      const idle = entity.get(NPCIdleComponent);
      if (idle) idle.update(0);
    }
  }
}
