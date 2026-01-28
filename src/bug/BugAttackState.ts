import type { IState } from '../utils/state/IState';
import type { Entity } from '../ecs/Entity';
import { TransformComponent } from '../ecs/components/core/TransformComponent';
import { SpriteComponent } from '../ecs/components/core/SpriteComponent';
import { StateMachineComponent } from '../ecs/components/core/StateMachineComponent';

const LEAP_DURATION_MS = 700;
const LEAP_HEIGHT_PX = 30;
const COOLDOWN_MS = 1000;
const SPRITE_FRAME_DOWN = 0;
const SPRITE_FRAME_UP = 4;
const SPRITE_FRAME_LEFT = 8;
const SPRITE_FRAME_RIGHT = 12;

export class BugAttackState implements IState {
  private readonly entity: Entity;
  private readonly playerEntity: Entity;
  private readonly scene: Phaser.Scene;
  private elapsedMs = 0;
  private startX = 0;
  private startY = 0;
  private targetX = 0;
  private targetY = 0;
  private lastAttackTime = 0;
  private isLeaping = false;

  constructor(entity: Entity, playerEntity: Entity, scene: Phaser.Scene) {
    this.entity = entity;
    this.playerEntity = playerEntity;
    this.scene = scene;
  }

  onEnter(): void {
    const currentTime = Date.now();
    if (currentTime - this.lastAttackTime < COOLDOWN_MS) {
      const stateMachine = this.entity.require(StateMachineComponent);
      stateMachine.stateMachine.enter('chase');
      return;
    }

    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const sprite = this.entity.require(SpriteComponent);

    this.startX = transform.x;
    this.startY = transform.y;
    this.targetX = playerTransform.x;
    this.targetY = playerTransform.y;
    this.elapsedMs = 0;
    this.lastAttackTime = currentTime;
    this.isLeaping = true;

    const dx = this.targetX - this.startX;
    const dy = this.targetY - this.startY;
    const isHorizontal = Math.abs(dx) > Math.abs(dy);
    let baseFrame: number;
    if (isHorizontal) {
      baseFrame = dx > 0 ? SPRITE_FRAME_RIGHT : SPRITE_FRAME_LEFT;
    } else {
      baseFrame = dy > 0 ? SPRITE_FRAME_DOWN : SPRITE_FRAME_UP;
    }
    sprite.sprite.setFrame(baseFrame);
  }

  onExit(): void {
    this.isLeaping = false;
  }

  isActive(): boolean {
    return this.isLeaping;
  }

  onUpdate(delta: number): void {
    this.elapsedMs += delta;

    const transform = this.entity.require(TransformComponent);
    const sprite = this.entity.require(SpriteComponent);

    const progress = Math.min(this.elapsedMs / LEAP_DURATION_MS, 1);

    transform.x = this.startX + (this.targetX - this.startX) * progress;
    transform.y = this.startY + (this.targetY - this.startY) * progress;

    const arc = Math.sin(progress * Math.PI);
    const offsetY = -arc * LEAP_HEIGHT_PX;
    sprite.sprite.setY(transform.y + offsetY);

    if (progress >= 1) {
      this.isLeaping = false;
      sprite.sprite.setY(transform.y);
      sprite.sprite.setScale(2);

      const playerTransform = this.playerEntity.get(TransformComponent);
      if (playerTransform) {
        const distance = Math.hypot(transform.x - playerTransform.x, transform.y - playerTransform.y);
        if (distance < 64) {
          const emitter = this.scene.add.particles(transform.x, transform.y, 'robot_hit_particle', {
            speed: { min: 100, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.8, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 600,
            frequency: 10,
            tint: [0x00ff00, 0xffff00],
            blendMode: 'ADD'
          });
          emitter.setDepth(1000);
          this.scene.time.delayedCall(200, () => emitter.stop());
          this.scene.time.delayedCall(800, () => emitter.destroy());

          // Damage player logic here

          this.entity.destroy();
        } else {
          const stateMachine = this.entity.get(StateMachineComponent);
          if (stateMachine) {
            stateMachine.stateMachine.enter('chase');
          }
        }
      }
    }
  }
}
