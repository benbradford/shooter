const TILE_SIZE_PX = 64;
const TILESET_COLS = 8;
const EDGE_BLEND_WIDTH_PX = 5;
const EDGE_BLEND_PASSES = 3;
const EDGE_NOISE_SCALE = 0.45;
const EDGE_SCATTER_DENSITY = 0.5;
const EDGE_SCATTER_MAX_SIZE_PX = 2;
const EDGE_SCATTER_COLOR = 'rgba(40, 35, 30, 0.35)';

type EdgeStyle = 'blend' | 'stroke';

export class PathTilesetGenerator {
  constructor(private readonly scene: Phaser.Scene) {}

  generateTileset(sourceKey: string, outputKey: string, strokeWidth = 3, edgeStyle: EdgeStyle = 'stroke'): boolean {
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

    const tilesetCanvas = this.generateTilesetFromCanvas(sourceCanvas, strokeWidth, edgeStyle);
    
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
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.drawImage(image, 0, 0);
    return canvas;
  }

  private generateTilesetFromCanvas(sourceCanvas: HTMLCanvasElement, strokeWidth: number, edgeStyle: EdgeStyle): HTMLCanvasElement {
    const TILE_CONFIGS = this.getTileConfigs();
    const tilesetWidth = TILESET_COLS * TILE_SIZE_PX;
    const tilesetHeight = Math.ceil(TILE_CONFIGS.length / TILESET_COLS) * TILE_SIZE_PX;
    
    const canvas = document.createElement('canvas');
    canvas.width = tilesetWidth;
    canvas.height = tilesetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    for (let tileIdx = 0; tileIdx < TILE_CONFIGS.length; tileIdx++) {
      const tileCol = tileIdx % TILESET_COLS;
      const tileRow = Math.floor(tileIdx / TILESET_COLS);
      const tileX = tileCol * TILE_SIZE_PX;
      const tileY = tileRow * TILE_SIZE_PX;

      this.drawPathTile(ctx, sourceCanvas, tileX, tileY, TILE_CONFIGS[tileIdx], strokeWidth, edgeStyle);
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

  private drawPathTile(ctx: CanvasRenderingContext2D, sourceCanvas: HTMLCanvasElement, x: number, y: number, config: boolean[], strokeWidth: number, edgeStyle: EdgeStyle): void {
    const radius = TILE_SIZE_PX * 0.4;
    const centerX = x + TILE_SIZE_PX / 2;
    const centerY = y + TILE_SIZE_PX / 2;
    const innerRadius = TILE_SIZE_PX / 2 - radius;

    const adjacentCount = config.slice(0, 4).filter(Boolean).length;
    const isDeadEnd = adjacentCount === 1;

    if (adjacentCount === 0) {
      ctx.drawImage(sourceCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height, x, y, TILE_SIZE_PX, TILE_SIZE_PX);
      return;
    }

    if (edgeStyle === 'blend') {
      this.drawBlendedTile(ctx, sourceCanvas, x, y, config, radius, centerX, centerY, innerRadius, isDeadEnd);
    } else {
      this.drawStrokedTile(ctx, sourceCanvas, x, y, config, strokeWidth, radius, centerX, centerY, innerRadius, isDeadEnd);
    }
  }

  private drawBlendedTile(ctx: CanvasRenderingContext2D, sourceCanvas: HTMLCanvasElement, x: number, y: number, config: boolean[], radius: number, centerX: number, centerY: number, innerRadius: number, isDeadEnd: boolean): void {
    const [north, east, south, west, hasNW = false, hasNE = false, hasSW = false, hasSE = false] = config;
    const tileHash = (config.map(b => b ? 1 : 0).join(''));
    const seed = this.hashToSeed(tileHash);

    for (let pass = EDGE_BLEND_PASSES; pass >= 0; pass--) {
      const expand = pass * (EDGE_BLEND_WIDTH_PX / EDGE_BLEND_PASSES);
      const alpha = pass === 0 ? 1.0 : (1 - pass / (EDGE_BLEND_PASSES + 1)) * 0.5;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();

      const r = radius + expand;
      const ir = innerRadius + expand;

      if (west) ctx.rect(x, centerY - r, TILE_SIZE_PX / 2 + 1, r * 2);
      if (east) ctx.rect(centerX - 1, centerY - r, TILE_SIZE_PX / 2 + 1, r * 2);
      if (north) ctx.rect(centerX - r, y, r * 2, TILE_SIZE_PX / 2 + 1);
      if (south) ctx.rect(centerX - r, centerY - 1, r * 2, TILE_SIZE_PX / 2 + 1);

      if (west && north) {
        if (hasNW) {
          ctx.rect(x, y, TILE_SIZE_PX / 2 - radius + expand, TILE_SIZE_PX / 2 - radius + expand);
        } else {
          ctx.moveTo(x, y + ir);
          ctx.arc(x, y, ir, Math.PI / 2, 0, true);
          ctx.lineTo(x, y);
          ctx.lineTo(x + ir, y);
          ctx.closePath();
        }
      }
      if (east && north) {
        if (hasNE) {
          ctx.rect(centerX + radius - expand, y, TILE_SIZE_PX / 2 - radius + expand, TILE_SIZE_PX / 2 - radius + expand);
        } else {
          ctx.moveTo(x + TILE_SIZE_PX - ir, y);
          ctx.lineTo(x + TILE_SIZE_PX, y);
          ctx.lineTo(x + TILE_SIZE_PX, y + ir);
          ctx.arc(x + TILE_SIZE_PX, y, ir, Math.PI / 2, Math.PI, true);
          ctx.closePath();
        }
      }
      if (west && south) {
        if (hasSW) {
          ctx.rect(x, centerY + radius - expand, TILE_SIZE_PX / 2 - radius + expand, TILE_SIZE_PX / 2 - radius + expand);
        } else {
          ctx.moveTo(x, y + TILE_SIZE_PX - ir);
          ctx.lineTo(x, y + TILE_SIZE_PX);
          ctx.lineTo(x + ir, y + TILE_SIZE_PX);
          ctx.arc(x, y + TILE_SIZE_PX, ir, 0, Math.PI / 2);
          ctx.closePath();
        }
      }
      if (east && south) {
        if (hasSE) {
          ctx.rect(centerX + radius - expand, centerY + radius - expand, TILE_SIZE_PX / 2 - radius + expand, TILE_SIZE_PX / 2 - radius + expand);
        } else {
          ctx.moveTo(x + TILE_SIZE_PX - ir, y + TILE_SIZE_PX);
          ctx.arc(x + TILE_SIZE_PX, y + TILE_SIZE_PX, ir, Math.PI, Math.PI / 2, true);
          ctx.lineTo(x + TILE_SIZE_PX, y + TILE_SIZE_PX);
          ctx.closePath();
        }
      }

      if (isDeadEnd) {
        ctx.rect(centerX - r, centerY - r, r * 2, r * 2);
      } else {
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      }

      ctx.clip();
      ctx.drawImage(sourceCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height, x, y, TILE_SIZE_PX, TILE_SIZE_PX);
      ctx.restore();
    }

    this.drawEdgeScatter(ctx, x, y, config, radius, innerRadius, seed);
  }

  private drawStrokedTile(ctx: CanvasRenderingContext2D, sourceCanvas: HTMLCanvasElement, x: number, y: number, config: boolean[], strokeWidth: number, radius: number, centerX: number, centerY: number, innerRadius: number, isDeadEnd: boolean): void {
    const [north, east, south, west, hasNW = false, hasNE = false, hasSW = false, hasSE = false] = config;

    ctx.save();
    ctx.beginPath();

    if (west) ctx.rect(x, centerY - radius, TILE_SIZE_PX / 2 + 1, radius * 2);
    if (east) ctx.rect(centerX - 1, centerY - radius, TILE_SIZE_PX / 2 + 1, radius * 2);
    if (north) ctx.rect(centerX - radius, y, radius * 2, TILE_SIZE_PX / 2 + 1);
    if (south) ctx.rect(centerX - radius, centerY - 1, radius * 2, TILE_SIZE_PX / 2 + 1);

    if (west && north) {
      if (hasNW) { ctx.rect(x, y, TILE_SIZE_PX / 2 - radius, TILE_SIZE_PX / 2 - radius); }
      else { ctx.moveTo(x, y + innerRadius); ctx.arc(x, y, innerRadius, Math.PI / 2, 0, true); ctx.lineTo(x, y); ctx.lineTo(x + innerRadius, y); ctx.closePath(); }
    }
    if (east && north) {
      if (hasNE) { ctx.rect(centerX + radius, y, TILE_SIZE_PX / 2 - radius, TILE_SIZE_PX / 2 - radius); }
      else { ctx.moveTo(x + TILE_SIZE_PX - innerRadius, y); ctx.lineTo(x + TILE_SIZE_PX, y); ctx.lineTo(x + TILE_SIZE_PX, y + innerRadius); ctx.arc(x + TILE_SIZE_PX, y, innerRadius, Math.PI / 2, Math.PI, true); ctx.closePath(); }
    }
    if (west && south) {
      if (hasSW) { ctx.rect(x, centerY + radius, TILE_SIZE_PX / 2 - radius, TILE_SIZE_PX / 2 - radius); }
      else { ctx.moveTo(x, y + TILE_SIZE_PX - innerRadius); ctx.lineTo(x, y + TILE_SIZE_PX); ctx.lineTo(x + innerRadius, y + TILE_SIZE_PX); ctx.arc(x, y + TILE_SIZE_PX, innerRadius, 0, Math.PI / 2); ctx.closePath(); }
    }
    if (east && south) {
      if (hasSE) { ctx.rect(centerX + radius, centerY + radius, TILE_SIZE_PX / 2 - radius, TILE_SIZE_PX / 2 - radius); }
      else { ctx.moveTo(x + TILE_SIZE_PX - innerRadius, y + TILE_SIZE_PX); ctx.arc(x + TILE_SIZE_PX, y + TILE_SIZE_PX, innerRadius, Math.PI, Math.PI / 2, true); ctx.lineTo(x + TILE_SIZE_PX, y + TILE_SIZE_PX); ctx.closePath(); }
    }

    if (isDeadEnd) { ctx.rect(centerX - radius, centerY - radius, radius * 2, radius * 2); }
    else { ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); }

    ctx.clip();
    ctx.drawImage(sourceCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height, x, y, TILE_SIZE_PX, TILE_SIZE_PX);
    ctx.restore();

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = strokeWidth;

    if (isDeadEnd) {
      if (west) { ctx.beginPath(); ctx.moveTo(x, centerY - radius); ctx.lineTo(centerX + radius, centerY - radius); ctx.moveTo(x, centerY + radius); ctx.lineTo(centerX + radius, centerY + radius); ctx.moveTo(centerX + radius, centerY - radius); ctx.lineTo(centerX + radius, centerY + radius); ctx.stroke(); }
      else if (east) { ctx.beginPath(); ctx.moveTo(centerX - radius, centerY - radius); ctx.lineTo(x + TILE_SIZE_PX, centerY - radius); ctx.moveTo(centerX - radius, centerY + radius); ctx.lineTo(x + TILE_SIZE_PX, centerY + radius); ctx.moveTo(centerX - radius, centerY - radius); ctx.lineTo(centerX - radius, centerY + radius); ctx.stroke(); }
      else if (north) { ctx.beginPath(); ctx.moveTo(centerX - radius, y); ctx.lineTo(centerX - radius, centerY + radius); ctx.moveTo(centerX + radius, y); ctx.lineTo(centerX + radius, centerY + radius); ctx.moveTo(centerX - radius, centerY + radius); ctx.lineTo(centerX + radius, centerY + radius); ctx.stroke(); }
      else if (south) { ctx.beginPath(); ctx.moveTo(centerX - radius, centerY - radius); ctx.lineTo(centerX - radius, y + TILE_SIZE_PX); ctx.moveTo(centerX + radius, centerY - radius); ctx.lineTo(centerX + radius, y + TILE_SIZE_PX); ctx.moveTo(centerX - radius, centerY - radius); ctx.lineTo(centerX + radius, centerY - radius); ctx.stroke(); }
    } else {
      if (!west && !north) { ctx.beginPath(); ctx.arc(centerX, centerY, radius, Math.PI, -Math.PI / 2, false); ctx.stroke(); }
      else if (!west && north) { ctx.beginPath(); ctx.moveTo(centerX - radius, centerY); ctx.lineTo(centerX - radius, y); ctx.stroke(); }
      else if (west && !north) { ctx.beginPath(); ctx.moveTo(centerX, centerY - radius); ctx.lineTo(x, centerY - radius); ctx.stroke(); }

      if (!east && !north) { ctx.beginPath(); ctx.arc(centerX, centerY, radius, -Math.PI / 2, 0, false); ctx.stroke(); }
      else if (!east && north) { ctx.beginPath(); ctx.moveTo(centerX + radius, centerY); ctx.lineTo(centerX + radius, y); ctx.stroke(); }
      else if (east && !north) { ctx.beginPath(); ctx.moveTo(centerX, centerY - radius); ctx.lineTo(x + TILE_SIZE_PX, centerY - radius); ctx.stroke(); }

      if (!west && !south) { ctx.beginPath(); ctx.arc(centerX, centerY, radius, Math.PI / 2, Math.PI, false); ctx.stroke(); }
      else if (!west && south) { ctx.beginPath(); ctx.moveTo(centerX - radius, centerY); ctx.lineTo(centerX - radius, y + TILE_SIZE_PX); ctx.stroke(); }
      else if (west && !south) { ctx.beginPath(); ctx.moveTo(centerX, centerY + radius); ctx.lineTo(x, centerY + radius); ctx.stroke(); }

      if (!east && !south) { ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI / 2, false); ctx.stroke(); }
      else if (!east && south) { ctx.beginPath(); ctx.moveTo(centerX + radius, centerY); ctx.lineTo(centerX + radius, y + TILE_SIZE_PX); ctx.stroke(); }
      else if (east && !south) { ctx.beginPath(); ctx.moveTo(centerX, centerY + radius); ctx.lineTo(x + TILE_SIZE_PX, centerY + radius); ctx.stroke(); }

      if (west && north && !hasNW) { ctx.beginPath(); ctx.arc(x, y, innerRadius, 0, Math.PI / 2, false); ctx.stroke(); }
      if (east && north && !hasNE) { ctx.beginPath(); ctx.arc(x + TILE_SIZE_PX, y, innerRadius, Math.PI / 2, Math.PI, false); ctx.stroke(); }
      if (west && south && !hasSW) { ctx.beginPath(); ctx.arc(x, y + TILE_SIZE_PX, innerRadius, -Math.PI / 2, 0, false); ctx.stroke(); }
      if (east && south && !hasSE) { ctx.beginPath(); ctx.arc(x + TILE_SIZE_PX, y + TILE_SIZE_PX, innerRadius, Math.PI, -Math.PI / 2, false); ctx.stroke(); }
    }
  }

