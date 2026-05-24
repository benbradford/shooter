import type { GridReader } from '../../systems/grid/Grid';
import { normalizeBgTextures, type LevelData } from '../../systems/level/LevelLoader';
import type { CellProperty } from '../../systems/grid/CellData';
import { Depth } from '../../constants/DepthConstants';
import { AssetManager } from '../../systems/AssetManager';

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

export class BackgroundTextureRenderer {
  private readonly dynamicZSprites: Array<{ sprite: Phaser.GameObjects.Image; y: number }> = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly cellSize: number,
    private readonly cellSprites: Array<Phaser.GameObjects.Image | Phaser.GameObjects.Sprite | Phaser.GameObjects.TileSprite>,
    private readonly renderedCellTextures: Map<string, Phaser.GameObjects.Image[]>,
    private readonly addImage: (x: number, y: number, texture: string) => Phaser.GameObjects.Image
  ) {}

  updateDynamicZ(playerY: number): void {
    for (const entry of this.dynamicZSprites) {
      entry.sprite.setDepth(playerY < entry.y ? Depth.player + 1 : Depth.cellTextureModified);
    }
  }

  clearDynamicZ(): void {
    this.dynamicZSprites.length = 0;
  }

  createBackgroundTextureSprites(grid: GridReader, levelData: LevelData): void {
    if (!levelData.cells) return;

    for (const cell of levelData.cells) {
      const key = `${cell.col},${cell.row}`;
      const animKey = `${key}_anim`;

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
          let dynamicZ = false;
          let blendMode: string | undefined;
          let alpha: number | undefined;
          let tint: string | undefined;

          if (typeof tex === 'string') {
            textureName = tex;
          } else {
            textureName = tex.image;
            transform = tex.transformOverride;
            sourceRect = tex.sourceRect;
            zOffsetOverride = tex.zOffsetOverride;
            dynamicZ = tex.dynamicZ ?? false;
            blendMode = tex.blendMode;
            alpha = tex.alpha;
            tint = tex.tint;
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
            sprite.setDisplaySize(this.cellSize * Math.abs(transform.scaleX), this.cellSize * Math.abs(transform.scaleY));
            sprite.setFlip(transform.scaleX < 0, transform.scaleY < 0);
          } else {
            sprite.setDisplaySize(this.cellSize, this.cellSize);
          }

          if (dynamicZ) {
            this.dynamicZSprites.push({ sprite, y: spriteY });
          }
          const depth: number = dynamicZ ? Depth.cellTextureModified : (zOffsetOverride ?? baseDepth);
          sprite.setDepth(depth);

          if (blendMode === 'multiply') sprite.setBlendMode(Phaser.BlendModes.MULTIPLY);
          else if (blendMode === 'screen') sprite.setBlendMode(Phaser.BlendModes.SCREEN);
          else if (blendMode === 'add') sprite.setBlendMode(Phaser.BlendModes.ADD);

          if (alpha !== undefined) sprite.setAlpha(alpha);

          if (tint) sprite.setTint(Number.parseInt(tint.replace('#', ''), 16));

          this.cellSprites.push(sprite);
          sprites.push(sprite);
        }

        if (sprites.length > 0) {
          this.renderedCellTextures.set(key, sprites);
        }
      }

      if (cell.animatedTexture) {
        if (this.renderedCellTextures.has(animKey)) continue;

        const config = cell.animatedTexture;
        if (!this.scene.textures.exists(config.spritesheet)) continue;

        const texture = this.scene.textures.get(config.spritesheet);
        if (texture.frameTotal <= 1) continue;

        const firstFrame = texture.get(0);
        if (!firstFrame?.source?.glTexture) continue;

        const transform = config.transformOverride;
        const x = cell.col * this.cellSize;
        const y = cell.row * this.cellSize;
        const centerX = x + this.cellSize / 2;
        const centerY = y + this.cellSize / 2;
        const spriteX = transform ? centerX + transform.offsetX : centerX;
        const spriteY = transform ? centerY + transform.offsetY : centerY;

        const animSprite = this.scene.add.sprite(spriteX, spriteY, config.spritesheet, 0);
        if (transform) {
          animSprite.setDisplaySize(this.cellSize * Math.abs(transform.scaleX), this.cellSize * Math.abs(transform.scaleY));
          animSprite.setFlip(transform.scaleX < 0, transform.scaleY < 0);
        } else {
          animSprite.setDisplaySize(this.cellSize, this.cellSize);
        }
        animSprite.setDepth(Depth.cellTextureModified + 1);

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

          const assetManager = AssetManager.getInstance();
          assetManager.registerDependency(config.spritesheet, 'animation', animationKey);
        }

        const randomFrame = Math.floor(Math.random() * config.frameCount);
        animSprite.setFrame(randomFrame);
        animSprite.play(animationKey);

        this.cellSprites.push(animSprite);
        this.renderedCellTextures.set(animKey, [animSprite]);
      }
    }
  }

  computeAutotileFrame(grid: GridReader, col: number, row: number, propertyType: CellProperty): number {
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
}
