import { GameSceneRenderer } from './GameSceneRenderer';
import { Depth } from '../../constants/DepthConstants';

const EDGE_COLOR = 0x3a5a2e;

export class GrassSceneRenderer extends GameSceneRenderer {
  protected getEdgeColor(): number {
    return EDGE_COLOR;
  }

  renderTheme(width: number, height: number): { background: Phaser.GameObjects.Image; vignette: Phaser.GameObjects.Image } {
    const worldWidth = width * this.cellSize;
    const worldHeight = height * this.cellSize;

    if (this.scene.textures.exists('grass_gradient')) {
      this.scene.textures.remove('grass_gradient');
    }

    const canvas = this.scene.textures.createCanvas('grass_gradient', worldWidth, worldHeight);
    const ctx = canvas?.context;
    if (!ctx) throw new Error('Failed to create canvas context');

    const centerX = worldWidth / 2;
    const centerY = worldHeight / 2;
    const maxRadius = Math.hypot(centerX, centerY);

    const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
    bgGradient.addColorStop(0, '#6b9b4a');
    bgGradient.addColorStop(0.5, '#5a8a3a');
    bgGradient.addColorStop(1, '#4a7a2a');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, worldWidth, worldHeight);

    canvas?.refresh();

    const background = this.scene.add.image(0, 0, 'grass_gradient');
    background.setOrigin(0, 0);
    background.setDisplaySize(worldWidth, worldHeight);
    background.setDepth(Depth.floor);

    const vignette = this.scene.add.image(worldWidth / 2, worldHeight / 2, 'vin');
    vignette.setDisplaySize(worldWidth, worldHeight);
    vignette.setDepth(Depth.vignette);
    vignette.setAlpha(0.25);
    vignette.setTint(0x224422);
    vignette.setBlendMode(2);

    return { background, vignette };
  }
}
