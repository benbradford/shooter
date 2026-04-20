import Phaser from 'phaser';

const LINE_WIDTH_PX = 64;
const LINE_THICKNESS_PX = 3;
const LINE_OFFSET_Y_PX = -30;
const PULSE_SPEED = 8;
const PULSE_AMOUNT_PX = 1;
const COLOR_TWEEN_SPEED = 8;
const PARTICLE_INTERVAL_MS = 120;

export class ChargeCircleEffect {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly scene: Phaser.Scene;
  private emitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private isFull: boolean = false;
  private pulseTime: number = 0;
  private particleTimer: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(2000);
  }

  update(x: number, y: number, progress: number, delta: number): void {
    this.graphics.clear();

    const clamped = Math.min(progress, 1);
    const wasFull = this.isFull;
    this.isFull = clamped >= 1;

    if (this.isFull) {
      this.pulseTime += delta / 1000;
    }

    // Color: yellow → red during fill, tween when full
    let color: number;
    if (this.isFull) {
      const t = (Math.sin(this.pulseTime * COLOR_TWEEN_SPEED) + 1) / 2;
      // Tween between muted red (0xdd3300) and muted yellow (0xddcc00)
      const r = 0xdd;
      const g = Math.round(0x33 + t * (0xcc - 0x33));
      color = (r << 16) | (g << 8);
    } else {
      const g = Math.round(255 * (1 - clamped));
      color = (0xff << 16) | (g << 8);
    }

    // Line grows from center outward
    let halfWidth = (LINE_WIDTH_PX / 2) * clamped;
    if (this.isFull) {
      halfWidth += Math.sin(this.pulseTime * PULSE_SPEED) * PULSE_AMOUNT_PX;
    }

    const lineY = y + LINE_OFFSET_Y_PX;
    this.graphics.lineStyle(LINE_THICKNESS_PX, color, 0.9);
    this.graphics.beginPath();
    this.graphics.moveTo(x - halfWidth, lineY);
    this.graphics.lineTo(x + halfWidth, lineY);
    this.graphics.strokePath();

    // Particles when full
    if (this.isFull) {
      this.particleTimer += delta;
      if (!wasFull || this.particleTimer >= PARTICLE_INTERVAL_MS) {
        this.particleTimer = 0;
        if (!this.emitter) {
          this.emitter = this.scene.add.particles(x, lineY, 'fire', {
            speed: { min: 20, max: 60 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.015, end: 0 },
            alpha: { start: 0.7, end: 0 },
            tint: [0xff4400, 0xffaa00],
            lifespan: 400,
            frequency: PARTICLE_INTERVAL_MS,
            blendMode: 'ADD',
            emitZone: { type: 'random' as const, source: new Phaser.Geom.Rectangle(-LINE_WIDTH_PX / 2, -2, LINE_WIDTH_PX, 4) as unknown as Phaser.Types.GameObjects.Particles.RandomZoneSource }
          });
          this.emitter.setDepth(2000);
        }
        this.emitter.setPosition(x, lineY);
      }
    }

    if (this.emitter && !this.isFull) {
      this.emitter.stop();
      this.scene.time.delayedCall(400, () => {
        this.emitter?.destroy();
        this.emitter = null;
      });
    }
  }

  destroy(): void {
    this.graphics.destroy();
    if (this.emitter) {
      this.emitter.destroy();
      this.emitter = null;
    }
  }
}
