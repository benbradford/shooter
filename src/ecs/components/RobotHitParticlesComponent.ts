import type { Component } from '../Component';
import type { Entity } from '../Entity';
import { TransformComponent } from './TransformComponent';

export class RobotHitParticlesComponent implements Component {
  entity!: Entity;
  private scene: Phaser.Scene;
  private activeEmitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  init(): void {
    // Particle emitters will be created on demand
  }

  update(_delta: number): void {
    // Update emitter positions to follow robot
    const transform = this.entity.get(TransformComponent);
    if (!transform) return;

    this.activeEmitters.forEach(emitter => {
      if (emitter.active) {
        emitter.setPosition(transform.x, transform.y);
      }
    });
  }

  emitHitParticles(bulletDirX: number, bulletDirY: number): void {
    const transform = this.entity.get(TransformComponent);
    if (!transform) return;

    const angle = Math.atan2(bulletDirY, bulletDirX) * 180 / Math.PI;
    
    const emitter = this.scene.add.particles(transform.x, transform.y, 'robot_hit_particle', {
      speed: { min: 80, max: 200 },
      angle: { min: angle - 45, max: angle + 45 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 800,
      frequency: 20,
      blendMode: 'ADD'
    });
    
    emitter.setDepth(1000);
    this.activeEmitters.push(emitter);
    
    // Stop emitting after 200ms
    this.scene.time.delayedCall(200, () => {
      emitter.stop();
    });
    
    // Destroy emitter after all particles fade out (800ms lifespan + 200ms emission)
    this.scene.time.delayedCall(1000, () => {
      const index = this.activeEmitters.indexOf(emitter);
      if (index > -1) {
        this.activeEmitters.splice(index, 1);
      }
      emitter.destroy();
    });
  }

  onDestroy(): void {
    this.activeEmitters.forEach(emitter => emitter.destroy());
    this.activeEmitters = [];
  }
}
