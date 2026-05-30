import { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { HealthComponent } from '../../components/core/HealthComponent';
import type { EntityManager } from '../../EntityManager';
import type { Component } from '../../Component';

const PUDDLE_DURATION_MS = 2000;
const PUDDLE_DAMAGE_PER_SEC = 5;
const PUDDLE_RADIUS_PX = 30;
const PUDDLE_COLOR = 0x44cc22;
const PUDDLE_PARTICLE_COUNT = 12;

export type CreateToxicPuddleProps = {
  scene: Phaser.Scene;
  x: number;
  y: number;
  entityManager: EntityManager;
};

class ToxicPuddleComponent implements Component {
  entity!: Entity;
  private elapsedMs = 0;
  private readonly graphics: Phaser.GameObjects.Ellipse;
  private readonly particles: Phaser.GameObjects.Ellipse[] = [];
  private damageCooldownMs = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly x: number,
    private readonly y: number,
    private readonly entityManager: EntityManager
  ) {
    // Create puddle visual
    this.graphics = scene.add.ellipse(x, y, PUDDLE_RADIUS_PX * 2, PUDDLE_RADIUS_PX * 1.2, PUDDLE_COLOR, 0.7);
    this.graphics.setDepth(-2);

    // Spawn splatter particles
    for (let i = 0; i < PUDDLE_PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * PUDDLE_RADIUS_PX * 1.5;
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist;
      const size = 3 + Math.random() * 5;
      const particle = scene.add.ellipse(px, py, size, size, PUDDLE_COLOR, 0.8);
      particle.setDepth(-2);
      this.particles.push(particle);
    }
  }

  update(delta: number): void {
    this.elapsedMs += delta;
    this.damageCooldownMs += delta;

    // Fade out in last 500ms
    const remaining = PUDDLE_DURATION_MS - this.elapsedMs;
    if (remaining < 500) {
      const alpha = Math.max(0, remaining / 500) * 0.7;
      this.graphics.setAlpha(alpha);
      for (const p of this.particles) p.setAlpha(alpha);
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
              // 5 damage per second, applied every 200ms = 1 damage per tick
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

  onDestroy(): void {
    this.graphics.destroy();
    for (const p of this.particles) p.destroy();
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
