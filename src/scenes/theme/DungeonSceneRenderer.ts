import { GameSceneRenderer } from './GameSceneRenderer';
import { DEPTH_FLOOR, DEPTH_VIGNETTE } from '../../constants/DepthConstants';

const LAYER1_EDGE_COLOR = 0x222222;

export class DungeonSceneRenderer extends GameSceneRenderer {
  protected getEdgeColor(): number {
    return LAYER1_EDGE_COLOR;
  }

  renderTheme(width: number, height: number): { background: Phaser.GameObjects.Image; vignette: Phaser.GameObjects.Image } {
    const worldWidth = width * this.cellSize;
    const worldHeight = height * this.cellSize;

    if (this.scene.textures.exists('gradient')) {
      this.scene.textures.remove('gradient');
    }

    const canvas = this.scene.textures.createCanvas('gradient', worldWidth, worldHeight);
    const ctx = canvas?.context;
    if (!ctx) throw new Error('Failed to create canvas context');

    const centerX = worldWidth / 2;
    const centerY = worldHeight / 2;
    const maxRadius = Math.hypot(centerX, centerY);

    const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
    bgGradient.addColorStop(0, '#404416');
    bgGradient.addColorStop(0.4, '#7c806d');
    bgGradient.addColorStop(0.7, '#405974');
    bgGradient.addColorStop(1, '#a36802');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, worldWidth, worldHeight);

    canvas?.refresh();

    const background = this.scene.add.image(0, 0, 'gradient');
    background.setOrigin(0, 0);
    background.setDisplaySize(worldWidth, worldHeight);
    background.setDepth(DEPTH_FLOOR);

    const vignette = this.scene.add.image(worldWidth / 2, worldHeight / 2, 'vin');
    vignette.setDisplaySize(worldWidth, worldHeight);
    vignette.setDepth(DEPTH_VIGNETTE);
    vignette.setAlpha(0.2);
    vignette.setTint(0x221111);
    vignette.setBlendMode(2);

    return { background, vignette };
  }
}
