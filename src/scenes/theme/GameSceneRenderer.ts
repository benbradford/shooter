import type { Grid } from '../../systems/grid/Grid';
import type { LevelData } from '../../systems/level/LevelLoader';
import type { CellProperty } from '../../systems/grid/CellData';

const BACKGROUND_TEXTURE_TRANSFORM_OVERRIDES: Record<string, { scaleX: number; scaleY: number; offsetX: number; offsetY: number }> = {
  house1: { scaleX: 4, scaleY: 4, offsetX: 23, offsetY: 0 },
  house2: { scaleX: 4, scaleY: 4, offsetX: 0, offsetY: -15 },
  house3: { scaleX: 4, scaleY: 4, offsetX: 0, offsetY: 0 },
  bridge_v: {scaleX: 3, scaleY: 3, offsetX: 0, offsetY: -32 },
  bridge_h: {scaleX: 3, scaleY: 3, offsetX: -32, offsetY: 0 },
};

export abstract class GameSceneRenderer {
  protected readonly graphics: Phaser.GameObjects.Graphics;
  protected readonly edgeGraphics: Phaser.GameObjects.Graphics;
  private floorOverlay: Phaser.GameObjects.Image | null = null;
  private readonly floorSprites: Phaser.GameObjects.Image[] = [];
  private readonly cellSprites: Phaser.GameObjects.Image[] = [];
  private readonly renderedCellTextures: Map<string, Phaser.GameObjects.Image> = new Map();
  private isCached: boolean = false;

  constructor(protected readonly scene: Phaser.Scene, protected readonly cellSize: number) {
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(-10);
    this.edgeGraphics = scene.add.graphics();
    this.edgeGraphics.setDepth(0);
  }

  abstract renderTheme(width: number, height: number): { background: Phaser.GameObjects.Image; vignette: Phaser.GameObjects.Image };
  protected abstract getEdgeColor(): number;

