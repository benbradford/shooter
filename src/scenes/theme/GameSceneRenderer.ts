import type { GridReader } from '../../systems/grid/Grid';
import type { LevelCell, LevelData } from '../../systems/level/LevelLoader';
import { normalizeBgTextures } from '../../systems/level/LevelLoader';
import type { CellProperty } from '../../systems/grid/CellData';
import { Depth } from '../../constants/DepthConstants';
import { WaterAnimator, type WaterConfig } from './WaterAnimator';
import { PathTilesetGenerator } from './PathTilesetGenerator';
import { AssetManager } from '../../systems/AssetManager';
import { TextureVerifier } from '../../systems/TextureVerifier';

// Edge rendering
const EDGE_THICKNESS_PX = 4;

// Shadow rendering
const SHADOW_WIDTH_PX = 64;
const SHADOW_STEPS = 32;
const SHADOW_INTENSITY = 0.45;

// Edge darkening
const DARKENING_STEPS_PER_CELL = 4;
const DARKENING_MIN_ALPHA = 0.01;

// Path / water rendering
const PATH_RADIUS_FACTOR = 0.4;
const PATH_FILL_COLOR = 0x888888;
const WATER_FILL_COLOR = 0x4488ff;
const PATH_OUTLINE_COLOR = 0x000000;
const PATH_OUTLINE_WIDTH_PX = 2;
const PATH_OUTLINE_STROKE_WIDTH_PX = 3;

// Floor overlay gradient
const OVERLAY_GRADIENT_STOP_1 = 0;
const OVERLAY_GRADIENT_STOP_2 = 0.4;
const OVERLAY_GRADIENT_STOP_3 = 0.7;
const OVERLAY_GRADIENT_STOP_4 = 1;
const OVERLAY_GRADIENT_ALPHA = 0.2;

// Stairs fallback rendering
const STAIRS_LINE_WIDTH_PX = 8;
const STAIRS_STEP_COUNT = 5;
const STAIRS_BRIGHTNESS_RANGE = 0.5;
const STAIRS_BASE_COLOR = 0x4a4a5e;
const STAIRS_COLOR_OFFSET = 0x202020;
const STAIRS_STEP_LINE_WIDTH_PX = 2;

// Wall fallback rendering
const WALL_BRICK_HEIGHT_PX = 10;
const WALL_BRICKS_PER_ROW = 3;
const WALL_MORTAR_GAP_PX = 2;
const WALL_BRICK_COLOR = 0x3a3a4e;

// Platform fallback rendering
const PLATFORM_FALLBACK_ALPHA = 0.3;

// Tile autotiling frame indices
const TILE_SINGLE_NEIGHBOR_FRAME: Record<string, number> = {
  up: 1, right: 2, down: 3, left: 4
};
const TILE_FRAME_VERTICAL = 5;
const TILE_FRAME_HORIZONTAL = 6;
const TILE_CORNER_UP_RIGHT = 7;
const TILE_CORNER_UP_RIGHT_DIAG = 8;
const TILE_CORNER_UP_LEFT = 9;
const TILE_CORNER_UP_LEFT_DIAG = 10;
const TILE_CORNER_DOWN_RIGHT = 11;
const TILE_CORNER_DOWN_RIGHT_DIAG = 12;
const TILE_CORNER_DOWN_LEFT = 13;
const TILE_CORNER_DOWN_LEFT_DIAG = 14;
const TILE_THREE_NEIGHBOR_BASE_NO_LEFT = 15;
const TILE_THREE_NEIGHBOR_BASE_NO_DOWN = 19;
const TILE_THREE_NEIGHBOR_BASE_NO_RIGHT = 23;
const TILE_THREE_NEIGHBOR_BASE_NO_UP = 27;
const TILE_FOUR_NEIGHBOR_BASE = 31;

export abstract class GameSceneRenderer {
  protected readonly graphics: Phaser.GameObjects.Graphics;
  protected readonly edgeGraphics: Phaser.GameObjects.Graphics;
  private floorOverlay: Phaser.GameObjects.Image | null = null;
  private readonly floorSprites: Phaser.GameObjects.Image[] = [];
  private readonly cellSprites: Array<Phaser.GameObjects.Image | Phaser.GameObjects.Sprite | Phaser.GameObjects.TileSprite> = [];
  private readonly renderedCellTextures: Map<string, Phaser.GameObjects.Image[]> = new Map();
  private spritesInitialized: boolean = false;
  private readonly waterSprites: Array<Phaser.GameObjects.Sprite | Phaser.GameObjects.TileSprite> = [];
  private waterAnimator: WaterAnimator | null = null;

  constructor(protected readonly scene: Phaser.Scene, protected readonly cellSize: number) {
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(Depth.rendererGraphics);
    this.edgeGraphics = scene.add.graphics();
    this.edgeGraphics.setDepth(Depth.edgeGraphics);
  }

  async loadAllAssets(levelData: LevelData): Promise<void> {
    await this.prepareRuntimeTilesets(levelData);
  }

  update(delta: number): void {
    if (this.waterAnimator) {
      this.waterAnimator.update(delta, this.waterSprites);
    }
  }

  protected addImage(x: number, y: number, texture: string): Phaser.GameObjects.Image {
    const img = this.scene.add.image(x, y, texture);
    if (img.texture.key === '__MISSING') {
      console.error(`[GameSceneRenderer] Created __MISSING sprite for texture: ${texture}`, new Error("Missing texture").stack);
    }
    return img;
  }

  abstract renderTheme(width: number, height: number): { background: Phaser.GameObjects.Image; vignette: Phaser.GameObjects.Image };
  protected abstract getEdgeColor(): number;

  private async initializeWaterAnimation(waterConfig: WaterConfig): Promise<void> {
    this.waterAnimator = new WaterAnimator(this.scene, waterConfig);
    await this.waterAnimator.generateTextures();
  }

  async prepareRuntimeTilesets(levelData: LevelData): Promise<{ success: boolean; failed: string[] }> {
    const failed: string[] = [];

    if (levelData.background?.water) {
      const sourceKey = levelData.background.water.sourceImage;
      if (!TextureVerifier.verifyTexture(this.scene, sourceKey)) {
        failed.push(`water_source:${sourceKey}`);
      } else {
        await this.initializeWaterAnimation(levelData.background.water);
      }
    }

    if (levelData.background?.path_texture) {
      const sourceKey = levelData.background.path_texture;
      if (!TextureVerifier.verifyTexture(this.scene, sourceKey)) {
        failed.push(`path_source:${sourceKey}`);
      } else {
        const generator = new PathTilesetGenerator(this.scene);
        const tilesetKey = `${sourceKey}_generated_tileset`;
        const success = generator.generateTileset(sourceKey, tilesetKey);
        console.log('[GameSceneRenderer] Path tileset generated:', tilesetKey, 'success:', success);

        if (!success) {
          failed.push(tilesetKey);
        } else if (!TextureVerifier.verifyTexture(this.scene, tilesetKey)) {
          failed.push(`${tilesetKey}:verification`);
        }
      }
    }

    return { success: failed.length === 0, failed };
  }