  private drawEdgeScatter(ctx: CanvasRenderingContext2D, x: number, y: number, config: boolean[], radius: number, innerRadius: number, seed: number): void {
    const [north, east, south, west] = config;
    const centerX = x + TILE_SIZE_PX / 2;
    const centerY = y + TILE_SIZE_PX / 2;
    let rng = seed;

    const nextRandom = (): number => {
      rng = (rng * 1664525 + 1013904223) & 0xffffffff;
      return (rng >>> 0) / 0xffffffff;
    };

    ctx.fillStyle = EDGE_SCATTER_COLOR;

    for (let py = 0; py < TILE_SIZE_PX; py++) {
      for (let px = 0; px < TILE_SIZE_PX; px++) {
        const worldX = x + px;
        const worldY = y + py;

        const dist = this.distanceToPathEdge(
          px, py, centerX - x, centerY - y, radius, innerRadius,
          north, east, south, west
        );

        if (dist < EDGE_BLEND_WIDTH_PX && dist > -3) {
          const edgeFactor = 1 - Math.abs(dist) / EDGE_BLEND_WIDTH_PX;
          const noiseVal = this.noiseAt(worldX, worldY, seed);
          const noiseVal2 = this.noiseAt(worldX * 3, worldY * 3, seed ^ 0xbeef);

          if (nextRandom() < EDGE_SCATTER_DENSITY * edgeFactor && noiseVal > (1 - EDGE_NOISE_SCALE)) {
            const size = 1 + Math.floor(nextRandom() * EDGE_SCATTER_MAX_SIZE_PX);
            ctx.fillRect(x + px, y + py, size, size);
          }

          if (dist > 0 && dist < 2 && noiseVal2 > 0.7) {
            ctx.fillRect(x + px, y + py, 1, 1);
          }
        }
      }
    }
  }

