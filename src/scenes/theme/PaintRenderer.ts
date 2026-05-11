import { Depth } from '../../constants/DepthConstants';

const PAINT_DEPTH = Depth.edgeGraphics + 1;

export class PaintRenderer {
  private image: Phaser.GameObjects.Image | null = null;
  private textureKey: string | null = null;

  constructor(private readonly scene: Phaser.Scene) {}

  render(textureKey: string, gridWidth: number, gridHeight: number, cellSize: number): void {
    this.destroy();
    this.textureKey = textureKey;

    if (!this.scene.textures.exists(textureKey)) return;

    const tex = this.scene.textures.get(textureKey);
    if (tex.key === '__MISSING') return;

    this.image = this.scene.add.image(0, 0, textureKey);
    this.image.setOrigin(0, 0);
    this.image.setDisplaySize(gridWidth * cellSize, gridHeight * cellSize);
    this.image.setDepth(PAINT_DEPTH);
  }

  destroy(): void {
    if (this.image) {
      this.image.destroy();
      this.image = null;
    }
  }

  getTextureKey(): string | null {
    return this.textureKey;
  }

  static buildKey(levelName: string): string {
    return `__paint_overlay_${levelName}`;
  }
}