  initializeSprites(grid: GridReader, levelData: LevelData): void {
    if (this.spritesInitialized) {
      return;
    }

    this.createFloorSprites(grid, levelData);
    this.createBackgroundTextureSprites(grid, levelData);
    this.createWaterAndPathTileSprites(grid, levelData);
    this.createPlatformStairsWallSprites(grid, levelData);
    this.createFloorOverlay(grid, levelData);

    this.spritesInitialized = true;
  }

  reinitializeSprites(grid: GridReader, levelData: LevelData): void {
    this.invalidateCache();
    this.spritesInitialized = false;
    this.initializeSprites(grid, levelData);
  }

  updateGraphics(grid: GridReader, levelData?: LevelData): void {
    this.graphics.clear();
    this.edgeGraphics.clear();

    if (levelData?.background?.hasEdges !== false) {
      this.renderEdges(grid);
    }

    this.renderEdgeDarkening(grid, levelData);

    if (levelData?.background?.hasShadows !== false) {
      this.renderShadows(grid);
    }

    if (!levelData?.background?.path_texture && !levelData?.background?.water_texture) {
      this.renderGreyPaths(grid);
    }
  }

  private createFloorSprites(grid: GridReader, levelData: LevelData): void {
    if (!levelData.background?.floor_texture) {
      return;
    }

    const texture = levelData.background.floor_texture;
    const chunkSize = levelData.background.floor_tile;

    if (chunkSize) {
      for (let row = 0; row < grid.height; row += chunkSize) {
        for (let col = 0; col < grid.width; col += chunkSize) {
          const x = col * this.cellSize;
          const y = row * this.cellSize;
          const width = Math.min(chunkSize, grid.width - col) * this.cellSize;
          const height = Math.min(chunkSize, grid.height - row) * this.cellSize;

          const sprite = this.addImage(x + width / 2, y + height / 2, texture);
          sprite.setDisplaySize(width, height);
          sprite.setDepth(Depth.floor);
          sprite.setAlpha(levelData.background.floorAlpha ?? 1);
          this.floorSprites.push(sprite);
        }
      }
    } else {
      const width = grid.width * this.cellSize;
      const height = grid.height * this.cellSize;
      const sprite = this.addImage(width / 2, height / 2, texture);
      sprite.setDisplaySize(width, height);
      sprite.setDepth(Depth.floor);
      sprite.setAlpha(levelData.background.floorAlpha ?? 1);
      this.floorSprites.push(sprite);
    }

    if (levelData.background.platform_tile && levelData.background.platform_texture) {
      const platformTileSize = levelData.background.platform_tile;
      const platformTexture = levelData.background.platform_texture;

      for (let row = 0; row < grid.height; row += platformTileSize) {
        for (let col = 0; col < grid.width; col += platformTileSize) {
          let hasPlatform = false;
          for (let r = row; r < Math.min(row + platformTileSize, grid.height); r++) {
            for (let c = col; c < Math.min(col + platformTileSize, grid.width); c++) {
              if (grid.getCell(c, r)?.properties.has('platform')) {
                hasPlatform = true;
                break;
              }
            }
            if (hasPlatform) break;
          }

          if (hasPlatform) {
            const x = col * this.cellSize;
            const y = row * this.cellSize;
            const width = platformTileSize * this.cellSize;
            const height = platformTileSize * this.cellSize;

            const sprite = this.addImage(x + width / 2, y + height / 2, platformTexture);
            sprite.setDisplaySize(width, height);
            sprite.setDepth(Depth.stairs);
            this.floorSprites.push(sprite);
          }
        }
      }
    }
  }

  private createWaterAndPathTileSprites(grid: GridReader, levelData: LevelData): void {
    this.renderAllCells(grid, levelData);
  }

  refreshBackgroundTextureSprites(grid: GridReader, levelData: LevelData): void {
    this.createBackgroundTextureSprites(grid, levelData);
  }

  private createBackgroundTextureSprites(grid: GridReader, levelData: LevelData): void {
    if (!levelData.cells) {
      return;
    }

    for (const cell of levelData.cells) {
      const key = `${cell.col},${cell.row}`;
      const animKey = `${key}_anim`;

      // Handle static background texture(s)
      const textures = normalizeBgTextures(cell.backgroundTexture);
      if (textures && !this.renderedCellTextures.has(key)) {
        const cellData = grid.getCell(cell.col, cell.row);
        const isWater = cellData?.properties.has('water') ?? false;
        const isBridge = cellData?.properties.has('bridge') ?? false;
        const baseDepth = isBridge ? Depth.stairs : isWater ? Depth.waterTexture : Depth.cellTextureModified;
        const cellX = cell.col * this.cellSize;
        const cellY = cell.row * this.cellSize;
        const centerX = cellX + this.cellSize / 2;
        const centerY = cellY + this.cellSize / 2;
        const sprites: Phaser.GameObjects.Image[] = [];

        for (const tex of textures) {
          let textureName: string;
          let transform: { scaleX: number; scaleY: number; offsetX: number; offsetY: number } | undefined;
          let sourceRect: { x: number; y: number; width: number; height: number } | undefined;
          let zOffsetOverride: number | undefined;

          if (typeof tex === 'string') {
            textureName = tex;
          } else {
            textureName = tex.image;
            transform = tex.transformOverride;
            sourceRect = tex.sourceRect;
            zOffsetOverride = tex.zOffsetOverride;
          }

          if (textureName === '') continue;

          const spriteX = transform ? centerX + transform.offsetX : centerX;
          const spriteY = transform ? centerY + transform.offsetY : centerY;

          let sprite: Phaser.GameObjects.Image;
          if (sourceRect && this.scene.textures.exists(textureName)) {
            const frameName = `${textureName}_${sourceRect.x}_${sourceRect.y}_${sourceRect.width}_${sourceRect.height}`;
            const texture = this.scene.textures.get(textureName);
            if (!texture.has(frameName)) {
              texture.add(frameName, 0, sourceRect.x, sourceRect.y, sourceRect.width, sourceRect.height);
            }
            sprite = this.scene.add.image(spriteX, spriteY, textureName, frameName);
          } else {
            sprite = this.addImage(spriteX, spriteY, textureName);
          }

          if (transform) {
            sprite.setDisplaySize(this.cellSize * transform.scaleX, this.cellSize * transform.scaleY);
          } else {
            sprite.setDisplaySize(this.cellSize, this.cellSize);
          }

          let depth = baseDepth;
          if (zOffsetOverride !== undefined) depth += zOffsetOverride;
          sprite.setDepth(depth);

          this.cellSprites.push(sprite);
          sprites.push(sprite);
        }

        if (sprites.length > 0) {
          this.renderedCellTextures.set(key, sprites);
        }
      }

      // Handle animated texture (can coexist with backgroundTexture)
      if (cell.animatedTexture) {
        if (this.renderedCellTextures.has(animKey)) {
          continue;
        }

        const config = cell.animatedTexture;

        // Check if texture exists and has valid frames
        if (!this.scene.textures.exists(config.spritesheet)) {
          continue;
        }

        const texture = this.scene.textures.get(config.spritesheet);
        if (texture.frameTotal <= 1) {
          continue;
        }

        const firstFrame = texture.get(0);
        if (!firstFrame?.source?.glTexture) {
          continue;
        }

        const transform = config.transformOverride;
        const x = cell.col * this.cellSize;
        const y = cell.row * this.cellSize;
        const centerX = x + this.cellSize / 2;
        const centerY = y + this.cellSize / 2;
        const spriteX = transform ? centerX + transform.offsetX : centerX;
        const spriteY = transform ? centerY + transform.offsetY : centerY;

        const animSprite = this.scene.add.sprite(spriteX, spriteY, config.spritesheet, 0);
        if (transform) {
          animSprite.setDisplaySize(this.cellSize * transform.scaleX, this.cellSize * transform.scaleY);
        } else {
          animSprite.setDisplaySize(this.cellSize, this.cellSize);
        }
        animSprite.setDepth(Depth.cellTextureModified + 1);

        // Create animation if it doesn't exist
        const animationKey = `${config.spritesheet}_anim`;
        if (!this.scene.anims.exists(animationKey)) {
          this.scene.anims.create({
            key: animationKey,
            frames: this.scene.anims.generateFrameNumbers(config.spritesheet, {
              start: 0,
              end: config.frameCount - 1
            }),
            frameRate: config.frameRate,
            repeat: -1
          });

          // Register dependency
          const assetManager = AssetManager.getInstance();
          assetManager.registerDependency(config.spritesheet, 'animation', animationKey);
        }

        // Start at random frame and play
        const randomFrame = Math.floor(Math.random() * config.frameCount);
        animSprite.setFrame(randomFrame);
        animSprite.play(animationKey);

        this.cellSprites.push(animSprite);
        this.renderedCellTextures.set(animKey, [animSprite]);
      }
    }
  }

