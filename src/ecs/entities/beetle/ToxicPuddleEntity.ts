import { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { HealthComponent } from '../../components/core/HealthComponent';
import type { EntityManager } from '../../EntityManager';
import type { Component } from '../../Component';

const PUDDLE_DURATION_MS = 4000;
const PUDDLE_DAMAGE_PER_SEC = 5;
const PUDDLE_RADIUS_PX = 30;
const PUDDLE_COLOR = 0x44cc22;
const SPLAT_COUNT = 8;
const PARTICLE_COUNT = 6;
const EXPAND_DURATION_MS = 300;
const FUME_INTERVAL_MS = 150;

export type CreateToxicPuddleProps = {
  scene: Phaser.Scene;
  x: number;
  y: number;
  entityManager: EntityManager;
};

class ToxicPuddleComponent implements Component {
  entity!: Entity;
  private elapsedMs = 0;
  private readonly splats: Phaser.GameObjects.Ellipse[] = [];
  private readonly particles: Phaser.GameObjects.Ellipse[] = [];
  private readonly fumes: Phaser.GameObjects.Ellipse[] = [];
  private damageCooldownMs = 0;
  private fumeTimerMs = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly x: number,
    private readonly y: number,
    private readonly entityManager: EntityManager
  ) {
    // Create irregular splatter from overlapping ellipses of varying sizes
    for (let i = 0; i < SPLAT_COUNT; i++) {
      const angle = (i / SPLAT_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
      const dist = Math.random() * PUDDLE_RADIUS_PX * 0.6;
      const sx = x + Math.cos(angle) * dist;
      const sy = y + Math.sin(angle) * dist;
      const w = 14 + Math.random() * 22;
      const h = 10 + Math.random() * 16;
      const splat = scene.add.ellipse(sx, sy, w, h, PUDDLE_COLOR, 0.6 + Math.random() * 0.2);
      splat.setDepth(-2);
      splat.setAngle(Math.random() * 360);
      splat.setScale(0.1);
      splat.setAlpha(0);
      this.splats.push(splat);

      scene.tweens.add({
        targets: splat,
        scaleX: 1,
        scaleY: 1,
        alpha: 0.6 + Math.random() * 0.2,
        duration: EXPAND_DURATION_MS,
        delay: (dist / PUDDLE_RADIUS_PX) * 100,
        ease: 'Cubic.easeOut',
      });
    }

    // Small scattered droplets
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = PUDDLE_RADIUS_PX * (0.5 + Math.random() * 0.8);
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist;
      const size = 2 + Math.random() * 4;
      const particle = scene.add.ellipse(px, py, size, size * 0.7, PUDDLE_COLOR, 0);
      particle.setDepth(-2);
      this.particles.push(particle);

      scene.tweens.add({
        targets: particle,
        alpha: 0.7,
        duration: 150,
        delay: EXPAND_DURATION_MS * 0.5 + Math.random() * 150,
      });
    }
  }

  update(delta: number): void {
    this.elapsedMs += delta;
    this.damageCooldownMs += delta;
    this.fumeTimerMs += delta;

    // Spawn rising fumes
    if (this.fumeTimerMs >= FUME_INTERVAL_MS && this.elapsedMs < PUDDLE_DURATION_MS - 400) {
      this.fumeTimerMs = 0;
      this.spawnFume();
    }

    // Fade out in last 500ms
    const remaining = PUDDLE_DURATION_MS - this.elapsedMs;
    if (remaining < 500) {
      const alpha = Math.max(0, remaining / 500);
      for (const s of this.splats) s.setAlpha(alpha * 0.7);
      for (const p of this.particles) p.setAlpha(alpha * 0.7);
    }

    // Damage player if on puddle
    if (this.damageCooldownMs >= 200) {
      this.damageCooldownMs = 0;
      const player = this.entityManager.getFirst('player');
      if (player) {
        const playerTransform = player.get(TransformComponent);
        if (playerTransform) {
          const dist = Math.hypot(playerTransform.x - this.x, playerTransform.y - this.y);
          if (dist < PUDDLE_RADIUS_PX) {
            const health = player.get(HealthComponent);
            if (health) {
              health.takeDamage(PUDDLE_DAMAGE_PER_SEC * 0.2);
            }
          }
        }
      }
    }

    if (this.elapsedMs >= PUDDLE_DURATION_MS) {
      this.entity.destroy();
    }
  }

  private spawnFume(): void {
    const offsetX = (Math.random() - 0.5) * PUDDLE_RADIUS_PX;
    const offsetY = (Math.random() - 0.5) * PUDDLE_RADIUS_PX * 0.6;
    const size = 4 + Math.random() * 6;
    const fume = this.scene.add.ellipse(this.x + offsetX, this.y + offsetY, size, size, 0x88ee44, 0.4);
    fume.setDepth(-1);
    this.fumes.push(fume);

    this.scene.tweens.add({
      targets: fume,
      y: fume.y - 15 - Math.random() * 10,
      alpha: 0,
      scaleX: 1.5 + Math.random(),
      scaleY: 1.5 + Math.random(),
      duration: 500 + Math.random() * 300,
      ease: 'Quad.easeOut',
      onComplete: () => {
        fume.destroy();
        const idx = this.fumes.indexOf(fume);
        if (idx >= 0) this.fumes.splice(idx, 1);
      }
    });
  }

  onDestroy(): void {
    for (const s of this.splats) {
      this.scene.tweens.killTweensOf(s);
      s.destroy();
    }
    for (const p of this.particles) {
      this.scene.tweens.killTweensOf(p);
      p.destroy();
    }
    for (const f of this.fumes) {
      this.scene.tweens.killTweensOf(f);
      f.destroy();
    }
  }
}

export function createToxicPuddleEntity(props: CreateToxicPuddleProps): Entity {
  const { scene, x, y, entityManager } = props;

  const entity = new Entity(`toxic_puddle_${Date.now()}`);
  entity.add(new TransformComponent(x, y));
  entity.add(new ToxicPuddleComponent(scene, x, y, entityManager));

  entity.setUpdateOrder([TransformComponent, ToxicPuddleComponent]);

  return entity;
}
