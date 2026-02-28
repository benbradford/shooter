import type { IState } from '../../../systems/state/IState';
import { DEPTH_PLAYER } from '../../../constants/DepthConstants';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { CollisionComponent } from '../../components/combat/CollisionComponent';

const DEATH_PARTICLE_COUNT_MIN = 1;
const DEATH_PARTICLE_COUNT_MAX = 3;
const DEATH_PARTICLE_SPEED_MIN_PX_PER_SEC = 100;
const DEATH_PARTICLE_SPEED_MAX_PX_PER_SEC = 225;
const DEATH_PARTICLE_LIFESPAN_MS = 400;

export class SkeletonDeathState implements IState {
  private hasSpawnedParticles = false;

  constructor(
    private readonly entity: Entity,
    private readonly scene: Phaser.Scene
  ) {}

  onEnter(): void {
    this.hasSpawnedParticles = false;

    const collision = this.entity.get(CollisionComponent);
    if (collision) {
      this.entity.remove(CollisionComponent);
    }
  }

  onUpdate(_delta: number): void {
    if (!this.hasSpawnedParticles) {
      this.hasSpawnedParticles = true;

      const transform = this.entity.require(TransformComponent);

      const particleCount = DEATH_PARTICLE_COUNT_MIN + Math.floor(Math.random() * (DEATH_PARTICLE_COUNT_MAX - DEATH_PARTICLE_COUNT_MIN + 1));

      const emitter = this.scene.add.particles(transform.x, transform.y, 'bone_small', {
        speed: { min: DEATH_PARTICLE_SPEED_MIN_PX_PER_SEC, max: DEATH_PARTICLE_SPEED_MAX_PX_PER_SEC },
        angle: { min: 0, max: 360 },
        scale: { start: 0.17, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: DEATH_PARTICLE_LIFESPAN_MS,
        quantity: particleCount,
        rotate: { min: -50, max: 50 },
        blendMode: 'NORMAL'
      });

      emitter.setDepth(DEPTH_PLAYER);

      this.scene.time.delayedCall(DEATH_PARTICLE_LIFESPAN_MS / 2, () => {
        emitter.stop();
      });

      this.scene.time.delayedCall(DEATH_PARTICLE_LIFESPAN_MS * 3, () => {
        emitter.destroy();
      });

      this.scene.time.delayedCall(0, () => this.entity.destroy());
    }
  }
}
