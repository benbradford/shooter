import type { IState } from '../utils/state/IState';
import type { Entity } from '../ecs/Entity';
import { Direction, dirFromDelta } from '../constants/Direction';
import { TransformComponent } from '../ecs/components/core/TransformComponent';
import { StateMachineComponent } from '../ecs/components/core/StateMachineComponent';
import { SpriteComponent } from '../ecs/components/core/SpriteComponent';
import { PatrolComponent } from '../ecs/components/ai/PatrolComponent';

const SAFE_DISTANCE_PX = 220;
const RETREAT_SPEED_MULTIPLIER = 1.75;
const ANIMATION_SPEED_MS = 100;

export class RobotRetreatState implements IState {
  private readonly entity: Entity;
  private readonly playerEntity: Entity;
  private currentDirection: Direction = Direction.Down;
  private animationFrame: number = 0;
  private animationTimer: number = 0;

  constructor(entity: Entity, playerEntity: Entity) {
    this.entity = entity;
    this.playerEntity = playerEntity;
  }

  onEnter(): void {
    this.animationFrame = 0;
    this.animationTimer = 0;
  }

  onExit(): void {
    // Clean up
  }

  onUpdate(delta: number): void {
    this.animationTimer += delta;

    const transform = this.entity.get(TransformComponent);
    const playerTransform = this.playerEntity.get(TransformComponent);
    const stateMachine = this.entity.get(StateMachineComponent);
    const sprite = this.entity.get(SpriteComponent);
    const patrol = this.entity.get(PatrolComponent);

    if (!transform || !playerTransform || !stateMachine || !sprite || !patrol) return;

    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    const distance = Math.hypot(dx, dy);

    if (distance >= SAFE_DISTANCE_PX) {
      stateMachine.stateMachine.enter('fireball');
      return;
    }

    const retreatDirX = -dx / distance;
    const retreatDirY = -dy / distance;

    const speed = patrol.speed * RETREAT_SPEED_MULTIPLIER;
    transform.x += retreatDirX * speed * (delta / 1000);
    transform.y += retreatDirY * speed * (delta / 1000);

    this.currentDirection = dirFromDelta(retreatDirX, retreatDirY);
    this.updateAnimation(sprite);
  }

  private updateAnimation(sprite: SpriteComponent): void {
    if (this.animationTimer >= ANIMATION_SPEED_MS) {
      this.animationTimer = 0;
      this.animationFrame = (this.animationFrame + 1) % 8;
    }

    const directionIndex = this.currentDirection;
    const frameIndex = 8 + directionIndex * 8 + this.animationFrame;
    sprite.sprite.setFrame(frameIndex);
  }
}
