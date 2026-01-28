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
const WALK_ANIMATION_FRAME_COUNT = 8;

export class RobotRetreatState implements IState {
  private readonly entity: Entity;
  private readonly playerEntity: Entity;
  private currentDirection: Direction = Direction.Down;
  private animationFrame: number = 0;
  private animationTimer: number = 0;
  private stuckTimer: number = 0;

  constructor(entity: Entity, playerEntity: Entity) {
    this.entity = entity;
    this.playerEntity = playerEntity;
  }

  onEnter(): void {
    this.animationFrame = 0;
    this.animationTimer = 0;
    this.stuckTimer = 0;
  }

  onExit(): void {
    // Clean up
  }

  onUpdate(delta: number): void {
    this.animationTimer += delta;

    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const stateMachine = this.entity.require(StateMachineComponent);
    const sprite = this.entity.require(SpriteComponent);
    const patrol = this.entity.require(PatrolComponent);

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
    const prevX = transform.x;
    const prevY = transform.y;
    
    transform.x += retreatDirX * speed * (delta / 1000);
    transform.y += retreatDirY * speed * (delta / 1000);

    // If stuck (position didn't change much), accumulate stuck time
    if (Math.abs(transform.x - prevX) < 1 && Math.abs(transform.y - prevY) < 1) {
      this.stuckTimer += delta;
      if (this.stuckTimer > 500) {
        stateMachine.stateMachine.enter('stalking');
        return;
      }
    } else {
      this.stuckTimer = 0;
    }

    this.currentDirection = dirFromDelta(retreatDirX, retreatDirY);
    this.updateAnimation(sprite);
  }

  private updateAnimation(sprite: SpriteComponent): void {
    if (this.animationTimer >= ANIMATION_SPEED_MS) {
      this.animationTimer = 0;
      this.animationFrame = (this.animationFrame + 1) % WALK_ANIMATION_FRAME_COUNT;
    }

    const directionIndex = this.currentDirection;
    const frameIndex = WALK_ANIMATION_FRAME_COUNT + directionIndex * WALK_ANIMATION_FRAME_COUNT + this.animationFrame;
    sprite.sprite.setFrame(frameIndex);
  }
}
