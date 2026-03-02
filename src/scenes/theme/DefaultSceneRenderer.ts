import { GameSceneRenderer } from './GameSceneRenderer';
import { Depth } from '../../constants/DepthConstants';

export class DefaultSceneRenderer extends GameSceneRenderer {
  protected getEdgeColor(): number {
    return 0x000000;
  }

  renderTheme(width: number, height: number): { background: Phaser.GameObjects.Image; vignette: Phaser.GameObjects.Image } {
    const worldWidth = Math.max(1, width * this.cellSize);
    const worldHeight = Math.max(1, height * this.cellSize);

    const background = this.scene.add.rectangle(0, 0, worldWidth, worldHeight, 0x000000);
    background.setOrigin(0, 0);
    background.setDepth(Depth.floor);

    const vignette = this.scene.add.rectangle(worldWidth / 2, worldHeight / 2, worldWidth, worldHeight, 0x000000, 0);
    vignette.setDepth(Depth.vignette);

    return { 
      background: background as unknown as Phaser.GameObjects.Image, 
      vignette: vignette as unknown as Phaser.GameObjects.Image 
    };
  }

  protected renderWallPattern(_x: number, _y: number, _cellSize: number, _topBarY: number, _seed: number): void {
    // No wall pattern
  }
}
