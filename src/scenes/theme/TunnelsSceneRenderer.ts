import { GameSceneRenderer } from './GameSceneRenderer';
import { Depth } from '../../constants/DepthConstants';
import type { Grid } from '../../systems/grid/Grid';
import type { LevelData } from '../../systems/level/LevelLoader';

const EDGE_COLOR = 0x1a1a1a;
const LIGHT_RADIUS_PX = 500;
const DARKNESS_ALPHA = 0.88;
const DARKNESS_TEXTURE_KEY = 'tunnels_darkness';
const GRADIENT_TEXTURE_KEY = 'tunnels_gradient';
const DARKNESS_SIZE = 1024;

export class TunnelsSceneRenderer extends GameSceneRenderer {
  private darknessSprite: Phaser.GameObjects.Image | null = null;
  private playerSprite: Phaser.GameObjects.Sprite | null = null;
  private isEditorMode = false;

  protected getEdgeColor(): number {
    return EDGE_COLOR;
  }

  setEditorMode(enabled: boolean): void {
    this.isEditorMode = enabled;
    if (this.darknessSprite) this.darknessSprite.setVisible(!enabled);
  }

  setPlayerSprite(sprite: Phaser.GameObjects.Sprite): void {
    this.playerSprite = sprite;
  }

  renderTheme(width: number, height: number): { background: Phaser.GameObjects.Image; vignette: Phaser.GameObjects.Image } {
    const worldWidth = Math.max(1, width * this.cellSize);
    const worldHeight = Math.max(1, height * this.cellSize);

    if (this.scene.textures.exists(GRADIENT_TEXTURE_KEY)) {
      this.scene.textures.remove(GRADIENT_TEXTURE_KEY);
    }

    const canvas = this.scene.textures.createCanvas(GRADIENT_TEXTURE_KEY, worldWidth, worldHeight);
    const ctx = canvas?.context;
    if (!ctx) throw new Error('Failed to create canvas context');

    const centerX = worldWidth / 2;
    const centerY = worldHeight / 2;
    const maxRadius = Math.hypot(centerX, centerY);

    const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
    bgGradient.addColorStop(0, '#2a2a1e');
    bgGradient.addColorStop(0.4, '#1e1e16');
    bgGradient.addColorStop(0.7, '#141410');
    bgGradient.addColorStop(1, '#0a0a08');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, worldWidth, worldHeight);

    canvas?.refresh();

    const background = this.scene.add.image(0, 0, GRADIENT_TEXTURE_KEY);
    background.setOrigin(0, 0);
    background.setDisplaySize(worldWidth, worldHeight);
    background.setDepth(Depth.floor);
    background.setAlpha(0);

    const vignette = this.scene.add.image(worldWidth / 2, worldHeight / 2, 'vignette');
    vignette.setDisplaySize(worldWidth, worldHeight);
    vignette.setDepth(Depth.vignette);
    vignette.setAlpha(0);
    vignette.setTint(0x0a0a06);
    vignette.setBlendMode(2);

    this.createDarknessOverlay();

    return { background, vignette };
  }

  private createDarknessOverlay(): void {
    if (this.isEditorMode) return;
    if (this.scene.textures.exists(DARKNESS_TEXTURE_KEY)) {
      this.scene.textures.remove(DARKNESS_TEXTURE_KEY);
    }

    const size = DARKNESS_SIZE;
    const canvas = this.scene.textures.createCanvas(DARKNESS_TEXTURE_KEY, size, size);
    const ctx = canvas?.context;
    if (!ctx) return;

    const cx = size / 2;
    const cy = size / 2;
    // Scale light radius relative to the texture size (will be stretched to cover viewport)
    const lightRadiusFraction = LIGHT_RADIUS_PX / (this.scene.cameras.main.width / this.scene.cameras.main.zoom);
    const lightRadiusTexPx = lightRadiusFraction * size;

    ctx.fillStyle = `rgba(5, 5, 3, ${DARKNESS_ALPHA})`;
    ctx.fillRect(0, 0, size, size);

    ctx.globalCompositeOperation = 'destination-out';
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, lightRadiusTexPx);
    grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.8)');
    grad.addColorStop(0.8, 'rgba(0, 0, 0, 0.3)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    ctx.globalCompositeOperation = 'source-over';

    canvas?.refresh();

    this.darknessSprite = this.scene.add.image(0, 0, DARKNESS_TEXTURE_KEY);
    this.darknessSprite.setDepth(Depth.vignette - 1);
    this.darknessSprite.setScrollFactor(0);
  }

  override update(delta: number): void {
    super.update(delta);

    if (this.darknessSprite) {
      const cam = this.scene.cameras.main;
      const viewW = cam.width;
      const viewH = cam.height;

      // Cover the full viewport
      this.darknessSprite.setDisplaySize(viewW * 1.2, viewH * 1.2);

      if (this.playerSprite) {
        // Position the light hole on the player in screen space
        const playerScreenX = this.playerSprite.x - cam.scrollX;
        const playerScreenY = this.playerSprite.y - cam.scrollY;
        this.darknessSprite.setPosition(playerScreenX, playerScreenY);
      } else {
        this.darknessSprite.setPosition(viewW / 2, viewH / 2);
      }
    }
  }

  override updateGraphics(grid: Grid, levelData?: LevelData): void {
    this.graphics.clear();
    this.edgeGraphics.clear();

    if (levelData) {
      const patched = {
        ...levelData,
        background: levelData.background
          ? { ...levelData.background, hasEdges: false }
          : { hasEdges: false } as LevelData['background'],
      };
      super.updateGraphics(grid, patched as LevelData);
    } else {
      super.updateGraphics(grid, levelData);
    }
  }

  override destroy(): void {
    super.destroy();
    if (this.darknessSprite) {
      this.darknessSprite.destroy();
      this.darknessSprite = null;
    }
    this.playerSprite = null;
  }
}
