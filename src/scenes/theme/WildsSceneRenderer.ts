import { GameSceneRenderer } from './GameSceneRenderer';

const EDGE_COLOR = 0x4a3a2a;
const MIST_DRIFT_SPEED_PX_PER_SEC = 20;

export class WildsSceneRenderer extends GameSceneRenderer {
  private mistEmitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];

  protected getEdgeColor(): number {
    return EDGE_COLOR;
  }

  renderTheme(width: number, height: number): {
    background: Phaser.GameObjects.Image;
    vignette: Phaser.GameObjects.Image;
  } {
    const worldWidth = width * this.cellSize;
    const worldHeight = height * this.cellSize;

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
    background.setDepth(-1000);

    this.createMistLayers(worldWidth, worldHeight);

    const vignette = this.scene.add.image(worldWidth / 2, worldHeight / 2, 'vin');
    vignette.setDisplaySize(worldWidth, worldHeight);
    vignette.setDepth(1000);
    vignette.setAlpha(0.3);
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
            (particle as any).initialY = particle.y;
            const yRatio = particle.y / worldHeight;
            const baseScale = 45 + (yRatio * 50);
            return baseScale + (Math.random() * 30 - 10);
          }
        },
        alpha: {
          onUpdate: (particle: Phaser.GameObjects.Particles.Particle) => {
            const life = particle.lifeT;
            const initialY = (particle as any).initialY || particle.y;
            const yRatio = initialY / worldHeight;
            const baseAlpha = 0.3 + (yRatio * 0.7);
            if (life < 0.3) return baseAlpha * (life / 0.3);
            if (life > 0.7) return baseAlpha * ((1 - life) / 0.3);
            return baseAlpha;
          }
        },
        lifespan: { min: 6000, max: 10000 },
        tint: 0xffffff,
        speedX: { min: MIST_DRIFT_SPEED_PX_PER_SEC * (1 + layer * 0.3) * 0.8, max: MIST_DRIFT_SPEED_PX_PER_SEC * (1 + layer * 0.3) * 1.2 },
        speedY: 0,
        frequency: 100,
        blendMode: 'SCREEN'
      });

      emitter.start();
      emitter.setDepth(1500 + layer);
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