  renderGrid(grid: Grid, levelData?: LevelData): void {
    this.graphics.clear();
    this.edgeGraphics.clear();

    // Destroy any __MISSING texture sprites
    const allImages = this.scene.children.list.filter(obj => obj.type === 'Image') as Phaser.GameObjects.Image[];
    for (const img of allImages) {
      if (img.texture.key === '__MISSING') {
        img.destroy();
      }
    }

    if (!this.isCached && levelData?.background) {
      const chunkSize = levelData.background.floor_tile;
      const texture = levelData.background.floor_texture;
      
      // Wait for all required textures before caching
      if (!this.scene.textures.exists(texture)) {
        return;
      }
      if (levelData.background.platform_texture && !this.scene.textures.exists(levelData.background.platform_texture)) {
        return;
      }
      if (levelData.background.stairs_texture && !this.scene.textures.exists(levelData.background.stairs_texture)) {
        return;
      }
      if (levelData.background.wall_texture && !this.scene.textures.exists(levelData.background.wall_texture)) {
        return;
      }

      for (let row = 0; row < grid.height; row += chunkSize) {
        for (let col = 0; col < grid.width; col += chunkSize) {
          const x = col * this.cellSize;
          const y = row * this.cellSize;
          const width = Math.min(chunkSize, grid.width - col) * this.cellSize;
          const height = Math.min(chunkSize, grid.height - row) * this.cellSize;

          const sprite = this.scene.add.image(x + width / 2, y + height / 2, texture);
          sprite.setDisplaySize(width, height);
          sprite.setDepth(-1000);
          sprite.setAlpha(0.7);
          this.floorSprites.push(sprite);
        }
      }

      if (levelData.background.platform_tile && levelData.background.platform_texture) {
        const platformTileSize = levelData.background.platform_tile;
        const platformTexture = levelData.background.platform_texture;
        
        // Only cache if texture is loaded
        if (!this.scene.textures.exists(platformTexture)) {
          return;
        }

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

              const sprite = this.scene.add.image(x + width / 2, y + height / 2, platformTexture);
              sprite.setDisplaySize(width, height);
              sprite.setDepth(-5);
              this.floorSprites.push(sprite);
            }
          }
        }
      }

      this.renderAllCells(grid, levelData);
      this.isCached = true;
    }

    // Render cell background textures (outside cache - dynamic loading)
    if (levelData?.cells) {
      for (const cell of levelData.cells) {
        if (cell.backgroundTexture && cell.backgroundTexture !== '') {
          const key = `${cell.col},${cell.row}`;
          
          // Skip if already rendered
          if (this.renderedCellTextures.has(key)) {
            continue;
          }
          
          // Skip if texture doesn't exist yet (still loading)
          if (!this.scene.textures.exists(cell.backgroundTexture)) {
            continue;
          }
          
          const transform = BACKGROUND_TEXTURE_TRANSFORM_OVERRIDES[cell.backgroundTexture];
          const x = cell.col * this.cellSize;
          const y = cell.row * this.cellSize;
          const centerX = x + this.cellSize / 2;
          const centerY = y + this.cellSize / 2;
          const spriteX = transform ? centerX + transform.offsetX : centerX;
          const spriteY = transform ? centerY + transform.offsetY : centerY;

          const sprite = this.scene.add.image(spriteX, spriteY, cell.backgroundTexture);
          if (transform) {
            sprite.setDisplaySize(this.cellSize * transform.scaleX, this.cellSize * transform.scaleY);
          } else {
            sprite.setDisplaySize(this.cellSize, this.cellSize);
          }
          sprite.setDepth(-4);
          this.renderedCellTextures.set(key, sprite);
        }
      }
    }

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

    if (!this.floorOverlay && levelData?.background) {
      this.renderFloorOverlay(grid, levelData);
    }
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
    for (const sprite of this.renderedCellTextures.values()) {
      sprite.destroy();
    }
    this.renderedCellTextures.clear();
  }

  invalidateCache(): void {
    console.log('[GameSceneRenderer] Invalidating cache - destroying', this.cellSprites.length, 'sprites');
    for (const sprite of this.cellSprites) {
      sprite.destroy();
    }
    this.cellSprites.length = 0;
    for (const sprite of this.renderedCellTextures.values()) {
      sprite.destroy();
    }
    this.renderedCellTextures.clear();
    this.isCached = false;
  }

  invalidateCells(cells: Array<{ col: number; row: number }>): void {
    const FADE_DURATION_MS = 500;

    for (const cell of cells) {
      const key = `${cell.col},${cell.row}`;
      const cellTexture = this.renderedCellTextures.get(key);
      if (cellTexture) {
        this.scene.tweens.add({
          targets: cellTexture,
          alpha: 0,
          duration: FADE_DURATION_MS,
          onComplete: () => {
            cellTexture.destroy();
          }
        });
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
  }

  private renderFloorOverlay(grid: Grid, _levelData: LevelData): void {
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
    bgGradient.addColorStop(0, 'rgba(146, 151, 84, 0.2)');
    bgGradient.addColorStop(0.4, 'rgba(163, 170, 132, 0.2)');
    bgGradient.addColorStop(0.7, 'rgba(40, 105, 3, 0.2)');
    bgGradient.addColorStop(1, 'rgba(163, 104, 2, 0.2)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, worldWidth, worldHeight);

    canvas?.refresh();

    this.floorOverlay = this.scene.add.image(0, 0, 'floor_gradient_overlay');
    this.floorOverlay.setOrigin(0, 0);
    this.floorOverlay.setDisplaySize(worldWidth, worldHeight);
    this.floorOverlay.setDepth(-4);
    this.floorOverlay.setBlendMode(Phaser.BlendModes.OVERLAY);
  }

  private renderAllCells(grid: Grid, levelData?: LevelData): void {
    const edgeColor = this.getEdgeColor();
    const hasBackgroundConfig = !!levelData?.background;
    const pathTexture = levelData?.background?.path_texture;
    const radius = this.cellSize * 0.4;

    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.getCell(col, row);

        const levelCell = levelData?.cells.find(c => c.col === col && c.row === row);
        const hasTexture = !!levelCell?.backgroundTexture;

        const isStairs = cell?.properties.has('stairs');
        const isElevated = cell && grid.getLayer(cell) >= 1;
        const isWall = cell?.properties.has('wall');
        const isPlatform = cell?.properties.has('platform');
        const isPath = cell?.properties.has('path');
        const isWater = cell?.properties.has('water');

        const x = col * this.cellSize;
        const y = row * this.cellSize;

        if ((isPath || isWater) && !this.isCached) {
          const pathTexture = isWater ? levelData?.background?.water_texture : levelData?.background?.path_texture;
          const edgesTexture = isWater ? levelData?.background?.water_texture_edges : undefined;

          if (pathTexture && this.scene.textures.exists(pathTexture)) {
          const cellX = col * this.cellSize;
          const cellY = row * this.cellSize;
          const centerX = cellX + this.cellSize / 2;
          const centerY = cellY + this.cellSize / 2;

          const propertyType = isWater ? 'water' : 'path';

          const hasLeft = col > 0 && grid.getCell(col - 1, row)?.properties.has(propertyType);
          const hasRight = col < grid.width - 1 && grid.getCell(col + 1, row)?.properties.has(propertyType);
          const hasUp = row > 0 && grid.getCell(col, row - 1)?.properties.has(propertyType);
          const hasDown = row < grid.height - 1 && grid.getCell(col, row + 1)?.properties.has(propertyType);

          // Check diagonals for interior detection
          const hasUpLeft = col > 0 && row > 0 && grid.getCell(col - 1, row - 1)?.properties.has(propertyType);
          const hasUpRight = col < grid.width - 1 && row > 0 && grid.getCell(col + 1, row - 1)?.properties.has(propertyType);
          const hasDownLeft = col > 0 && row < grid.height - 1 && grid.getCell(col - 1, row + 1)?.properties.has(propertyType);
          const hasDownRight = col < grid.width - 1 && row < grid.height - 1 && grid.getCell(col + 1, row + 1)?.properties.has(propertyType);

          const hasAllNeighbors = hasLeft && hasRight && hasUp && hasDown &&
                                   hasUpLeft && hasUpRight && hasDownLeft && hasDownRight;

          const adjacentCount = [hasUp, hasRight, hasDown, hasLeft].filter(Boolean).length;

          let frame = 0;

          if (!hasAllNeighbors) {
            const count = adjacentCount;

            if (count === 1) {
              if (hasUp) frame = 1;
              else if (hasRight) frame = 2;
              else if (hasDown) frame = 3;
              else if (hasLeft) frame = 4;
            } else if (count === 2) {
              if (hasUp && hasDown) frame = 5;
              else if (hasLeft && hasRight) frame = 6;
              else if (hasUp && hasRight) frame = hasUpRight ? 8 : 7;
              else if (hasUp && hasLeft) frame = hasUpLeft ? 10 : 9;
              else if (hasDown && hasRight) frame = hasDownRight ? 12 : 11;
              else if (hasDown && hasLeft) frame = hasDownLeft ? 14 : 13;
            } else if (count === 3) {
              if (hasUp && hasRight && hasDown) {
                const idx = (hasUpRight ? 1 : 0) | (hasDownRight ? 2 : 0);
                frame = 15 + idx;
              } else if (hasUp && hasRight && hasLeft) {
                const idx = (hasUpRight ? 1 : 0) | (hasUpLeft ? 2 : 0);
                frame = 19 + idx;
              } else if (hasUp && hasDown && hasLeft) {
                const idx = (hasUpLeft ? 1 : 0) | (hasDownLeft ? 2 : 0);
                frame = 23 + idx;
              } else if (hasRight && hasDown && hasLeft) {
                const idx = (hasDownRight ? 1 : 0) | (hasDownLeft ? 2 : 0);
                frame = 27 + idx;
              }
            } else if (count === 4) {
              const idx = (hasUpLeft ? 1 : 0) | (hasUpRight ? 2 : 0) | (hasDownLeft ? 4 : 0) | (hasDownRight ? 8 : 0);
              frame = 31 + idx;
            }
          }

          if (isWater && edgesTexture && this.scene.textures.exists(edgesTexture)) {
            const tileSprite = this.scene.add.tileSprite(centerX, centerY, this.cellSize, this.cellSize, pathTexture, frame);
            tileSprite.setDepth(-10);

            const edgeSprite = this.scene.add.sprite(centerX, centerY, edgesTexture, frame);
            edgeSprite.setDisplaySize(this.cellSize, this.cellSize);
            edgeSprite.setDepth(-9);
            this.cellSprites.push(edgeSprite);
          } else {
             const sprite = this.scene.add.sprite(centerX, centerY, pathTexture, frame);
            sprite.setDisplaySize(this.cellSize, this.cellSize);
            sprite.setDepth(-10);
            this.cellSprites.push(sprite);
          }
          }
        }

        if (isElevated || isStairs) {
          // Render textures from background config (cache on first render)
          if (hasBackgroundConfig && levelData.background && !this.isCached) {
            if (isStairs && levelData.background?.stairs_texture && this.scene.textures.exists(levelData.background.stairs_texture)) {
              const sprite = this.scene.add.image(x + this.cellSize / 2, y + this.cellSize / 2, levelData.background.stairs_texture);
              sprite.setDisplaySize(this.cellSize, this.cellSize);
              sprite.setDepth(-5);
              this.cellSprites.push(sprite);
            } else if (isWall && levelData.background?.wall_texture && this.scene.textures.exists(levelData.background.wall_texture)) {
              const sprite = this.scene.add.image(x + this.cellSize / 2, y + this.cellSize / 2, levelData.background.wall_texture);
              sprite.setDisplaySize(this.cellSize, this.cellSize);
              sprite.setDepth(-5);
              this.cellSprites.push(sprite);
            }
          }

          // Platform overlay (draw every frame)
          if (isPlatform) {
            if (hasBackgroundConfig && levelData.background?.platform_texture && !levelData.background.platform_tile) {
              const sprite = this.scene.add.image(x + this.cellSize / 2, y + this.cellSize / 2, levelData.background.platform_texture);
              sprite.setDisplaySize(this.cellSize, this.cellSize);
              sprite.setDepth(-5);
              this.cellSprites.push(sprite);
            } else if (!levelData?.background?.platform_tile) {
              this.graphics.fillStyle(0x000000, 0.3);
              this.graphics.fillRect(x, y, this.cellSize, this.cellSize);
            }
          }

          // Fallback: render stairs with lines if no texture
          if (isStairs && (!hasBackgroundConfig || !levelData?.background?.stairs_texture) && !hasTexture) {
            this.graphics.lineStyle(8, edgeColor, 1);
            this.graphics.strokeLineShape(new Phaser.Geom.Line(x, y, x + this.cellSize, y));

            const numSteps = 5;
            const stepHeight = this.cellSize / numSteps;

            for (let step = 0; step < numSteps; step++) {
              const stepY = y + step * stepHeight;

              const brightness = 1 - (step / (numSteps - 1)) * 0.5;
              const shadedColor = 0x4a4a5e - 0x202020 + Math.floor(0x202020 * brightness);

              this.graphics.fillStyle(shadedColor, 1);
              this.graphics.fillRect(x, stepY, this.cellSize, stepHeight);

              this.graphics.lineStyle(2, edgeColor, 1);
              this.graphics.strokeLineShape(new Phaser.Geom.Line(x, stepY, x + this.cellSize, stepY));
            }
          }

          // Fallback: render walls with pattern if no texture
          if (isWall && (!hasBackgroundConfig || !levelData?.background?.wall_texture) && !hasTexture) {
            const brickHeight = 10;
            const brickWidth = this.cellSize / 3;
            let currentY = y;
            let rowIndex = 0;

            while (currentY < y + this.cellSize) {
              const offset = (rowIndex % 2) * (brickWidth / 2);
              const actualHeight = Math.min(brickHeight, y + this.cellSize - currentY);

              for (let brickX = x - offset; brickX < x + this.cellSize + brickWidth; brickX += brickWidth) {
                const startX = Math.max(x, brickX);
                const endX = Math.min(x + this.cellSize, brickX + brickWidth - 2);

                if (startX < endX) {
                  this.graphics.fillStyle(0x3a3a4e, 1);
                  this.graphics.fillRect(startX, currentY, endX - startX, actualHeight);

                  this.graphics.lineStyle(2, edgeColor, 1);
                  this.graphics.strokeRect(startX, currentY, endX - startX, actualHeight);
                }
              }

              currentY += brickHeight;
              rowIndex++;
            }
          }
        }
      }
    }

    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.getCell(col, row);
        const isPath = cell?.properties.has('path');

        if (isPath && !pathTexture) {
          const x = col * this.cellSize;
          const y = row * this.cellSize;
          const centerX = x + this.cellSize / 2;
          const centerY = y + this.cellSize / 2;
          const pathColor = 0x888888;
          const outlineColor = 0x000000;

          const hasLeft = col > 0 && grid.getCell(col - 1, row)?.properties.has('path');
          const hasRight = col < grid.width - 1 && grid.getCell(col + 1, row)?.properties.has('path');
          const hasUp = row > 0 && grid.getCell(col, row - 1)?.properties.has('path');
          const hasDown = row < grid.height - 1 && grid.getCell(col, row + 1)?.properties.has('path');

          this.graphics.fillStyle(pathColor, 1);

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

          this.graphics.fillCircle(centerX, centerY, radius);

          this.graphics.lineStyle(2, outlineColor, 1);
          this.graphics.strokeCircle(centerX, centerY, radius);
        }
      }
    }
  }

  private renderGreyPaths(grid: Grid): void {
    this.renderPathType(grid, 'path', 0x888888, 0x000000);
    this.renderPathType(grid, 'water', 0x4488ff, 0x000000);
  }

  private renderPathType(grid: Grid, propertyType: CellProperty, fillColor: number, outlineColor: number): void {
    const radius = this.cellSize * 0.4;

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

    this.graphics.lineStyle(3, outlineColor, 1);
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

  private renderEdges(grid: Grid): void {
    const edgeThickness = 4;
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

  private renderEdgeDarkening(grid: Grid, levelData?: LevelData): void {
    const config = levelData?.background?.edgeDarkening;
    if (!config) return;

    const darkenSteps = config.depth;
    const maxIntensity = config.intensity;
    const stepsPerCell = 4;

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

              if (alpha > 0.01) {
                this.edgeGraphics.fillStyle(0x000000, alpha);
                this.edgeGraphics.fillRect(subX, subY, stepSize, stepSize);
              }
            }
          }
        }
      }
    }
  }

  private renderShadows(grid: Grid): void {
    const shadowWidth = 64;
    const shadowSteps = 32;
    const shadowIntensity = 0.45;

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
