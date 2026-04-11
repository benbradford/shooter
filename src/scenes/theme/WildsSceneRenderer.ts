import { GameSceneRenderer } from './GameSceneRenderer';
import { Depth } from '../../constants/DepthConstants';

const EDGE_COLOR = 0x4a3a2a;
const MIST_DRIFT_SPEED_PX_PER_SEC = 20;
const DEFAULT_MIST_BASE_ALPHA = 0.3;
const DEFAULT_MIST_ALPHA_RANGE = 0.7;
const DEFAULT_MIST_BASE_SCALE = 45;
const DEFAULT_MIST_SCALE_RANGE = 50;

export type WildsMistConfig = {
  baseAlpha?: number;
  alphaRange?: number;
  baseScale?: number;
  scaleRange?: number;
};

export class WildsSceneRenderer extends GameSceneRenderer {
  private mistEmitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private readonly mistBaseAlpha: number;
  private readonly mistAlphaRange: number;
  private readonly mistBaseScale: number;
  private readonly mistScaleRange: number;

  constructor(scene: Phaser.Scene, cellSize: number, mistConfig?: WildsMistConfig) {
    super(scene, cellSize);
    this.mistBaseAlpha = mistConfig?.baseAlpha ?? DEFAULT_MIST_BASE_ALPHA;
    this.mistAlphaRange = mistConfig?.alphaRange ?? DEFAULT_MIST_ALPHA_RANGE;
    this.mistBaseScale = mistConfig?.baseScale ?? DEFAULT_MIST_BASE_SCALE;
    this.mistScaleRange = mistConfig?.scaleRange ?? DEFAULT_MIST_SCALE_RANGE;
  }

  protected getEdgeColor(): number {
    return EDGE_COLOR;
  }

  renderTheme(width: number, height: number): {
    background: Phaser.GameObjects.Image;
    vignette: Phaser.GameObjects.Image;
  } {
    const worldWidth = Math.max(1, width * this.cellSize);
    const worldHeight = Math.max(1, height * this.cellSize);

    if (this.scene.textures.exists('wilds_gradient')) {
      this.scene.textures.remove('wilds_gradient');
    }

    const canvas = this.scene.textures.createCanvas('wilds_gradient', worldWidth, worldHeight);
    const ctx = canvas?.context;
    if (!ctx) throw new Error('Failed to create canvas context');

    const gradient = ctx.createRadialGradient(
      worldWidth / 2,
      worldHeight / 2,
      0,
      worldWidth / 2,
      worldHeight / 2,
      Math.max(worldWidth, worldHeight) / 1.5
    );
    gradient.addColorStop(0, '#5a5a52');
    gradient.addColorStop(0.5, '#4a4a42');
    gradient.addColorStop(1, '#3a3a32');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, worldWidth, worldHeight);
    canvas?.refresh();

    const background = this.scene.add.image(0, 0, 'wilds_gradient');
    background.setOrigin(0, 0);
    background.setDisplaySize(worldWidth, worldHeight);
    background.setDepth(Depth.floor);
    background.setAlpha(0);

    this.createMistLayers(worldWidth, worldHeight);

    const vignette = this.scene.add.image(worldWidth / 2, worldHeight / 2, 'vignette');
    vignette.setDisplaySize(worldWidth, worldHeight);
    vignette.setDepth(Depth.vignette);
    vignette.setAlpha(0);
    vignette.setTint(0x4a4a42);
    vignette.setBlendMode(2);

    return { background, vignette };
  }

  private createMistLayers(worldWidth: number, worldHeight: number): void {

    for (let layer = 0; layer < 3; layer++) {
      const emitter = this.scene.add.particles(0, 0, 'smoke', {
        x: { min: 0, max: worldWidth },
        y: { min: 0, max: worldHeight },
        scale: {
          onEmit: (particle: Phaser.GameObjects.Particles.Particle | undefined) => {
            if (!particle) return 120;
            (particle as Phaser.GameObjects.Particles.Particle & { initialY?: number }).initialY = particle.y;
            const yRatio = particle.y / worldHeight;
            const baseScale = this.mistBaseScale + (yRatio * this.mistScaleRange);
            return baseScale + (Math.random() * 30 - 10);
          }
        },
        alpha: {
          onEmit: () => 0,
          onUpdate: (particle: Phaser.GameObjects.Particles.Particle) => {
            const life = particle.lifeT;
            const initialY = (particle as Phaser.GameObjects.Particles.Particle & { initialY?: number }).initialY ?? particle.y;
            const yRatio = initialY / worldHeight;
            const baseAlpha = this.mistBaseAlpha + (yRatio * this.mistAlphaRange);
            if (life < 0.3) return baseAlpha * (life / 0.3);
            if (life > 0.7) return baseAlpha * ((1 - life) / 0.3);
            return baseAlpha;
          }
        },
        lifespan: { min: 6000, max: 10000 },
        tint: 0xffffff,
        speedX: { min: MIST_DRIFT_SPEED_PX_PER_SEC * (1 + layer * 0.3) * 0.8, max: MIST_DRIFT_SPEED_PX_PER_SEC * (1 + layer * 0.3) * 1.2 },
        speedY: 0,
        frequency: 50,
        blendMode: 'SCREEN'
      });

      emitter.start();
      emitter.setDepth(Depth.mist + layer);
      this.mistEmitters.push(emitter);

      this.scene.events.on('update', () => {
        emitter.forEachAlive((particle: Phaser.GameObjects.Particles.Particle) => {
          if (particle.x > worldWidth + 200) {
            particle.x = -200;
          }
        }, this);
      });
    }
  }

  destroy(): void {
    super.destroy();
    this.mistEmitters.forEach(emitter => emitter.destroy());
    this.mistEmitters = [];
  }
}
