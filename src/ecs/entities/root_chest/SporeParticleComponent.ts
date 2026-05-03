import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';

const SPAWN_INTERVAL_MS = 50; // ~3 particles/sec
const PARTICLE_LIFETIME_MS = 2000;
const MAX_PARTICLES = 64;
const DRIFT_SPEED_PX_PER_SEC = 8;
const SWAY_AMPLITUDE_PX = 6;
const SWAY_FREQUENCY_HZ = 0.5;
const ORBIT_RADIUS_PX = 20;
const ORBIT_SPEED_RAD_PER_SEC = 0.8;
const BREATHE_CYCLE_MS = 4000;
const BREATHE_PULL_PX = 8;
const SPAWN_RADIUS_PX = 24;

const COLORS = [0x3a6b2a, 0x4a7a3a, 0x2d5a1f, 0x5a8a4a, 0x6aaa5a];

type Spore = {
  graphic: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  age: number;
  lifetime: number;
  size: number;
  color: number;
  orbit: boolean;
  orbitAngle: number;
  swayPhase: number;
  behind: boolean;
};

export class SporeParticleComponent implements Component {
  entity!: Entity;
  private readonly scene: Phaser.Scene;
  private particles: Spore[] = [];
  private spawnTimerMs = 0;
  private breatheTimerMs = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  update(delta: number): void {
    const transform = this.entity.get(TransformComponent);
    const sprite = this.entity.get(SpriteComponent);
    if (!transform || !sprite) return;

    const centerX = transform.x;
    const centerY = transform.y;
    const baseDepth = sprite.sprite.depth;

    this.breatheTimerMs += delta;
    const breathePhase = (this.breatheTimerMs % BREATHE_CYCLE_MS) / BREATHE_CYCLE_MS;
    // Smooth pull inward then drift outward: sin gives 0→1→0 over cycle
    const breathePull = Math.sin(breathePhase * Math.PI * 2) * BREATHE_PULL_PX;

    // Spawn new particles
    this.spawnTimerMs += delta;
    if (this.spawnTimerMs >= SPAWN_INTERVAL_MS && this.particles.length < MAX_PARTICLES) {
      this.spawnTimerMs = 0;
      this.spawnParticle(centerX, centerY);
    }

    // Update existing particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += delta;

      if (p.age >= p.lifetime) {
        p.graphic.destroy();
        this.particles.splice(i, 1);
        continue;
      }

      const lifeProgress = p.age / p.lifetime;
      // Fade in first 20%, fade out last 30%
      let alpha: number;
      if (lifeProgress < 0.2) {
        alpha = lifeProgress / 0.2;
      } else if (lifeProgress > 0.7) {
        alpha = (1 - lifeProgress) / 0.3;
      } else {
        alpha = 1;
      }
      alpha *= 0.6; // Overall subtlety

      const t = p.age / 1000;

      if (p.orbit) {
        p.orbitAngle += ORBIT_SPEED_RAD_PER_SEC * (delta / 1000);
        p.x = centerX + Math.cos(p.orbitAngle) * ORBIT_RADIUS_PX;
        p.y = centerY + Math.sin(p.orbitAngle) * ORBIT_RADIUS_PX - DRIFT_SPEED_PX_PER_SEC * t;
      } else {
        const sway = Math.sin((t * SWAY_FREQUENCY_HZ + p.swayPhase) * Math.PI * 2) * SWAY_AMPLITUDE_PX;
        p.x = p.baseX + sway;
        p.y = p.baseY - DRIFT_SPEED_PX_PER_SEC * t;
      }

      // Breathing: pull toward center
      const dx = centerX - p.x;
      const dy = centerY - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 1) {
        p.x += (dx / dist) * breathePull * (delta / 1000);
        p.y += (dy / dist) * breathePull * (delta / 1000);
      }

      p.graphic.clear();
      p.graphic.fillStyle(p.color, alpha);
      p.graphic.fillCircle(0, 0, p.size);
      p.graphic.setPosition(p.x, p.y);
      p.graphic.setDepth(p.behind ? baseDepth - 1 : baseDepth + 1);
    }
  }

  private spawnParticle(cx: number, cy: number): void {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * SPAWN_RADIUS_PX;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;

    const graphic = this.scene.add.graphics();
    const size = 1 + Math.random() * 1.5;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const orbit = Math.random() < 0.3;

    graphic.fillStyle(color, 0);
    graphic.fillCircle(0, 0, size);
    graphic.setPosition(x, y);

    this.particles.push({
      graphic, x, y, baseX: x, baseY: y,
      age: 0,
      lifetime: PARTICLE_LIFETIME_MS + (Math.random() - 0.5) * 600,
      size, color, orbit,
      orbitAngle: angle,
      swayPhase: Math.random(),
      behind: Math.random() < 0.4,
    });
  }

  onDestroy(): void {
    for (const p of this.particles) {
      p.graphic.destroy();
    }
    this.particles = [];
  }
}
