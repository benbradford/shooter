import { Entity } from '../../Entity';
import { Depth } from '../../../constants/DepthConstants';

export function createParticleEffectEntity(
  scene: Phaser.Scene,
  x: number,
  y: number,
  texture: string,
  config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
  emitDurationMs: number,
  totalDurationMs: number
): Entity {
  const entity = new Entity('particle_effect');

  const emitter = scene.add.particles(x, y, texture, config);
  emitter.setDepth(Depth.particle);

  scene.time.delayedCall(emitDurationMs, () => {
    emitter.stop();
  });

  scene.time.delayedCall(totalDurationMs, () => {
    emitter.destroy();
    entity.destroy();
  });

  return entity;
}