  private createPlatformStairsWallSprites(_grid: GridReader, _levelData: LevelData): void {
    // Already handled in renderAllCells
  }

  private createFloorOverlay(grid: GridReader, levelData: LevelData): void {
    if (!levelData.background || this.floorOverlay) {
      return;
    }
    // Skip overlay for default/interior themes
    if (levelData.levelTheme === 'default' || levelData.levelTheme === 'dungeon') {
      return;
    }
    this.renderFloorOverlay(grid, levelData);
  }

  destroy(): void {
    this.graphics.clear();
    this.graphics.destroy();
    this.edgeGraphics.clear();
    this.edgeGraphics.destroy();
    if (this.floorOverlay) {
      this.floorOverlay.destroy();
      this.floorOverlay = null;
    }
    for (const sprite of this.floorSprites) {
      sprite.destroy();
    }
    this.floorSprites.length = 0;
    for (const sprite of this.cellSprites) {
      sprite.destroy();
    }
    this.cellSprites.length = 0;
    for (const sprite of this.waterSprites) {
      sprite.destroy();
    }
    this.waterSprites.length = 0;
    if (this.waterAnimator) {
      this.waterAnimator.destroy();
      this.waterAnimator = null;
    }
    for (const sprites of this.renderedCellTextures.values()) {
      for (const s of sprites) s.destroy();
    }
    this.renderedCellTextures.clear();
    this.spritesInitialized = false;
  }

  invalidateCache(): void {
    console.log('[GameSceneRenderer] Invalidating cache - destroying', this.cellSprites.length, 'sprites');
    for (const sprite of this.cellSprites) {
      sprite.destroy();
    }
    this.cellSprites.length = 0;
    for (const sprites of this.renderedCellTextures.values()) {
      for (const s of sprites) s.destroy();
    }
    this.renderedCellTextures.clear();
  }

  invalidateCells(cells: Array<{ col: number; row: number }>): void {
    const FADE_DURATION_MS = 500;

    for (const cell of cells) {
      const key = `${cell.col},${cell.row}`;
      const cellTextures = this.renderedCellTextures.get(key);
      if (cellTextures) {
        for (const tex of cellTextures) {
          this.scene.tweens.add({
            targets: tex,
            alpha: 0,
            duration: FADE_DURATION_MS,
            onComplete: () => { tex.destroy(); }
          });
        }
        this.renderedCellTextures.delete(key);
      }

      const index = this.cellSprites.findIndex(sprite => {
        const spriteX = sprite.x - this.cellSize / 2;
        const spriteY = sprite.y - this.cellSize / 2;
        const col = Math.round(spriteX / this.cellSize);
        const row = Math.round(spriteY / this.cellSize);
        return col === cell.col && row === cell.row;
      });

      if (index >= 0) {
        const sprite = this.cellSprites[index];
        this.scene.tweens.add({
          targets: sprite,
          alpha: 0,
          duration: FADE_DURATION_MS,
          onComplete: () => {
            sprite.destroy();
          }
        });
        this.cellSprites.splice(index, 1);
      }
    }

    // Destroy floor/platform sprites that overlap modified cells
    for (let i = this.floorSprites.length - 1; i >= 0; i--) {
      const sprite = this.floorSprites[i];
      const sx = sprite.x - sprite.displayWidth / 2;
      const sy = sprite.y - sprite.displayHeight / 2;
      const sw = sprite.displayWidth;
      const sh = sprite.displayHeight;

      const overlaps = cells.some(cell => {
        const cx = cell.col * this.cellSize;
        const cy = cell.row * this.cellSize;
        return cx >= sx && cx < sx + sw && cy >= sy && cy < sy + sh;
      });

      if (overlaps && sprite.depth === Depth.stairs) {
        this.scene.tweens.add({
          targets: sprite,
          alpha: 0,
          duration: FADE_DURATION_MS,
          onComplete: () => { sprite.destroy(); }
        });
        this.floorSprites.splice(i, 1);
      }
    }
  }

  private renderFloorOverlay(grid: GridReader, _levelData: LevelData): void {
    const worldWidth = grid.width * this.cellSize;
    const worldHeight = grid.height * this.cellSize;

    if (this.scene.textures.exists('floor_gradient_overlay')) {
      this.scene.textures.remove('floor_gradient_overlay');
    }

    const canvas = this.scene.textures.createCanvas('floor_gradient_overlay', worldWidth, worldHeight);
    const ctx = canvas?.context;
    if (!ctx) return;

    const centerX = worldWidth / 2;
    const centerY = worldHeight / 2;
    const maxRadius = Math.hypot(centerX, centerY);

    const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
    bgGradient.addColorStop(OVERLAY_GRADIENT_STOP_1, `rgba(146, 151, 84, ${OVERLAY_GRADIENT_ALPHA})`);
    bgGradient.addColorStop(OVERLAY_GRADIENT_STOP_2, `rgba(163, 170, 132, ${OVERLAY_GRADIENT_ALPHA})`);
    bgGradient.addColorStop(OVERLAY_GRADIENT_STOP_3, `rgba(40, 105, 3, ${OVERLAY_GRADIENT_ALPHA})`);
    bgGradient.addColorStop(OVERLAY_GRADIENT_STOP_4, `rgba(163, 104, 2, ${OVERLAY_GRADIENT_ALPHA})`);
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, worldWidth, worldHeight);

