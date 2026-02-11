import type { Grid } from '../../systems/grid/Grid';
import type { LevelData } from '../../systems/level/LevelLoader';
import { GameSceneRenderer } from './GameSceneRenderer';

const LAYER1_FILL_COLOR = 0x4a4a5e;
const LAYER1_EDGE_COLOR = 0x2a2a3e;
const LAYER1_BRICK_FILL_COLOR = 0x3a3a4e;

export class DungeonSceneRenderer extends GameSceneRenderer {
  private floorOverlay: Phaser.GameObjects.Image | null = null;

  constructor(scene: Phaser.Scene, private readonly cellSize: number) {
    super(scene);
  }

  protected getEdgeColor(): number {
    return LAYER1_EDGE_COLOR;
  }

  protected getPlatformFillColor(): number {
    return LAYER1_FILL_COLOR;
  }

  renderGrid(grid: Grid, levelData?: LevelData): void {
    this.graphics.clear();
    this.edgeGraphics.clear();
    this.renderDefaultFloor(grid, levelData);
    this.renderPlatformTextures(grid, levelData);
    this.renderStairsTextures(grid, levelData);
    this.renderWallTextures(grid, levelData);
    this.renderTransitionSteps(grid, levelData);
    this.renderPlatformsAndWalls(grid, this.cellSize, levelData);
    this.renderShadows(grid);

    // Only create overlay once
    if (!this.floorOverlay) {
      this.renderFloorOverlay(grid, levelData);
    }
  }

  protected renderWallPattern(x: number, y: number, cellSize: number, _topBarY: number, _seed: number): void {
    const brickHeight = 10;
    const brickWidth = cellSize / 3;
    let currentY = y;
    let rowIndex = 0;

    while (currentY < y + cellSize) {
      const offset = (rowIndex % 2) * (brickWidth / 2);
      const actualHeight = Math.min(brickHeight, y + cellSize - currentY);

      for (let brickX = x - offset; brickX < x + cellSize + brickWidth; brickX += brickWidth) {
        const startX = Math.max(x, brickX);
        const endX = Math.min(x + cellSize, brickX + brickWidth - 2);

        if (startX < endX) {
          this.graphics.fillStyle(LAYER1_BRICK_FILL_COLOR, 1);
          this.graphics.fillRect(startX, currentY, endX - startX, actualHeight);

          this.graphics.lineStyle(2, LAYER1_EDGE_COLOR, 1);
          this.graphics.strokeRect(startX, currentY, endX - startX, actualHeight);
        }
      }

      currentY += brickHeight;
      rowIndex++;
    }
  }

  renderTheme(width: number, height: number): { background: Phaser.GameObjects.Image; vignette: Phaser.GameObjects.Image } {
    return this.renderDungeon(width, height);
  }

  private renderDungeon(width: number, height: number): { background: Phaser.GameObjects.Image; vignette: Phaser.GameObjects.Image } {
    const worldWidth = width * this.cellSize;
    const worldHeight = height * this.cellSize;

    if (this.scene.textures.exists('gradient')) {
      this.scene.textures.remove('gradient');
    }

    const MAX_TEXTURE_SIZE = 2048;
    const canvasWidth = Math.min(worldWidth, MAX_TEXTURE_SIZE);
    const canvasHeight = Math.min(worldHeight, MAX_TEXTURE_SIZE);

    const canvas = this.scene.textures.createCanvas('gradient', canvasWidth, canvasHeight);
    const ctx = canvas?.context;
    if (!ctx) throw new Error('Failed to create canvas context');

    const centerX = worldWidth / 2;
    const centerY = worldHeight / 2;
    const maxRadius = Math.hypot(centerX, centerY);

    const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
    bgGradient.addColorStop(0, '#282b0e');
    bgGradient.addColorStop(0.4, '#c0c4ae');
    bgGradient.addColorStop(0.7, '#405974');
    bgGradient.addColorStop(1, '#a36802');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, worldWidth, worldHeight);

    for (let i = 0; i < 2; i++) {
      const startX = Math.random() * worldWidth;
      const startY = Math.random() * worldHeight;
      const segments = Math.floor(Math.random() * 5) + 3;

      const color = this.varyColor('#333333', 40);
      ctx.strokeStyle = `rgba(${color.r},${color.g},${color.b},${Math.random() * 0.2 + 0.1})`;
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.moveTo(startX, startY);

      let currentX = startX;
      let currentY = startY;

      for (let j = 0; j < segments; j++) {
        const angle = Math.random() * Math.PI * 2;
        const length = Math.random() * 14 + 5;
        currentX += Math.cos(angle) * length;
        currentY += Math.sin(angle) * length;
        ctx.lineTo(currentX, currentY);
      }

      ctx.stroke();
    }