  private distanceToPathEdge(px: number, py: number, cx: number, cy: number, radius: number, _innerRadius: number, north: boolean, east: boolean, south: boolean, west: boolean): number {
    const dx = px - cx;
    const dy = py - cy;
    const distFromCenter = Math.sqrt(dx * dx + dy * dy);

    let minEdgeDist = Infinity;

    if (!west && px < cx) {
      const edgeDist = px - (cx - radius);
      minEdgeDist = Math.min(minEdgeDist, edgeDist);
    }
    if (!east && px > cx) {
      const edgeDist = (cx + radius) - px;
      minEdgeDist = Math.min(minEdgeDist, edgeDist);
    }
    if (!north && py < cy) {
      const edgeDist = py - (cy - radius);
      minEdgeDist = Math.min(minEdgeDist, edgeDist);
    }
    if (!south && py > cy) {
      const edgeDist = (cy + radius) - py;
      minEdgeDist = Math.min(minEdgeDist, edgeDist);
    }

    if (!west && !north && dx < 0 && dy < 0) {
      minEdgeDist = Math.min(minEdgeDist, radius - distFromCenter);
    }
    if (!east && !north && dx > 0 && dy < 0) {
      minEdgeDist = Math.min(minEdgeDist, radius - distFromCenter);
    }
    if (!west && !south && dx < 0 && dy > 0) {
      minEdgeDist = Math.min(minEdgeDist, radius - distFromCenter);
    }
    if (!east && !south && dx > 0 && dy > 0) {
      minEdgeDist = Math.min(minEdgeDist, radius - distFromCenter);
    }

    return minEdgeDist;
  }

  private noiseAt(x: number, y: number, seed: number): number {
    let h = seed ^ (x * 374761393) ^ (y * 668265263);
    h = (h ^ (h >>> 13)) * 1274126177;
    h = h ^ (h >>> 16);
    return (h >>> 0) / 0xffffffff;
  }

  private hashToSeed(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return hash;
  }

}
