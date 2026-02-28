const TILE_SIZE_PX = 64;
const TILESET_COLS = 8;

export class PathTilesetGenerator {
  constructor(private readonly scene: Phaser.Scene) {}

  generateTileset(sourceKey: string, outputKey: string): boolean {
    if (!this.scene.textures.exists(sourceKey)) {
      console.error(`[PathTilesetGenerator] Source texture not found: ${sourceKey}`);
      return false;
    }

    if (this.scene.textures.exists(outputKey)) {
      return true;
    }

    const sourceTexture = this.scene.textures.get(sourceKey);
    const sourceImage = sourceTexture.getSourceImage();
    
    let sourceCanvas: HTMLCanvasElement;
    if (sourceImage instanceof HTMLImageElement) {
      sourceCanvas = this.imageToCanvas(sourceImage);
    } else if (sourceImage instanceof HTMLCanvasElement) {
      sourceCanvas = sourceImage;
    } else {
      console.error(`[PathTilesetGenerator] Unsupported source type`);
      return false;
    }

    const tilesetCanvas = this.generateTilesetFromCanvas(sourceCanvas);
    
    const canvasTexture = this.scene.textures.createCanvas(outputKey, tilesetCanvas.width, tilesetCanvas.height);
    if (canvasTexture) {
      canvasTexture.draw(0, 0, tilesetCanvas);
      canvasTexture.refresh();
      
      this.scene.textures.addSpriteSheet(outputKey, canvasTexture, {
        frameWidth: TILE_SIZE_PX,
        frameHeight: TILE_SIZE_PX
      });
    }

    return true;
  }

  private imageToCanvas(image: HTMLImageElement): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0);
    return canvas;
  }

  private generateTilesetFromCanvas(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
    const TILE_CONFIGS = this.getTileConfigs();
    const tilesetWidth = TILESET_COLS * TILE_SIZE_PX;
    const tilesetHeight = Math.ceil(TILE_CONFIGS.length / TILESET_COLS) * TILE_SIZE_PX;
    
    const canvas = document.createElement('canvas');
    canvas.width = tilesetWidth;
    canvas.height = tilesetHeight;
    const ctx = canvas.getContext('2d')!;

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
    const innerRadius = TILE_SIZE_PX / 2 - radius;

    const adjacentCount = [north, east, south, west].filter(Boolean).length;
    const isDeadEnd = adjacentCount === 1;

    if (adjacentCount === 0) {
      ctx.drawImage(sourceCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height, x, y, TILE_SIZE_PX, TILE_SIZE_PX);
      return;
    }

    ctx.save();
    ctx.beginPath();

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

}