    for (let i = 0; i < 2; i++) {
      const x = Math.random() * worldWidth;
      const y = Math.random() * worldHeight;
      const radius = Math.random() * 2 + 1;

      const color = this.varyColor('#827373', 30);
      ctx.strokeStyle = `rgba(${color.r},${color.g},${color.b},${Math.random() * 0.3 + 0.1})`;
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    canvas?.refresh();

    const background = this.scene.add.image(0, 0, 'gradient');
    background.setOrigin(0, 0);
    background.setDisplaySize(worldWidth, worldHeight);
    background.setDepth(-1000);

    const vignette = this.scene.add.image(worldWidth / 2, worldHeight / 2, 'vin');
    vignette.setDisplaySize(worldWidth, worldHeight);
    vignette.setDepth(1000);
    vignette.setAlpha(0.2);
    vignette.setTint(0x221111);
    vignette.setBlendMode(2);

    return { background, vignette };
  }

  private renderFloorOverlay(grid: Grid, _levelData?: LevelData): void {
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
    bgGradient.addColorStop(0, 'rgba(40, 43, 14, 0.6)');
    bgGradient.addColorStop(0.4, 'rgba(192, 196, 174, 0.6)');
    bgGradient.addColorStop(0.7, 'rgba(64, 89, 116, 0.6)');
    bgGradient.addColorStop(1, 'rgba(163, 104, 2, 0.6)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, worldWidth, worldHeight);

    canvas?.refresh();

    this.floorOverlay = this.scene.add.image(0, 0, 'floor_gradient_overlay');
    this.floorOverlay.setOrigin(0, 0);
    this.floorOverlay.setDisplaySize(worldWidth, worldHeight);
    this.floorOverlay.setDepth(-4);
    this.floorOverlay.setBlendMode(Phaser.BlendModes.OVERLAY);
  }

  private renderDefaultFloor(grid: Grid, levelData?: LevelData): void {
    if (!levelData?.background) return;
    
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
      }
    }
  }

  private renderPlatformTextures(grid: Grid, levelData?: LevelData): void {
    if (!levelData?.background) return;
    
    const chunkSize = 4;
    
    for (let row = 0; row < grid.height; row += chunkSize) {
      for (let col = 0; col < grid.width; col += chunkSize) {
        let allPlatforms = true;
        
        // Check if all cells in chunk are platforms
        for (let r = row; r < Math.min(row + chunkSize, grid.height) && allPlatforms; r++) {
          for (let c = col; c < Math.min(col + chunkSize, grid.width) && allPlatforms; c++) {
            const cell = grid.getCell(c, r);
            if (!cell || !cell.properties.has('platform')) {
              allPlatforms = false;
              break;
            }
            const levelCell = levelData.cells.find(lc => lc.col === c && lc.row === r);
            if (levelCell?.backgroundTexture) {
              allPlatforms = false;
              break;
            }
          }
        }
        
        if (allPlatforms) {
          const x = col * this.cellSize;
          const y = row * this.cellSize;
          const width = Math.min(chunkSize, grid.width - col) * this.cellSize;
          const height = Math.min(chunkSize, grid.height - row) * this.cellSize;
          
          this.graphics.fillStyle(0x000000, 0.3);
          this.graphics.fillRect(x, y, width, height);
        }
      }
    }
  }

  private renderStairsTextures(grid: Grid, levelData?: LevelData): void {
    if (!levelData?.background) return;
    
    const texture = levelData.background.stairs_texture;
    
    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.getCell(col, row);
        if (!cell || !grid.isTransition(cell)) continue;
        
        const levelCell = levelData.cells.find(c => c.col === col && c.row === row);
        if (levelCell?.backgroundTexture) continue;
        
        const x = col * this.cellSize;
        const y = row * this.cellSize;
        
        const sprite = this.scene.add.image(x + this.cellSize / 2, y + this.cellSize / 2, texture);
        sprite.setDisplaySize(this.cellSize, this.cellSize);
        sprite.setDepth(-5);
      }
    }
  }

  private renderWallTextures(grid: Grid, levelData?: LevelData): void {
    if (!levelData?.background) return;
    
    const texture = levelData.background.wall_texture;
    
    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.getCell(col, row);
        if (!cell || !cell.properties.has('wall')) continue;
        
        const levelCell = levelData.cells.find(c => c.col === col && c.row === row);
        if (levelCell?.backgroundTexture) continue;
        
        const x = col * this.cellSize;
        const y = row * this.cellSize;
        
        const sprite = this.scene.add.image(x + this.cellSize / 2, y + this.cellSize / 2, texture);
        sprite.setDisplaySize(this.cellSize, this.cellSize);
        sprite.setDepth(-5);
      }
    }
  }

  private varyColor(hexColor: string, variationPercent: number): { r: number; g: number; b: number } {
    const r = Number.parseInt(hexColor.slice(1, 3), 16);
    const g = Number.parseInt(hexColor.slice(3, 5), 16);
    const b = Number.parseInt(hexColor.slice(5, 7), 16);

    const brightnessMultiplier = 1 + (Math.random() - 0.5) * 2 * (variationPercent / 100);

    return {
      r: Math.max(0, Math.min(255, Math.round(r * brightnessMultiplier))),
      g: Math.max(0, Math.min(255, Math.round(g * brightnessMultiplier))),
      b: Math.max(0, Math.min(255, Math.round(b * brightnessMultiplier)))
    };
  }

  private renderTransitionSteps(grid: Grid, levelData?: LevelData): void {
    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.getCell(col, row);
        if (cell && grid.isTransition(cell)) {
          const levelCell = levelData?.cells.find(c => c.col === col && c.row === row);
          if (levelCell?.backgroundTexture) {
            continue;
          }
          
          // Skip if background config has stairs texture
          if (levelData?.background?.stairs_texture) {
            continue;
          }

          const x = col * grid.cellSize;
          const y = row * grid.cellSize;

          // Draw top edge line at very top
          this.graphics.lineStyle(8, LAYER1_EDGE_COLOR, 1);
          this.graphics.strokeLineShape(new Phaser.Geom.Line(x, y, x + grid.cellSize, y));

          const numSteps = 5;
          const stepHeight = grid.cellSize / numSteps;

          for (let step = 0; step < numSteps; step++) {
            const stepY = y + step * stepHeight;

            const brightness = 1 - (step / (numSteps - 1)) * 0.5;
            const baseColor = LAYER1_FILL_COLOR;
            const darkenAmount = 0x202020;
            const shadedColor = baseColor - darkenAmount + Math.floor(darkenAmount * brightness);

            this.graphics.fillStyle(shadedColor, 1);
            this.graphics.fillRect(x, stepY, grid.cellSize, stepHeight);

            this.graphics.lineStyle(2, LAYER1_EDGE_COLOR, 1);
            this.graphics.strokeLineShape(new Phaser.Geom.Line(x, stepY, x + grid.cellSize, stepY));
          }
        }
      }
    }
  }

  // eslint-disable-next-line complexity
  private renderShadows(grid: Grid): void {
    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const cell = grid.getCell(col, row);
        if (cell && grid.getLayer(cell) >= 1) {
          const x = col * grid.cellSize;
          const y = row * grid.cellSize;
          const shadowWidth = 24;
          const shadowSteps = 24;
          const currentLayer = grid.getLayer(cell);

          if (col < grid.width - 1) {
            const rightCell = grid.cells[row][col + 1];
            const rightIsLower = grid.getLayer(rightCell) < currentLayer && !grid.isTransition(rightCell);

            // eslint-disable-next-line max-depth
            if (rightIsLower) {
              // eslint-disable-next-line max-depth
              for (let i = 0; i < shadowSteps; i++) {
                const alpha = 0.4 * (1 - i / shadowSteps);
                const stepWidth = shadowWidth / shadowSteps;
                this.graphics.fillStyle(0x000000, alpha);
                this.graphics.fillRect(x + grid.cellSize + i * stepWidth, y, stepWidth, grid.cellSize);
              }
            }
          }

          if (row < grid.height - 1 && grid.getLayer(grid.cells[row + 1][col]) < currentLayer && !grid.isTransition(grid.cells[row + 1][col])) {
            // eslint-disable-next-line max-depth
            for (let i = 0; i < shadowSteps; i++) {
              const alpha = 0.4 * (1 - i / shadowSteps);
              const stepHeight = shadowWidth / shadowSteps;
              this.graphics.fillStyle(0x000000, alpha);
              this.graphics.fillRect(x, y + grid.cellSize + i * stepHeight, grid.cellSize, stepHeight);
            }
          }

          if (col < grid.width - 1 && row < grid.height - 1) {
            const diagCell = grid.cells[row + 1][col + 1];
            const rightCell = grid.cells[row][col + 1];
            const belowCell = grid.cells[row + 1][col];

            const diagIsLower = grid.getLayer(diagCell) < currentLayer && !grid.isTransition(diagCell);
            const rightIsLower = grid.getLayer(rightCell) < currentLayer && !grid.isTransition(rightCell);
            const belowIsLower = grid.getLayer(belowCell) < currentLayer && !grid.isTransition(belowCell);

            // eslint-disable-next-line max-depth
            if (diagIsLower && rightIsLower && belowIsLower) {
              // eslint-disable-next-line max-depth
              for (let i = 0; i < shadowSteps; i++) {
                // eslint-disable-next-line max-depth
                for (let j = 0; j < shadowSteps; j++) {
                  const alpha = 0.4 * (1 - Math.max(i, j) / shadowSteps);
                  const stepSize = shadowWidth / shadowSteps;
                  this.graphics.fillStyle(0x000000, alpha);
                  this.graphics.fillRect(
                    x + grid.cellSize + i * stepSize,
                    y + grid.cellSize + j * stepSize,
                    stepSize,
                    stepSize
                  );
                }
              }
            }
          }
        }
      }
    }
  }
}
