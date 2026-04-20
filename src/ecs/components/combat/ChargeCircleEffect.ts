import type Phaser from 'phaser';

const CIRCLE_RADIUS_PX = 34;
const CIRCLE_LINE_WIDTH_PX = 3;
const PULSE_SPEED = 8;
const PULSE_AMOUNT_PX = 3;
const PARTICLE_INTERVAL_MS = 120;
const COLOR_TWEEN_SPEED = 4;

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

    // Interpolate yellow (0xffff00) → red (0xff0000)
    let color: number;
    if (this.isFull) {
      // Tween between yellow and red when fully charged
      const t = (Math.sin(this.pulseTime * COLOR_TWEEN_SPEED) + 1) / 2;
      const g = Math.round(255 * t);
      color = (0xff << 16) | (g << 8);
    } else {
      const g = Math.round(255 * (1 - clamped));
      color = (0xff << 16) | (g << 8);
    }

    let radius = CIRCLE_RADIUS_PX;
    if (this.isFull) {
      radius += Math.sin(this.pulseTime * PULSE_SPEED) * PULSE_AMOUNT_PX;
    }

    // Draw arc from top (-90°) clockwise
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + clamped * Math.PI * 2;

    this.graphics.lineStyle(CIRCLE_LINE_WIDTH_PX, color, 0.9);
    this.graphics.beginPath();
    this.graphics.arc(x, y, radius, startAngle, endAngle, false);
    this.graphics.strokePath();

    // Particles when full
    if (this.isFull) {
      this.particleTimer += delta;
      if (!wasFull || this.particleTimer >= PARTICLE_INTERVAL_MS) {
        this.particleTimer = 0;
        if (!this.emitter) {
          this.emitter = this.scene.add.particles(x, y, 'fire', {
            speed: { min: 20, max: 60 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.015, end: 0 },
            alpha: { start: 0.7, end: 0 },
            tint: [0xff4400, 0xffaa00],
            lifespan: 400,
            frequency: PARTICLE_INTERVAL_MS,
            blendMode: 'ADD'
          });
          this.emitter.setDepth(2000);
        }
        this.emitter.setPosition(x, y);
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
