import { PathTilesetGenerator } from './PathTilesetGenerator';

type FlowDirection = 'left' | 'right' | 'up' | 'down';

export type WaterConfig = {
  sourceImage: string;
  flowDirection: FlowDirection;
  numFrames: number;
  animSpeedMs: number;
  force: number;
}

export class WaterAnimator {
  private readonly generatedTextureKeys: string[] = [];
  private animationTimerMs: number = 0;
  private currentFrameIndex: number = 0;
  private tilesetKeys: string[] = [];
  private readonly generator: PathTilesetGenerator;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly config: WaterConfig
  ) {
    this.generator = new PathTilesetGenerator(scene);
  }

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
      const offsetKey = `${sourceKey}_flow_offset_${frameIdx}`;
      const tilesetKey = `${sourceKey}_flow_tileset_${frameIdx}`;

      const offsetCanvas = this.createOffsetTexture(sourceImage, offsetPercent);
      this.scene.textures.addCanvas(offsetKey, offsetCanvas);
      this.generatedTextureKeys.push(offsetKey);
      
      this.generator.generateTileset(offsetKey, tilesetKey);
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