    canvas?.refresh();

    this.floorOverlay = this.addImage(0, 0, 'floor_gradient_overlay');
    this.floorOverlay.setOrigin(0, 0);
    this.floorOverlay.setDisplaySize(worldWidth, worldHeight);
    this.floorOverlay.setDepth(Depth.overlay);
    this.floorOverlay.setBlendMode(Phaser.BlendModes.OVERLAY);
  }

  private renderAllCells(grid: GridReader, levelData?: LevelData): void {
    const edgeColor = this.getEdgeColor();
    const hasBackgroundConfig = !!levelData?.background;

    const cellMap = new Map<string, LevelCell>();
    if (levelData?.cells) {
      for (const c of levelData.cells) {
        cellMap.set(`${c.col},${c.row}`, c);
      }
    }

    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.getCell(col, row);
        const isPath = cell?.properties.has('path');
        const isWater = cell?.properties.has('water');
        const x = col * this.cellSize;
        const y = row * this.cellSize;

        if (isPath || isWater) {
          this.renderWaterOrPathTile(grid, levelData, col, row, !!isWater);
        }

        const isStairs = cell?.properties.has('stairs');
        const isElevated = cell && grid.getLayer(cell) >= 1;
        if (isElevated || isStairs) {
          const levelCell = cellMap.get(`${col},${row}`);
          const hasTexture = !!levelCell?.backgroundTexture;
          const isWall = cell?.properties.has('wall');
          const isPlatform = cell?.properties.has('platform');
          this.renderElevatedCell(x, y, levelData, hasBackgroundConfig, isStairs, isWall, isPlatform, hasTexture, edgeColor);
        }

        if (cell?.properties.has('push_lock') && this.scene.textures.exists('push_lock_depression')) {
          const sprite = this.addImage(x + this.cellSize / 2, y + this.cellSize / 2, 'push_lock_depression');
          sprite.setDisplaySize(this.cellSize, this.cellSize);
          sprite.setDepth(Depth.overlay + 1);
          this.cellSprites.push(sprite);
        }
      }
    }

    this.renderUntexturedPaths(grid, levelData?.background?.path_texture);
  }

  private renderWaterOrPathTile(grid: GridReader, levelData: LevelData | undefined, col: number, row: number, isWater: boolean): void {
    let pathTextures: string[] | null = null;
    let texKey: string | undefined;

    if (isWater && levelData?.background?.water) {
      pathTextures = this.waterAnimator?.getTilesetKeys() ?? null;
      texKey = pathTextures?.length ? pathTextures[0] : undefined;
    } else if (isWater && Array.isArray(levelData?.background?.water_texture)) {
      pathTextures = levelData.background.water_texture;
      texKey = pathTextures[0];
    } else if (isWater && levelData?.background?.water_texture) {
      texKey = levelData.background.water_texture as string;
    } else if (!isWater && levelData?.background?.path_texture) {
      texKey = `${levelData.background.path_texture}_generated_tileset`;
    }

    if (!texKey || !this.scene.textures.exists(texKey)) return;

    const frame = this.computeAutotileFrame(grid, col, row, isWater ? 'water' : 'path');
    const centerX = col * this.cellSize + this.cellSize / 2;
    const centerY = row * this.cellSize + this.cellSize / 2;
    const edgesTexture = isWater ? levelData?.background?.water_texture_edges : undefined;

    if (isWater && edgesTexture && this.scene.textures.exists(edgesTexture)) {
      this.createWaterTileSprites(pathTextures, texKey, centerX, centerY, frame);
      const edgeSprite = this.scene.add.sprite(centerX, centerY, edgesTexture, frame);
      edgeSprite.setDisplaySize(this.cellSize, this.cellSize);
      edgeSprite.setDepth(Depth.waterTileEdge);
      this.cellSprites.push(edgeSprite);
    } else if (pathTextures && pathTextures.length > 1) {
      for (let i = 0; i < pathTextures.length; i++) {
        const tex = pathTextures[i];
        if (this.scene.textures.exists(tex)) {
          const sprite = this.scene.add.sprite(centerX, centerY, tex, frame);
          sprite.setDisplaySize(this.cellSize, this.cellSize);
          sprite.setDepth(Depth.waterTile);
          sprite.setVisible(i === 0);
          this.waterSprites.push(sprite);
        }
      }
    } else {
      const sprite = this.scene.add.sprite(centerX, centerY, texKey, frame);
      sprite.setDisplaySize(this.cellSize, this.cellSize);
      sprite.setDepth(Depth.waterTile);
      this.cellSprites.push(sprite);
    }
  }

  private createWaterTileSprites(pathTextures: string[] | null, fallbackKey: string, cx: number, cy: number, frame: number): void {
    if (pathTextures && pathTextures.length > 1) {
      for (let i = 0; i < pathTextures.length; i++) {
        const tex = pathTextures[i];
        if (this.scene.textures.exists(tex)) {
          const tileSprite = this.scene.add.tileSprite(cx, cy, this.cellSize, this.cellSize, tex, frame);
          tileSprite.setDepth(Depth.waterTile);
          tileSprite.setVisible(i === 0);
          this.waterSprites.push(tileSprite);
        }
      }
    } else {
      const tileSprite = this.scene.add.tileSprite(cx, cy, this.cellSize, this.cellSize, fallbackKey, frame);
      tileSprite.setDepth(Depth.waterTile);
      this.cellSprites.push(tileSprite);
    }
  }

  private computeAutotileFrame(grid: GridReader, col: number, row: number, propertyType: CellProperty): number {
    const has = (c: number, r: number) =>
      c >= 0 && c < grid.width && r >= 0 && r < grid.height && !!grid.getCell(c, r)?.properties.has(propertyType);

    const hasLeft = has(col - 1, row);
    const hasRight = has(col + 1, row);
    const hasUp = has(col, row - 1);
    const hasDown = has(col, row + 1);
    const hasUpLeft = has(col - 1, row - 1);
    const hasUpRight = has(col + 1, row - 1);
    const hasDownLeft = has(col - 1, row + 1);
    const hasDownRight = has(col + 1, row + 1);

    if (hasLeft && hasRight && hasUp && hasDown && hasUpLeft && hasUpRight && hasDownLeft && hasDownRight) return 0;

    const count = [hasUp, hasRight, hasDown, hasLeft].filter(Boolean).length;

    if (count === 1) {
      if (hasUp) return TILE_SINGLE_NEIGHBOR_FRAME.up;
      if (hasRight) return TILE_SINGLE_NEIGHBOR_FRAME.right;
      if (hasDown) return TILE_SINGLE_NEIGHBOR_FRAME.down;
      return TILE_SINGLE_NEIGHBOR_FRAME.left;
    }
    if (count === 2) {
      if (hasUp && hasDown) return TILE_FRAME_VERTICAL;
      if (hasLeft && hasRight) return TILE_FRAME_HORIZONTAL;
      if (hasUp && hasRight) return hasUpRight ? TILE_CORNER_UP_RIGHT_DIAG : TILE_CORNER_UP_RIGHT;
      if (hasUp && hasLeft) return hasUpLeft ? TILE_CORNER_UP_LEFT_DIAG : TILE_CORNER_UP_LEFT;
      if (hasDown && hasRight) return hasDownRight ? TILE_CORNER_DOWN_RIGHT_DIAG : TILE_CORNER_DOWN_RIGHT;
      if (hasDown && hasLeft) return hasDownLeft ? TILE_CORNER_DOWN_LEFT_DIAG : TILE_CORNER_DOWN_LEFT;
    }
    if (count === 3) {
      if (hasUp && hasRight && hasDown) return TILE_THREE_NEIGHBOR_BASE_NO_LEFT + ((hasUpRight ? 1 : 0) | (hasDownRight ? 2 : 0));
      if (hasUp && hasRight && hasLeft) return TILE_THREE_NEIGHBOR_BASE_NO_DOWN + ((hasUpRight ? 1 : 0) | (hasUpLeft ? 2 : 0));
      if (hasUp && hasDown && hasLeft) return TILE_THREE_NEIGHBOR_BASE_NO_RIGHT + ((hasUpLeft ? 1 : 0) | (hasDownLeft ? 2 : 0));
      if (hasRight && hasDown && hasLeft) return TILE_THREE_NEIGHBOR_BASE_NO_UP + ((hasDownRight ? 1 : 0) | (hasDownLeft ? 2 : 0));
    }
    if (count === 4) {
      return TILE_FOUR_NEIGHBOR_BASE + ((hasUpLeft ? 1 : 0) | (hasUpRight ? 2 : 0) | (hasDownLeft ? 4 : 0) | (hasDownRight ? 8 : 0));
    }
    return 0;
  }

  private renderElevatedCell(
    x: number, y: number, levelData: LevelData | undefined,
    hasBackgroundConfig: boolean, isStairs: boolean | undefined, isWall: boolean | undefined,
    isPlatform: boolean | undefined, hasTexture: boolean, edgeColor: number
  ): void {
    const bg = levelData?.background;
    const cx = x + this.cellSize / 2;
    const cy = y + this.cellSize / 2;

    // Textured stairs/walls
    if (hasBackgroundConfig && bg) {
      if (isStairs && bg.stairs_texture && this.scene.textures.exists(bg.stairs_texture)) {
        const sprite = this.addImage(cx, cy, bg.stairs_texture);
        sprite.setDisplaySize(this.cellSize, this.cellSize);
        sprite.setDepth(Depth.stairs);
        this.cellSprites.push(sprite);
      } else if (isWall && bg.wall_texture && this.scene.textures.exists(bg.wall_texture)) {
        const sprite = this.addImage(cx, cy, bg.wall_texture);
        sprite.setDisplaySize(this.cellSize, this.cellSize);
        sprite.setDepth(Depth.stairs);
        this.cellSprites.push(sprite);
      }
    }

    // Platform texture or fallback
    if (isPlatform) {
      if (hasBackgroundConfig && bg?.platform_texture && !bg.platform_tile && this.scene.textures.exists(bg.platform_texture)) {
        const sprite = this.addImage(cx, cy, bg.platform_texture);
        sprite.setDisplaySize(this.cellSize, this.cellSize);
        sprite.setDepth(Depth.stairs);
        this.cellSprites.push(sprite);
      } else if (!bg?.platform_tile) {
        this.graphics.fillStyle(0x000000, PLATFORM_FALLBACK_ALPHA);
        this.graphics.fillRect(x, y, this.cellSize, this.cellSize);
      }
    }

    // Fallback stairs (no texture)
    if (isStairs && (!hasBackgroundConfig || !bg?.stairs_texture) && !hasTexture) {
      this.renderFallbackStairs(x, y, edgeColor);
    }

    // Fallback walls (no texture)
    if (isWall && (!hasBackgroundConfig || !bg?.wall_texture) && !hasTexture) {
      this.renderFallbackWallBricks(x, y, edgeColor);
    }
  }

  private renderFallbackStairs(x: number, y: number, edgeColor: number): void {
    this.graphics.lineStyle(STAIRS_LINE_WIDTH_PX, edgeColor, 1);
    this.graphics.strokeLineShape(new Phaser.Geom.Line(x, y, x + this.cellSize, y));

    const stepHeight = this.cellSize / STAIRS_STEP_COUNT;
    for (let step = 0; step < STAIRS_STEP_COUNT; step++) {
      const stepY = y + step * stepHeight;
      const brightness = 1 - (step / (STAIRS_STEP_COUNT - 1)) * STAIRS_BRIGHTNESS_RANGE;
      const shadedColor = STAIRS_BASE_COLOR - STAIRS_COLOR_OFFSET + Math.floor(STAIRS_COLOR_OFFSET * brightness);

      this.graphics.fillStyle(shadedColor, 1);
      this.graphics.fillRect(x, stepY, this.cellSize, stepHeight);
      this.graphics.lineStyle(STAIRS_STEP_LINE_WIDTH_PX, edgeColor, 1);
      this.graphics.strokeLineShape(new Phaser.Geom.Line(x, stepY, x + this.cellSize, stepY));
    }
  }

  private renderFallbackWallBricks(x: number, y: number, edgeColor: number): void {
    const brickHeight = WALL_BRICK_HEIGHT_PX;
    const brickWidth = this.cellSize / WALL_BRICKS_PER_ROW;
    let currentY = y;
    let rowIndex = 0;

    while (currentY < y + this.cellSize) {
      const offset = (rowIndex % 2) * (brickWidth / 2);
      const actualHeight = Math.min(brickHeight, y + this.cellSize - currentY);

      for (let brickX = x - offset; brickX < x + this.cellSize + brickWidth; brickX += brickWidth) {
        const startX = Math.max(x, brickX);
        const endX = Math.min(x + this.cellSize, brickX + brickWidth - WALL_MORTAR_GAP_PX);
        if (startX < endX) {
          this.graphics.fillStyle(WALL_BRICK_COLOR, 1);
          this.graphics.fillRect(startX, currentY, endX - startX, actualHeight);
          this.graphics.lineStyle(WALL_MORTAR_GAP_PX, edgeColor, 1);
          this.graphics.strokeRect(startX, currentY, endX - startX, actualHeight);
        }
      }
      currentY += brickHeight;
      rowIndex++;
    }
  }

  private renderUntexturedPaths(grid: GridReader, pathTexture: string | undefined): void {
    if (pathTexture) return;
    const radius = this.cellSize * PATH_RADIUS_FACTOR;

    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        if (!grid.getCell(col, row)?.properties.has('path')) continue;

        const centerX = col * this.cellSize + this.cellSize / 2;
        const centerY = row * this.cellSize + this.cellSize / 2;

        const hasLeft = col > 0 && grid.getCell(col - 1, row)?.properties.has('path');
        const hasRight = col < grid.width - 1 && grid.getCell(col + 1, row)?.properties.has('path');
        const hasUp = row > 0 && grid.getCell(col, row - 1)?.properties.has('path');
        const hasDown = row < grid.height - 1 && grid.getCell(col, row + 1)?.properties.has('path');

        this.graphics.fillStyle(PATH_FILL_COLOR, 1);

        if (hasLeft) this.graphics.fillRect(centerX - this.cellSize / 2, centerY - radius, this.cellSize / 2 + 1, radius * 2);
        if (hasRight) this.graphics.fillRect(centerX - 1, centerY - radius, this.cellSize / 2 + 1, radius * 2);
        if (hasUp) this.graphics.fillRect(centerX - radius, centerY - this.cellSize / 2, radius * 2, this.cellSize / 2 + 1);
        if (hasDown) this.graphics.fillRect(centerX - radius, centerY - 1, radius * 2, this.cellSize / 2 + 1);

        if (hasLeft && hasUp) this.graphics.fillRect(centerX - this.cellSize / 2, centerY - this.cellSize / 2, this.cellSize / 2 - radius, this.cellSize / 2 - radius);
        if (hasRight && hasUp) this.graphics.fillRect(centerX + radius, centerY - this.cellSize / 2, this.cellSize / 2 - radius, this.cellSize / 2 - radius);
        if (hasLeft && hasDown) this.graphics.fillRect(centerX - this.cellSize / 2, centerY + radius, this.cellSize / 2 - radius, this.cellSize / 2 - radius);
        if (hasRight && hasDown) this.graphics.fillRect(centerX + radius, centerY + radius, this.cellSize / 2 - radius, this.cellSize / 2 - radius);

        this.graphics.fillCircle(centerX, centerY, radius);
        this.graphics.lineStyle(PATH_OUTLINE_WIDTH_PX, PATH_OUTLINE_COLOR, 1);
        this.graphics.strokeCircle(centerX, centerY, radius);
      }
    }
  }

  private renderGreyPaths(grid: GridReader): void {
    this.renderPathType(grid, 'path', PATH_FILL_COLOR, PATH_OUTLINE_COLOR);
    this.renderPathType(grid, 'water', WATER_FILL_COLOR, PATH_OUTLINE_COLOR);
  }

  private renderPathType(grid: GridReader, propertyType: CellProperty, fillColor: number, outlineColor: number): void {
    const radius = this.cellSize * PATH_RADIUS_FACTOR;

    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.getCell(col, row);
        const hasProperty = cell?.properties.has(propertyType);

        if (hasProperty) {
          const x = col * this.cellSize;
          const y = row * this.cellSize;
          const centerX = x + this.cellSize / 2;
          const centerY = y + this.cellSize / 2;

          const hasLeft = col > 0 && grid.getCell(col - 1, row)?.properties.has(propertyType);
          const hasRight = col < grid.width - 1 && grid.getCell(col + 1, row)?.properties.has(propertyType);
          const hasUp = row > 0 && grid.getCell(col, row - 1)?.properties.has(propertyType);
          const hasDown = row < grid.height - 1 && grid.getCell(col, row + 1)?.properties.has(propertyType);

          const adjacentCount = (hasLeft ? 1 : 0) + (hasRight ? 1 : 0) + (hasUp ? 1 : 0) + (hasDown ? 1 : 0);
          const isDeadEnd = adjacentCount === 1;

          this.graphics.fillStyle(fillColor, 1);

          if (hasLeft) {
            this.graphics.fillRect(centerX - this.cellSize / 2, centerY - radius, this.cellSize / 2 + 1, radius * 2);
          }
          if (hasRight) {
            this.graphics.fillRect(centerX - 1, centerY - radius, this.cellSize / 2 + 1, radius * 2);
          }
          if (hasUp) {
            this.graphics.fillRect(centerX - radius, centerY - this.cellSize / 2, radius * 2, this.cellSize / 2 + 1);
          }
          if (hasDown) {
            this.graphics.fillRect(centerX - radius, centerY - 1, radius * 2, this.cellSize / 2 + 1);
          }

          if (hasLeft && hasUp) {
            this.graphics.fillRect(centerX - this.cellSize / 2, centerY - this.cellSize / 2, this.cellSize / 2 - radius, this.cellSize / 2 - radius);
          }
          if (hasRight && hasUp) {
            this.graphics.fillRect(centerX + radius, centerY - this.cellSize / 2, this.cellSize / 2 - radius, this.cellSize / 2 - radius);
          }
          if (hasLeft && hasDown) {
            this.graphics.fillRect(centerX - this.cellSize / 2, centerY + radius, this.cellSize / 2 - radius, this.cellSize / 2 - radius);
          }
          if (hasRight && hasDown) {
            this.graphics.fillRect(centerX + radius, centerY + radius, this.cellSize / 2 - radius, this.cellSize / 2 - radius);
          }

          if (isDeadEnd) {
            this.graphics.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
          } else {
            this.graphics.fillCircle(centerX, centerY, radius);
          }
        }
      }
    }

    this.graphics.lineStyle(PATH_OUTLINE_STROKE_WIDTH_PX, outlineColor, 1);
    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.getCell(col, row);
        if (!cell?.properties.has(propertyType)) continue;

        const x = col * this.cellSize + this.cellSize / 2;
        const y = row * this.cellSize + this.cellSize / 2;

        const hasLeft = col > 0 && grid.getCell(col - 1, row)?.properties.has(propertyType);
        const hasRight = col < grid.width - 1 && grid.getCell(col + 1, row)?.properties.has(propertyType);
        const hasUp = row > 0 && grid.getCell(col, row - 1)?.properties.has(propertyType);
        const hasDown = row < grid.height - 1 && grid.getCell(col, row + 1)?.properties.has(propertyType);

        const adjacentCount = (hasLeft ? 1 : 0) + (hasRight ? 1 : 0) + (hasUp ? 1 : 0) + (hasDown ? 1 : 0);
        const isDeadEnd = adjacentCount === 1;

        if (isDeadEnd) {
          if (hasLeft || hasRight) {
            this.graphics.strokeLineShape(new Phaser.Geom.Line(x - radius, y - radius, x - radius, y + this.cellSize / 2));
            this.graphics.strokeLineShape(new Phaser.Geom.Line(x + radius, y - radius, x + radius, y + this.cellSize / 2));
            this.graphics.strokeLineShape(new Phaser.Geom.Line(x - radius, y + radius, x + radius, y + radius));
          } else if (hasUp) {
            this.graphics.strokeLineShape(new Phaser.Geom.Line(x - radius, y - this.cellSize / 2, x - radius, y + radius));
            this.graphics.strokeLineShape(new Phaser.Geom.Line(x + radius, y - this.cellSize / 2, x + radius, y + radius));
            this.graphics.strokeLineShape(new Phaser.Geom.Line(x - radius, y + radius, x + radius, y + radius));
          } else if (hasDown) {
            this.graphics.strokeLineShape(new Phaser.Geom.Line(x - radius, y - radius, x - radius, y + this.cellSize / 2));
            this.graphics.strokeLineShape(new Phaser.Geom.Line(x + radius, y - radius, x + radius, y + this.cellSize / 2));
            this.graphics.strokeLineShape(new Phaser.Geom.Line(x - radius, y - radius, x + radius, y - radius));
          }
        } else {
          if (!hasLeft && !hasUp) {
            this.graphics.beginPath();
            this.graphics.arc(x, y, radius, Math.PI, -Math.PI / 2, false);
            this.graphics.strokePath();
          } else if (!hasLeft && hasUp) {
            this.graphics.strokeLineShape(new Phaser.Geom.Line(x - radius, y, x - radius, y - this.cellSize / 2));
          } else if (hasLeft && !hasUp) {
            this.graphics.strokeLineShape(new Phaser.Geom.Line(x, y - radius, x - this.cellSize / 2, y - radius));
          }

          if (!hasRight && !hasUp) {
            this.graphics.beginPath();
            this.graphics.arc(x, y, radius, -Math.PI / 2, 0, false);
            this.graphics.strokePath();
          } else if (!hasRight && hasUp) {
            this.graphics.strokeLineShape(new Phaser.Geom.Line(x + radius, y, x + radius, y - this.cellSize / 2));
          } else if (hasRight && !hasUp) {
            this.graphics.strokeLineShape(new Phaser.Geom.Line(x, y - radius, x + this.cellSize / 2, y - radius));
          }

          if (!hasLeft && !hasDown) {
            this.graphics.beginPath();
            this.graphics.arc(x, y, radius, Math.PI / 2, Math.PI, false);
            this.graphics.strokePath();
          } else if (!hasLeft && hasDown) {
            this.graphics.strokeLineShape(new Phaser.Geom.Line(x - radius, y, x - radius, y + this.cellSize / 2));
          } else if (hasLeft && !hasDown) {
            this.graphics.strokeLineShape(new Phaser.Geom.Line(x, y + radius, x - this.cellSize / 2, y + radius));
          }

          if (!hasRight && !hasDown) {
            this.graphics.beginPath();
            this.graphics.arc(x, y, radius, 0, Math.PI / 2, false);
            this.graphics.strokePath();
          } else if (!hasRight && hasDown) {
            this.graphics.strokeLineShape(new Phaser.Geom.Line(x + radius, y, x + radius, y + this.cellSize / 2));
          } else if (hasRight && !hasDown) {
            this.graphics.strokeLineShape(new Phaser.Geom.Line(x, y + radius, x + this.cellSize / 2, y + radius));
          }
        }

        const innerRadius = this.cellSize / 2 - radius;
        if (hasLeft && hasUp && !grid.getCell(col - 1, row - 1)?.properties.has('path')) {
          this.graphics.beginPath();
          this.graphics.arc(x - this.cellSize / 2, y - this.cellSize / 2, innerRadius, 0, Math.PI / 2, false);
          this.graphics.strokePath();
        }
        if (hasRight && hasUp && !grid.getCell(col + 1, row - 1)?.properties.has('path')) {
          this.graphics.beginPath();
          this.graphics.arc(x + this.cellSize / 2, y - this.cellSize / 2, innerRadius, Math.PI / 2, Math.PI, false);
          this.graphics.strokePath();
        }
        if (hasLeft && hasDown && !grid.getCell(col - 1, row + 1)?.properties.has('path')) {
          this.graphics.beginPath();
          this.graphics.arc(x - this.cellSize / 2, y + this.cellSize / 2, innerRadius, -Math.PI / 2, 0, false);
          this.graphics.strokePath();
        }
        if (hasRight && hasDown && !grid.getCell(col + 1, row + 1)?.properties.has('path')) {
          this.graphics.beginPath();
          this.graphics.arc(x + this.cellSize / 2, y + this.cellSize / 2, innerRadius, Math.PI, -Math.PI / 2, false);
          this.graphics.strokePath();
        }
      }
    }
  }

  private renderEdges(grid: GridReader): void {
    const edgeThickness = EDGE_THICKNESS_PX;
    const edgeColor = this.getEdgeColor();

    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.getCell(col, row);
        if (!cell) continue;

        const isStairs = cell.properties.has('stairs');
        const isElevated = grid.getLayer(cell) >= 1;
        const isWall = cell.properties.has('wall');
        const isPlatform = cell.properties.has('platform');

        if (isElevated || isStairs) {
          const x = col * this.cellSize;
          const y = row * this.cellSize;

          this.edgeGraphics.lineStyle(edgeThickness, edgeColor, 1);

          const currentLayer = grid.getLayer(cell);

          if (col < grid.width - 1) {
            const rightCell = grid.cells[row][col + 1];
            const rightLayer = grid.getLayer(rightCell);
            const rightIsLower = rightLayer < currentLayer && !grid.isTransition(rightCell);
            const rightIsPlatform = rightCell?.properties.has('platform');
            const rightIsStairs = rightCell && grid.isTransition(rightCell);
            const rightIsWall = rightCell?.properties.has('wall');

            if (rightIsLower || (isWall && rightIsPlatform && !rightIsStairs) || (isStairs && rightIsWall) || (isWall && rightIsStairs)) {
              this.edgeGraphics.strokeLineShape(new Phaser.Geom.Line(
                x + this.cellSize, y,
                x + this.cellSize, y + this.cellSize
              ));
            }
          }

          if (col > 0) {
            const leftCell = grid.cells[row][col - 1];
            const leftLayer = grid.getLayer(leftCell);
            const leftIsLower = leftLayer < currentLayer && !grid.isTransition(leftCell);
            const leftIsPlatform = leftCell?.properties.has('platform');
            const leftIsStairs = leftCell && grid.isTransition(leftCell);
            const leftIsWall = leftCell?.properties.has('wall');

            if (leftIsLower || (isWall && leftIsPlatform && !leftIsStairs) || (isStairs && leftIsWall) || (isWall && leftIsStairs)) {
              this.edgeGraphics.lineStyle(edgeThickness / 2, edgeColor, 1);
              this.edgeGraphics.strokeLineShape(new Phaser.Geom.Line(x, y, x, y + this.cellSize));
              this.edgeGraphics.lineStyle(edgeThickness, edgeColor, 1);
            }
          }

          if (row > 0) {
            const topCell = grid.cells[row - 1][col];
            const topLayer = grid.getLayer(topCell);
            const topIsLower = topLayer < currentLayer && !grid.isTransition(topCell);
            const topIsPlatform = topCell?.properties.has('platform');
            const topIsStairs = topCell && grid.isTransition(topCell);
            const topIsWall = topCell?.properties.has('wall');

            if (((topIsLower || (isWall && topIsPlatform && !topIsStairs) || (isStairs && topIsWall) || (isWall && topIsStairs)) && !isStairs) || (isPlatform && topIsStairs)) {
              this.edgeGraphics.strokeLineShape(new Phaser.Geom.Line(x, y, x + this.cellSize, y));
            }
          }

          if (row < grid.height - 1 && !isStairs) {
            const bottomCell = grid.cells[row + 1][col];
            const bottomLayer = grid.getLayer(bottomCell);
            const bottomIsLower = bottomLayer < currentLayer && !grid.isTransition(bottomCell);
            const bottomIsPlatform = bottomCell?.properties.has('platform');
            const bottomIsStairs = bottomCell && grid.isTransition(bottomCell);

            if (bottomIsLower || (isWall && bottomIsPlatform && !bottomIsStairs)) {
              this.edgeGraphics.strokeLineShape(new Phaser.Geom.Line(x, y + this.cellSize, x + this.cellSize, y + this.cellSize));
            }
          }
        }
      }
    }
  }

  private renderEdgeDarkening(grid: GridReader, levelData?: LevelData): void {
    const config = levelData?.background?.edgeDarkening;
    if (!config) return;

    const darkenSteps = config.depth;
    const maxIntensity = config.intensity;
    const stepsPerCell = DARKENING_STEPS_PER_CELL;

    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.getCell(col, row);
        if (!cell || grid.getLayer(cell) < 1) continue;

        const distToEdge = Math.min(col, row, grid.width - 1 - col, grid.height - 1 - row);

        if (distToEdge < darkenSteps) {
          const x = col * this.cellSize;
          const y = row * this.cellSize;
          const stepSize = this.cellSize / stepsPerCell;

          for (let sy = 0; sy < stepsPerCell; sy++) {
            for (let sx = 0; sx < stepsPerCell; sx++) {
              const subX = x + sx * stepSize;
              const subY = y + sy * stepSize;

              const subDistToEdge = Math.min(
                col + sx / stepsPerCell,
                row + sy / stepsPerCell,
                grid.width - 1 - col - sx / stepsPerCell,
                grid.height - 1 - row - sy / stepsPerCell
              );

              const intensity = Math.max(0, 1 - subDistToEdge / darkenSteps);
              const alpha = maxIntensity * intensity;

              if (alpha > DARKENING_MIN_ALPHA) {
                this.edgeGraphics.fillStyle(0x000000, alpha);
                this.edgeGraphics.fillRect(subX, subY, stepSize, stepSize);
              }
            }
          }
        }
      }
    }
  }

  private renderShadows(grid: GridReader): void {
    const shadowWidth = SHADOW_WIDTH_PX;
    const shadowSteps = SHADOW_STEPS;
    const shadowIntensity = SHADOW_INTENSITY;

    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.getCell(col, row);
        if (cell && grid.getLayer(cell) >= 1) {
          const x = col * this.cellSize;
          const y = row * this.cellSize;
          const currentLayer = grid.getLayer(cell);

          if (col < grid.width - 1) {
            const rightCell = grid.cells[row][col + 1];
            const rightIsLower = grid.getLayer(rightCell) < currentLayer && !grid.isTransition(rightCell);

            if (rightIsLower) {
              const isTopRightCorner = row > 0 && grid.getLayer(grid.cells[row - 1][col]) < currentLayer && !grid.isTransition(grid.cells[row - 1][col]);

              if (isTopRightCorner) {
                for (let yOffset = 0; yOffset < shadowSteps; yOffset++) {
                  for (let xOffset = 0; xOffset <= yOffset; xOffset++) {
                    const distance = Math.min(xOffset, yOffset);
                    const alpha = shadowIntensity * (1 - distance / shadowSteps);
                    const step = shadowWidth / shadowSteps;
                    this.graphics.fillStyle(0x000000, alpha);
                    this.graphics.fillRect(x + this.cellSize + xOffset * step, y + yOffset * step, step, step);
                  }
                }
              } else {
                for (let i = 0; i < shadowSteps; i++) {
                  const alpha = shadowIntensity * (1 - i / shadowSteps);
                  const stepWidth = shadowWidth / shadowSteps;
                  this.graphics.fillStyle(0x000000, alpha);
                  this.graphics.fillRect(x + this.cellSize + i * stepWidth, y, stepWidth, this.cellSize);
                }
              }
            }
          }

          if (row < grid.height - 1 && grid.getLayer(grid.cells[row + 1][col]) < currentLayer && !grid.isTransition(grid.cells[row + 1][col])) {
            const isBottomLeftCorner = col > 0 && grid.getLayer(grid.cells[row][col - 1]) < currentLayer && !grid.isTransition(grid.cells[row][col - 1]);

            if (isBottomLeftCorner) {
              for (let i = 0; i < shadowSteps; i++) {
                for (let j = 0; j <= i; j++) {
                  const alpha = shadowIntensity * (1 - i / shadowSteps);
                  const step = shadowWidth / shadowSteps;
                  this.graphics.fillStyle(0x000000, alpha);
                  this.graphics.fillRect(x + this.cellSize - (j + 1) * step, y + this.cellSize + (i - j) * step, step, step);
                }
              }
            } else {
              for (let i = 0; i < shadowSteps; i++) {
                const alpha = shadowIntensity * (1 - i / shadowSteps);
                const stepHeight = shadowWidth / shadowSteps;
                this.graphics.fillStyle(0x000000, alpha);
                this.graphics.fillRect(x, y + this.cellSize + i * stepHeight, this.cellSize, stepHeight);
              }
            }
          }

          // Corner shadow (bottom-right)
          if (col < grid.width - 1 && row < grid.height - 1) {
            const rightCell = grid.cells[row][col + 1];
            const bottomCell = grid.cells[row + 1][col];
            const rightIsLower = grid.getLayer(rightCell) < currentLayer && !grid.isTransition(rightCell);
            const bottomIsLower = grid.getLayer(bottomCell) < currentLayer && !grid.isTransition(bottomCell);

            if (rightIsLower && bottomIsLower) {
              for (let i = 0; i < shadowSteps; i++) {
                for (let j = 0; j <= i; j++) {
                  const alpha = shadowIntensity * (1 - i / shadowSteps);
                  const step = shadowWidth / shadowSteps;
                  this.graphics.fillStyle(0x000000, alpha);
                  this.graphics.fillRect(x + this.cellSize + j * step, y + this.cellSize + (i - j) * step, step, step);
                }
              }
            }
          }
        }
      }
    }
  }
}
