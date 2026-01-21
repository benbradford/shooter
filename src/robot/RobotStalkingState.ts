import type { IState } from '../utils/state/IState';
import type { Entity } from '../ecs/Entity';
import { Direction, dirFromDelta } from '../constants/Direction';
import { TransformComponent } from '../ecs/components/TransformComponent';
import { StateMachineComponent } from '../ecs/components/StateMachineComponent';
import { SpriteComponent } from '../ecs/components/SpriteComponent';
import { GridCollisionComponent } from '../ecs/components/GridCollisionComponent';
import { PatrolComponent } from '../ecs/components/PatrolComponent';

// Stalking state configuration
const MIN_STALK_TIME = 2000; // milliseconds before can attack
const ATTACK_RANGE = 500; // pixels
const STALKING_SPEED_MULTIPLIER = 1.3;
const ANIMATION_SPEED = 100; // milliseconds per frame

export class RobotStalkingState implements IState {
  private readonly entity: Entity;
  private readonly playerEntity: Entity;
  private stalkingTime: number = 0;
  private currentDirection: Direction = Direction.Down;
  private animationFrame: number = 0;
  private animationTimer: number = 0;

  constructor(entity: Entity, playerEntity: Entity) {
    this.entity = entity;
    this.playerEntity = playerEntity;
  }

  onEnter(): void {
    this.stalkingTime = 0;
    this.animationFrame = 0;
    this.animationTimer = 0;
  }

  onExit(): void {
    // Clean up
  }

  onUpdate(delta: number): void {
    this.stalkingTime += delta;
    this.animationTimer += delta;

    const transform = this.entity.get(TransformComponent);
    const playerTransform = this.playerEntity.get(TransformComponent);
    const stateMachine = this.entity.get(StateMachineComponent);
    const sprite = this.entity.get(SpriteComponent);
    const gridCollision = this.entity.get(GridCollisionComponent);
    const patrol = this.entity.get(PatrolComponent);

    if (!transform || !playerTransform || !stateMachine || !sprite || !patrol) return;

    // Calculate direction to player
    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    const distance = Math.hypot(dx, dy);

    // Check if should attack
    if (distance <= ATTACK_RANGE && this.stalkingTime >= MIN_STALK_TIME) {
      stateMachine.stateMachine.enter('fireball');
      return;
    }

    // Move towards player
    const dirX = dx / distance;
    const dirY = dy / distance;
    const moveSpeed = (patrol as PatrolComponent).speed * STALKING_SPEED_MULTIPLIER * (delta / 1000);

    const newX = transform.x + dirX * moveSpeed;
    const newY = transform.y + dirY * moveSpeed;

    // Check collision - simplified for now
    if (gridCollision) {
      // Just apply movement - collision detection can be enhanced later
      transform.x = newX;
      transform.y = newY;
    } else {
      transform.x = newX;
      transform.y = newY;
    }

    // Update direction
    this.currentDirection = dirFromDelta(dirX, dirY);

    // Animate walk cycle
    if (this.animationTimer >= ANIMATION_SPEED) {
      this.animationTimer = 0;
      this.animationFrame = (this.animationFrame + 1) % 8;
    }

    // Set sprite frame (walk animation)
    const frameIndex = this.getWalkFrameForDirection(this.currentDirection, this.animationFrame);
    sprite.sprite.setFrame(frameIndex);
  }

  private getWalkFrameForDirection(direction: Direction, frame: number): number {
    // Walk animation starts at frame 8
    // 8 directions × 8 frames = 64 frames
    const directionMap: Record<Direction, number> = {
      [Direction.None]: 0,
      [Direction.Down]: 0,
      [Direction.Up]: 1,
      [Direction.Left]: 2,
      [Direction.Right]: 3,
      [Direction.UpLeft]: 4,
      [Direction.UpRight]: 5,
      [Direction.DownLeft]: 6,
      [Direction.DownRight]: 7,
    };
    const dirIndex = directionMap[direction] || 0;
    return 8 + (dirIndex * 8) + frame;
  }
}
