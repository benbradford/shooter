const TILE_SIZE_PX = 64;
const TILESET_COLS = 8;
const TILESET_ROWS = 6;

type FlowDirection = 'left' | 'right' | 'up' | 'down';

export type WaterConfig = {
  sourceImage: string;
  flowDirection: FlowDirection;
  numFrames: number;
  animSpeedMs: number;
}

export class WaterAnimator {
  private readonly generatedTextureKeys: string[] = [];
  private animationTimerMs: number = 0;
  private currentFrameIndex: number = 0;
  private tilesetKeys: string[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly config: WaterConfig
  ) {}

  async generateTextures(): Promise<string[]> {
    const sourceKey = this.config.sourceImage;
    
    if (!this.scene.textures.exists(sourceKey)) {
      console.error(`[WaterAnimator] Source texture not found: ${sourceKey}`);
      return [];
    }

    const sourceTexture = this.scene.textures.get(sourceKey);
    const sourceImage = sourceTexture.getSourceImage() as HTMLImageElement;

    for (let frameIdx = 0; frameIdx < this.config.numFrames; frameIdx++) {
      const offsetPercent = frameIdx / this.config.numFrames;
      const tilesetKey = `${sourceKey}_flow_tileset_${frameIdx}`;

      const offsetCanvas = this.createOffsetTexture(sourceImage, offsetPercent);
      const tilesetCanvas = this.generateTilesetFromCanvas(offsetCanvas);
      
      const canvasTexture = this.scene.textures.createCanvas(tilesetKey, tilesetCanvas.width, tilesetCanvas.height);
      if (canvasTexture) {
        canvasTexture.draw(0, 0, tilesetCanvas);
        canvasTexture.refresh();
        
        this.scene.textures.addSpriteSheet(tilesetKey, canvasTexture, {
          frameWidth: TILE_SIZE_PX,
          frameHeight: TILE_SIZE_PX
        });
      }
      
      this.generatedTextureKeys.push(tilesetKey);
      this.tilesetKeys.push(tilesetKey);
    }

    return this.tilesetKeys;
  }

  private createOffsetTexture(sourceImage: HTMLImageElement, offsetPercent: number): HTMLCanvasElement {
    const width = sourceImage.width;
    const height = sourceImage.height;
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const dir = this.config.flowDirection;
    const offsetX = dir === 'left' ? -Math.floor(width * offsetPercent) : dir === 'right' ? Math.floor(width * offsetPercent) : 0;
    const offsetY = dir === 'up' ? -Math.floor(height * offsetPercent) : dir === 'down' ? Math.floor(height * offsetPercent) : 0;

    if (dir === 'left' || dir === 'right') {
      const absOffsetX = Math.abs(offsetX);
      ctx.drawImage(sourceImage, absOffsetX, 0, width - absOffsetX, height, 0, 0, width - absOffsetX, height);
      ctx.drawImage(sourceImage, 0, 0, absOffsetX, height, width - absOffsetX, 0, absOffsetX, height);
    } else {
      const absOffsetY = Math.abs(offsetY);
      ctx.drawImage(sourceImage, 0, absOffsetY, width, height - absOffsetY, 0, 0, width, height - absOffsetY);
      ctx.drawImage(sourceImage, 0, 0, width, absOffsetY, 0, height - absOffsetY, width, absOffsetY);
    }

    return canvas;
  }

  private generateTilesetFromCanvas(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
    const tilesetWidth = TILESET_COLS * TILE_SIZE_PX;
    const tilesetHeight = TILESET_ROWS * TILE_SIZE_PX;
    
    const canvas = document.createElement('canvas');
    canvas.width = tilesetWidth;
    canvas.height = tilesetHeight;
    const ctx = canvas.getContext('2d')!;

    const TILE_CONFIGS = this.getTileConfigs();

    for (let tileIdx = 0; tileIdx < TILE_CONFIGS.length; tileIdx++) {
      const tileCol = tileIdx % TILESET_COLS;
      const tileRow = Math.floor(tileIdx / TILESET_COLS);
      const tileX = tileCol * TILE_SIZE_PX;
      const tileY = tileRow * TILE_SIZE_PX;

      this.drawPathTile(ctx, sourceCanvas, tileX, tileY, TILE_CONFIGS[tileIdx]);
    }

    return canvas;
  }

