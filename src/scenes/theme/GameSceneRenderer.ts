import type { Grid } from '../../systems/grid/Grid';
import type { LevelData } from '../../systems/level/LevelLoader';

export abstract class GameSceneRenderer {
  protected readonly graphics: Phaser.GameObjects.Graphics;
  protected readonly edgeGraphics: Phaser.GameObjects.Graphics;
  private floorOverlay: Phaser.GameObjects.Image | null = null;
  private readonly floorSprites: Phaser.GameObjects.Image[] = [];
  private readonly cellSprites: Phaser.GameObjects.Image[] = [];
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

    if (!this.isCached && levelData?.background) {
      const chunkSize = levelData.background.tile;
      const texture = levelData.background.floor_texture;

      for (let row = 0; row < grid.height; row += chunkSize) {
        for (let col = 0; col < grid.width; col += chunkSize) {
          const x = col * this.cellSize;
          const y = row * this.cellSize;
          const width = Math.min(chunkSize, grid.width - col) * this.cellSize;
          const height = Math.min(chunkSize, grid.height - row) * this.cellSize;

          const sprite = this.scene.add.image(x + width / 2, y + height / 2, texture);
          sprite.setDisplaySize(width, height);
          sprite.setDepth(-1000);
          this.floorSprites.push(sprite);
        }
      }

      this.renderAllCells(grid, levelData);
      this.isCached = true;
    } else if (this.isCached) {
      this.renderEdges(grid);
    }

    this.renderShadows(grid);

    if (!this.floorOverlay && levelData?.background) {
      this.renderFloorOverlay(grid, levelData);
    }
  }

  destroy(): void {
    this.graphics.destroy();
    this.edgeGraphics.destroy();
    if (this.floorOverlay) this.floorOverlay.destroy();
    this.floorSprites.forEach(s => s.destroy());
    this.cellSprites.forEach(s => s.destroy());
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

    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.getCell(col, row);

        const levelCell = levelData?.cells.find(c => c.col === col && c.row === row);
        const hasTexture = !!levelCell?.backgroundTexture;

        const isStairs = cell && grid.isTransition(cell);
        const isElevated = cell && grid.getLayer(cell) >= 1;
        const isWall = cell && cell.properties.has('wall');
        const isPlatform = cell && cell.properties.has('platform');

        const x = col * this.cellSize;
        const y = row * this.cellSize;

        if (hasTexture && levelCell?.backgroundTexture && !this.isCached) {
          const sprite = this.scene.add.image(x + this.cellSize / 2, y + this.cellSize / 2, levelCell.backgroundTexture);
          sprite.setDisplaySize(this.cellSize, this.cellSize);
          sprite.setDepth(-100);
          this.cellSprites.push(sprite);
        }

        if (isElevated || isStairs) {
          // Render textures from background config (cache on first render)
          if (hasBackgroundConfig && !hasTexture && levelData.background && !this.isCached) {
            if (isStairs && levelData.background.stairs_texture) {
              const sprite = this.scene.add.image(x + this.cellSize / 2, y + this.cellSize / 2, levelData.background.stairs_texture);
              sprite.setDisplaySize(this.cellSize, this.cellSize);
              sprite.setDepth(-5);
              this.cellSprites.push(sprite);
            } else if (isWall && levelData.background.wall_texture) {
              const sprite = this.scene.add.image(x + this.cellSize / 2, y + this.cellSize / 2, levelData.background.wall_texture);
              sprite.setDisplaySize(this.cellSize, this.cellSize);
              sprite.setDepth(-5);
              this.cellSprites.push(sprite);
            }
          }

          // Platform overlay (draw every frame)
          if (isPlatform) {
            if (hasBackgroundConfig && levelData.background?.platform_texture) {
              const sprite = this.scene.add.image(x + this.cellSize / 2, y + this.cellSize / 2, levelData.background.platform_texture);
              sprite.setDisplaySize(this.cellSize, this.cellSize);
              sprite.setDepth(-5);
              this.cellSprites.push(sprite);
            } else {
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
  }

  private renderEdges(grid: Grid): void {
    const edgeThickness = 4;
    const edgeColor = this.getEdgeColor();

    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.getCell(col, row);

        const isStairs = cell && grid.isTransition(cell);
        const isElevated = cell && grid.getLayer(cell) >= 1;
        const isWall = cell && cell.properties.has('wall');
        const isPlatform = cell && cell.properties.has('platform');

        if (isElevated || isStairs) {
          const x = col * this.cellSize;
          const y = row * this.cellSize;

          this.edgeGraphics.lineStyle(edgeThickness, edgeColor, 1);

          const currentLayer = grid.getLayer(cell);

          if (col < grid.width - 1) {
            const rightCell = grid.cells[row][col + 1];
            const rightLayer = grid.getLayer(rightCell);
            const rightIsLower = rightLayer < currentLayer && !grid.isTransition(rightCell);
            const rightIsPlatform = rightCell && rightCell.properties.has('platform');
            const rightIsStairs = rightCell && grid.isTransition(rightCell);
            const rightIsWall = rightCell && rightCell.properties.has('wall');

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
            const leftIsPlatform = leftCell && leftCell.properties.has('platform');
            const leftIsStairs = leftCell && grid.isTransition(leftCell);
            const leftIsWall = leftCell && leftCell.properties.has('wall');

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
            const topIsPlatform = topCell && topCell.properties.has('platform');
            const topIsStairs = topCell && grid.isTransition(topCell);
            const topIsWall = topCell && topCell.properties.has('wall');

            if (((topIsLower || (isWall && topIsPlatform && !topIsStairs) || (isStairs && topIsWall) || (isWall && topIsStairs)) && !isStairs) || (isPlatform && topIsStairs)) {
              this.edgeGraphics.strokeLineShape(new Phaser.Geom.Line(x, y, x + this.cellSize, y));
            }
          }

          if (row < grid.height - 1 && !isStairs) {
            const bottomCell = grid.cells[row + 1][col];
            const bottomLayer = grid.getLayer(bottomCell);
            const bottomIsLower = bottomLayer < currentLayer && !grid.isTransition(bottomCell);
            const bottomIsPlatform = bottomCell && bottomCell.properties.has('platform');
            const bottomIsStairs = bottomCell && grid.isTransition(bottomCell);

            if (bottomIsLower || (isWall && bottomIsPlatform && !bottomIsStairs)) {
              this.edgeGraphics.strokeLineShape(new Phaser.Geom.Line(x, y + this.cellSize, x + this.cellSize, y + this.cellSize));
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
