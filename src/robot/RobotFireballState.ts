import type { IState } from '../utils/state/IState';
import type { Entity } from '../ecs/Entity';
import { Direction, dirFromDelta } from '../constants/Direction';
import { TransformComponent } from '../ecs/components/TransformComponent';
import { StateMachineComponent } from '../ecs/components/StateMachineComponent';
import { SpriteComponent } from '../ecs/components/SpriteComponent';

// Fireball state configuration
const FIREBALL_ANIMATION_SPEED = 100; // milliseconds per frame
const FIREBALL_TOTAL_FRAMES = 6;

export class RobotFireballState implements IState {
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

    const transform = this.entity.get(TransformComponent);
    const playerTransform = this.playerEntity.get(TransformComponent);

    if (!transform || !playerTransform) return;

    // Calculate direction to player
    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    this.currentDirection = dirFromDelta(dx, dy);
  }

  onExit(): void {
    // Clean up
  }

  onUpdate(delta: number): void {
    this.animationTimer += delta;

    const stateMachine = this.entity.get(StateMachineComponent);
    const sprite = this.entity.get(SpriteComponent);

    if (!stateMachine || !sprite) return;

    // Animate fireball
    if (this.animationTimer >= FIREBALL_ANIMATION_SPEED) {
      this.animationTimer = 0;
      this.animationFrame++;

      if (this.animationFrame >= FIREBALL_TOTAL_FRAMES) {
        // Animation complete, return to stalking
        stateMachine.stateMachine.enter('stalking');
        return;
      }
    }

    // Set sprite frame (fireball animation)
    const frameIndex = this.getFireballFrameForDirection(this.currentDirection, this.animationFrame);
    sprite.sprite.setFrame(frameIndex);
  }

  private getFireballFrameForDirection(direction: Direction, frame: number): number {
    // Fireball animation starts at frame 128
    // 8 directions × 6 frames = 48 frames
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
    return 128 + (dirIndex * 6) + frame;
  }
}