  private getTileConfigs(): boolean[][] {
    const configs: boolean[][] = [];
    
    configs.push([false, false, false, false, false, false, false, false]);
    configs.push([true, false, false, false, false, false, false, false]);
    configs.push([false, true, false, false, false, false, false, false]);
    configs.push([false, false, true, false, false, false, false, false]);
    configs.push([false, false, false, true, false, false, false, false]);
    configs.push([true, false, true, false, false, false, false, false]);
    configs.push([false, true, false, true, false, false, false, false]);
    
    configs.push([true, true, false, false, false, false, false, false]);
    configs.push([true, true, false, false, false, true, false, false]);
    configs.push([true, false, false, true, false, false, false, false]);
    configs.push([true, false, false, true, true, false, false, false]);
    configs.push([false, true, true, false, false, false, false, false]);
    configs.push([false, true, true, false, false, false, false, true]);
    configs.push([false, false, true, true, false, false, false, false]);
    configs.push([false, false, true, true, false, false, true, false]);
    
    for (let i = 0; i < 4; i++) {
      const hasNE = (i & 1) !== 0;
      const hasSE = (i & 2) !== 0;
      configs.push([true, true, true, false, false, hasNE, false, hasSE]);
    }
    
    for (let i = 0; i < 4; i++) {
      const hasNE = (i & 1) !== 0;
      const hasNW = (i & 2) !== 0;
      configs.push([true, true, false, true, hasNW, hasNE, false, false]);
    }
    
    for (let i = 0; i < 4; i++) {
      const hasNW = (i & 1) !== 0;
      const hasSW = (i & 2) !== 0;
      configs.push([true, false, true, true, hasNW, false, hasSW, false]);
    }
    
    for (let i = 0; i < 4; i++) {
      const hasSE = (i & 1) !== 0;
      const hasSW = (i & 2) !== 0;
      configs.push([false, true, true, true, false, false, hasSW, hasSE]);
    }
    
    for (let i = 0; i < 16; i++) {
      const hasNW = (i & 1) !== 0;
      const hasNE = (i & 2) !== 0;
      const hasSW = (i & 4) !== 0;
      const hasSE = (i & 8) !== 0;
      configs.push([true, true, true, true, hasNW, hasNE, hasSW, hasSE]);
    }
    
    return configs;
  }

