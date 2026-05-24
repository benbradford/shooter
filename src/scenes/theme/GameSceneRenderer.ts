import type { GridReader } from '../../systems/grid/Grid';
import type { LevelCell, LevelData } from '../../systems/level/LevelLoader';
import { Depth } from '../../constants/DepthConstants';
import { WaterAnimator, type WaterConfig } from './WaterAnimator';
import { PathTilesetGenerator } from './PathTilesetGenerator';
import { TextureVerifier } from '../../systems/TextureVerifier';
import { PathRenderer } from './PathRenderer';
import { EdgeRenderer } from './EdgeRenderer';
import { ShadowRenderer } from './ShadowRenderer';
import { BackgroundTextureRenderer } from './BackgroundTextureRenderer';

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
  private readonly pathRenderer: PathRenderer;
  private readonly edgeRenderer: EdgeRenderer;
  private readonly shadowRenderer: ShadowRenderer;
  private readonly bgTextureRenderer: BackgroundTextureRenderer;

  constructor(protected readonly scene: Phaser.Scene, protected readonly cellSize: number) {
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(Depth.rendererGraphics);
    this.edgeGraphics = scene.add.graphics();
    this.edgeGraphics.setDepth(Depth.edgeGraphics);
    this.pathRenderer = new PathRenderer(this.graphics, cellSize);
    this.edgeRenderer = new EdgeRenderer(this.edgeGraphics, cellSize);
    this.shadowRenderer = new ShadowRenderer(this.graphics, cellSize);
    this.bgTextureRenderer = new BackgroundTextureRenderer(
      scene, cellSize, this.cellSprites, this.renderedCellTextures,
      (x, y, texture) => this.addImage(x, y, texture)
    );
  }

  loadAllAssets(levelData: LevelData): void {
    this.prepareRuntimeTilesets(levelData);
  }

  update(delta: number, playerY?: number): void {
    if (this.waterAnimator) {
      this.waterAnimator.update(delta, this.waterSprites);
    }
    if (playerY !== undefined) {
      this.bgTextureRenderer.updateDynamicZ(playerY);
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

  private initializeWaterAnimation(waterConfig: WaterConfig): void {
    this.waterAnimator = new WaterAnimator(this.scene, waterConfig);
    this.waterAnimator.generateTextures();
  }

  prepareRuntimeTilesets(levelData: LevelData): { success: boolean; failed: string[] } {
    const failed: string[] = [];

    if (levelData.background?.water) {
      const sourceKey = levelData.background.water.sourceImage;
      if (TextureVerifier.verifyTexture(this.scene, sourceKey)) {
        this.initializeWaterAnimation(levelData.background.water);
      } else {
        failed.push(`water_source:${sourceKey}`);
      }
    }

    if (levelData.background?.path_texture) {
      const sourceKey = levelData.background.path_texture;
      if (TextureVerifier.verifyTexture(this.scene, sourceKey)) {
        const generator = new PathTilesetGenerator(this.scene);
        const tilesetKey = `${sourceKey}_generated_tileset`;
        const success = generator.generateTileset(sourceKey, tilesetKey, 1.5, 'blend');
        console.log('[GameSceneRenderer] Path tileset generated:', tilesetKey, 'success:', success);

        if (!success) {
          failed.push(tilesetKey);
        } else if (!TextureVerifier.verifyTexture(this.scene, tilesetKey)) {
          failed.push(`${tilesetKey}:verification`);
        }
      } else {
        failed.push(`path_source:${sourceKey}`);
      }
    }

    return { success: failed.length === 0, failed };
  }

  initializeSprites(grid: GridReader, levelData: LevelData): void {
    if (this.spritesInitialized) return;

    this.createFloorSprites(grid, levelData);
    this.bgTextureRenderer.createBackgroundTextureSprites(grid, levelData);
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
      this.edgeRenderer.renderEdges(grid, this.getEdgeColor());
    }

    this.edgeRenderer.renderEdgeDarkening(grid, levelData);

    if (levelData?.background?.hasShadows !== false) {
      this.shadowRenderer.renderShadows(grid);
    }

    if (!levelData?.background?.path_texture && !levelData?.background?.water_texture && !levelData?.background?.water) {
      this.pathRenderer.renderGreyPaths(grid);
    }
  }

  private createFloorSprites(grid: GridReader, levelData: LevelData): void {
    if (!levelData.background?.floor_texture) return;

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

  refreshBackgroundTextureSprites(grid: GridReader, levelData: LevelData): void {
    this.bgTextureRenderer.createBackgroundTextureSprites(grid, levelData);
  }

  private createWaterAndPathTileSprites(grid: GridReader, levelData: LevelData): void {
    this.renderAllCells(grid, levelData);
  }

  private createPlatformStairsWallSprites(_grid: GridReader, _levelData: LevelData): void {
    // Already handled in renderAllCells
  }

  private createFloorOverlay(grid: GridReader, levelData: LevelData): void {
    if (!levelData.background || this.floorOverlay) return;
    if (levelData.levelTheme === 'default' || levelData.levelTheme === 'dungeon') return;
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
    for (const sprite of this.floorSprites) sprite.destroy();
    this.floorSprites.length = 0;
    for (const sprite of this.cellSprites) sprite.destroy();
    this.cellSprites.length = 0;
    this.bgTextureRenderer.clearDynamicZ();
    for (const sprite of this.waterSprites) sprite.destroy();
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
    for (const sprite of this.cellSprites) sprite.destroy();
    this.cellSprites.length = 0;
    this.bgTextureRenderer.clearDynamicZ();
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
          onComplete: () => { sprite.destroy(); }
        });
        this.cellSprites.splice(index, 1);
      }
    }

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
          this.renderElevatedCell({ x, y, levelData, hasBackgroundConfig, isStairs, isWall, isPlatform, hasTexture, edgeColor });
        }

        if (cell?.properties.has('push_lock') && this.scene.textures.exists('push_lock_depression')) {
          const sprite = this.addImage(x + this.cellSize / 2, y + this.cellSize / 2, 'push_lock_depression');
          sprite.setDisplaySize(this.cellSize, this.cellSize);
          sprite.setDepth(Depth.overlay + 1);
          this.cellSprites.push(sprite);
        }
      }
    }

    this.pathRenderer.renderUntexturedPaths(grid, levelData?.background?.path_texture);
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

    const frame = this.bgTextureRenderer.computeAutotileFrame(grid, col, row, isWater ? 'water' : 'path');
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

  private renderElevatedCell(props: {
    x: number; y: number; levelData: LevelData | undefined;
    hasBackgroundConfig: boolean; isStairs: boolean | undefined; isWall: boolean | undefined;
    isPlatform: boolean | undefined; hasTexture: boolean; edgeColor: number;
  }): void {
    const { x, y, levelData, hasBackgroundConfig, isStairs, isWall, isPlatform, hasTexture, edgeColor } = props;
    const bg = levelData?.background;
    const cx = x + this.cellSize / 2;
    const cy = y + this.cellSize / 2;

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

    if (isStairs && (!hasBackgroundConfig || !bg?.stairs_texture) && !hasTexture) {
      this.renderFallbackStairs(x, y, edgeColor);
    }

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
}