  private drawPathTile(ctx: CanvasRenderingContext2D, sourceCanvas: HTMLCanvasElement, x: number, y: number, config: boolean[]): void {
    const [north, east, south, west, hasNW = false, hasNE = false, hasSW = false, hasSE = false] = config;
    const radius = TILE_SIZE_PX * 0.4;
    const centerX = x + TILE_SIZE_PX / 2;
    const centerY = y + TILE_SIZE_PX / 2;

    const adjacentCount = [north, east, south, west].filter(Boolean).length;
    const isDeadEnd = adjacentCount === 1;

    if (adjacentCount === 0) {
      ctx.drawImage(sourceCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height, x, y, TILE_SIZE_PX, TILE_SIZE_PX);
      return;
    }

    ctx.save();
    ctx.beginPath();

    const innerRadius = TILE_SIZE_PX / 2 - radius;

    if (west) ctx.rect(x, centerY - radius, TILE_SIZE_PX / 2 + 1, radius * 2);
    if (east) ctx.rect(centerX - 1, centerY - radius, TILE_SIZE_PX / 2 + 1, radius * 2);
    if (north) ctx.rect(centerX - radius, y, radius * 2, TILE_SIZE_PX / 2 + 1);
    if (south) ctx.rect(centerX - radius, centerY - 1, radius * 2, TILE_SIZE_PX / 2 + 1);

    if (west && north) {
      if (!hasNW) {
        ctx.moveTo(x, y + innerRadius);
        ctx.arc(x, y, innerRadius, Math.PI / 2, 0, true);
        ctx.lineTo(x, y);
        ctx.lineTo(x + innerRadius, y);
        ctx.closePath();
      } else {
        ctx.rect(x, y, TILE_SIZE_PX / 2 - radius, TILE_SIZE_PX / 2 - radius);
      }
    }
    if (east && north) {
      if (!hasNE) {
        ctx.moveTo(x + TILE_SIZE_PX - innerRadius, y);
        ctx.lineTo(x + TILE_SIZE_PX, y);
        ctx.lineTo(x + TILE_SIZE_PX, y + innerRadius);
        ctx.arc(x + TILE_SIZE_PX, y, innerRadius, Math.PI / 2, Math.PI, true);
        ctx.closePath();
      } else {
        ctx.rect(centerX + radius, y, TILE_SIZE_PX / 2 - radius, TILE_SIZE_PX / 2 - radius);
      }
    }
    if (west && south) {
      if (!hasSW) {
        ctx.moveTo(x, y + TILE_SIZE_PX - innerRadius);
        ctx.lineTo(x, y + TILE_SIZE_PX);
        ctx.lineTo(x + innerRadius, y + TILE_SIZE_PX);
        ctx.arc(x, y + TILE_SIZE_PX, innerRadius, 0, Math.PI / 2);
        ctx.closePath();
      } else {
        ctx.rect(x, centerY + radius, TILE_SIZE_PX / 2 - radius, TILE_SIZE_PX / 2 - radius);
      }
    }
    if (east && south) {
      if (!hasSE) {
        ctx.moveTo(x + TILE_SIZE_PX - innerRadius, y + TILE_SIZE_PX);
        ctx.arc(x + TILE_SIZE_PX, y + TILE_SIZE_PX, innerRadius, Math.PI, Math.PI / 2, true);
        ctx.lineTo(x + TILE_SIZE_PX, y + TILE_SIZE_PX);
        ctx.closePath();
      } else {
        ctx.rect(centerX + radius, centerY + radius, TILE_SIZE_PX / 2 - radius, TILE_SIZE_PX / 2 - radius);
      }
    }

    if (isDeadEnd) {
      ctx.rect(centerX - radius, centerY - radius, radius * 2, radius * 2);
    } else {
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    }

    ctx.clip();
    ctx.drawImage(sourceCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height, x, y, TILE_SIZE_PX, TILE_SIZE_PX);
    ctx.restore();

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;

    if (isDeadEnd) {
      if (west) {
        ctx.beginPath();
        ctx.moveTo(centerX - radius, centerY - radius);
        ctx.lineTo(centerX - radius, y);
        ctx.moveTo(centerX + radius, centerY - radius);
        ctx.lineTo(centerX + radius, y);
        ctx.moveTo(centerX - radius, centerY + radius);
        ctx.lineTo(centerX + radius, centerY + radius);
        ctx.stroke();
      } else if (east) {
        ctx.beginPath();
        ctx.moveTo(centerX - radius, centerY - radius);
        ctx.lineTo(centerX - radius, y);
        ctx.moveTo(centerX + radius, centerY - radius);
        ctx.lineTo(centerX + radius, y);
        ctx.moveTo(centerX - radius, centerY + radius);
        ctx.lineTo(centerX + radius, centerY + radius);
        ctx.stroke();
      } else if (north) {
        ctx.beginPath();
        ctx.moveTo(centerX - radius, y);
        ctx.lineTo(centerX - radius, centerY + radius);
        ctx.moveTo(centerX + radius, y);
        ctx.lineTo(centerX + radius, centerY + radius);
        ctx.moveTo(centerX - radius, centerY + radius);
        ctx.lineTo(centerX + radius, centerY + radius);
        ctx.stroke();
      } else if (south) {
        ctx.beginPath();
        ctx.moveTo(centerX - radius, centerY - radius);
        ctx.lineTo(centerX - radius, y + TILE_SIZE_PX);
        ctx.moveTo(centerX + radius, centerY - radius);
        ctx.lineTo(centerX + radius, y + TILE_SIZE_PX);
        ctx.moveTo(centerX - radius, centerY - radius);
        ctx.lineTo(centerX + radius, centerY - radius);
        ctx.stroke();
      }
    } else {
      if (!west && !north) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, Math.PI, -Math.PI / 2, false);
        ctx.stroke();
      } else if (!west && north) {
        ctx.beginPath();
        ctx.moveTo(centerX - radius, centerY);
        ctx.lineTo(centerX - radius, y);
        ctx.stroke();
      } else if (west && !north) {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - radius);
        ctx.lineTo(x, centerY - radius);
        ctx.stroke();
      }

      if (!east && !north) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, -Math.PI / 2, 0, false);
        ctx.stroke();
      } else if (!east && north) {
        ctx.beginPath();
        ctx.moveTo(centerX + radius, centerY);
        ctx.lineTo(centerX + radius, y);
        ctx.stroke();
      } else if (east && !north) {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - radius);
        ctx.lineTo(x + TILE_SIZE_PX, centerY - radius);
        ctx.stroke();
      }

      if (!west && !south) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, Math.PI / 2, Math.PI, false);
        ctx.stroke();
      } else if (!west && south) {
        ctx.beginPath();
        ctx.moveTo(centerX - radius, centerY);
        ctx.lineTo(centerX - radius, y + TILE_SIZE_PX);
        ctx.stroke();
      } else if (west && !south) {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY + radius);
        ctx.lineTo(x, centerY + radius);
        ctx.stroke();
      }

      if (!east && !south) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI / 2, false);
        ctx.stroke();
      } else if (!east && south) {
        ctx.beginPath();
        ctx.moveTo(centerX + radius, centerY);
        ctx.lineTo(centerX + radius, y + TILE_SIZE_PX);
        ctx.stroke();
      } else if (east && !south) {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY + radius);
        ctx.lineTo(x + TILE_SIZE_PX, centerY + radius);
        ctx.stroke();
      }

      if (west && north && !hasNW) {
        ctx.beginPath();
        ctx.arc(x, y, innerRadius, 0, Math.PI / 2, false);
        ctx.stroke();
      }
      if (east && north && !hasNE) {
        ctx.beginPath();
        ctx.arc(x + TILE_SIZE_PX, y, innerRadius, Math.PI / 2, Math.PI, false);
        ctx.stroke();
      }
      if (west && south && !hasSW) {
        ctx.beginPath();
        ctx.arc(x, y + TILE_SIZE_PX, innerRadius, -Math.PI / 2, 0, false);
        ctx.stroke();
      }
      if (east && south && !hasSE) {
        ctx.beginPath();
        ctx.arc(x + TILE_SIZE_PX, y + TILE_SIZE_PX, innerRadius, Math.PI, -Math.PI / 2, false);
        ctx.stroke();
      }
    }
  }

  update(delta: number, waterSprites: Array<Phaser.GameObjects.Sprite | Phaser.GameObjects.TileSprite>): void {
    if (this.config.numFrames <= 1 || waterSprites.length === 0) return;

    this.animationTimerMs += delta;

    if (this.animationTimerMs >= this.config.animSpeedMs) {
      this.animationTimerMs = 0;
      
      for (let i = 0; i < waterSprites.length; i++) {
        const frameIndex = i % this.config.numFrames;
        waterSprites[i].setVisible(frameIndex === this.currentFrameIndex);
      }
      
      this.currentFrameIndex = (this.currentFrameIndex + 1) % this.config.numFrames;
    }
  }

  getTilesetKeys(): string[] {
    return this.tilesetKeys;
  }

  destroy(): void {
    for (const key of this.generatedTextureKeys) {
      if (this.scene.textures.exists(key)) {
        this.scene.textures.remove(key);
      }
    }
    this.generatedTextureKeys.length = 0;
    this.tilesetKeys.length = 0;
  }
}
