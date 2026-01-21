import type { IState } from '../utils/state/IState';
import type { Entity } from '../ecs/Entity';
import { Direction } from '../constants/Direction';
import { SpriteComponent } from '../ecs/components/SpriteComponent';
import type Phaser from 'phaser';

// Death state configuration
const DEATH_ANIMATION_SPEED = 200; // milliseconds per frame
const DEATH_TOTAL_FRAMES = 7;

export class RobotDeathState implements IState {
  private readonly entity: Entity;
  private readonly currentDirection: Direction = Direction.Down;
  private animationFrame: number = 0;
  private animationTimer: number = 0;
  private animationComplete: boolean = false;
  private scene!: Phaser.Scene;

  constructor(entity: Entity) {
    this.entity = entity;
  }

  onEnter(): void {
    this.animationFrame = 0;
    this.animationTimer = 0;
    this.animationComplete = false;

    // Use current direction (could be enhanced later to track from previous state)
    const sprite = this.entity.get(SpriteComponent);
    if (sprite) {
      sprite.sprite.clearTint();
      this.scene = sprite.sprite.scene;

      // Fade out during death animation
      this.scene.tweens.add({
        targets: sprite.sprite,
        alpha: 0,
        duration: DEATH_ANIMATION_SPEED * DEATH_TOTAL_FRAMES,
        ease: 'Linear',
      });
    }
  }

  onExit(): void {
    // Clean up
  }

  onUpdate(delta: number): void {
    if (this.animationComplete) return;

    this.animationTimer += delta;

    const sprite = this.entity.get(SpriteComponent);
    if (!sprite) return;

    // Animate death
    if (this.animationTimer >= DEATH_ANIMATION_SPEED) {
      this.animationTimer = 0;
      this.animationFrame++;

      if (this.animationFrame >= DEATH_TOTAL_FRAMES) {
        // Animation complete, mark for removal
        this.animationComplete = true;
        this.entity.markForRemoval();
        return;
      }
    }

    // Set sprite frame (death animation)
    const frameIndex = this.getDeathFrameForDirection(this.currentDirection, this.animationFrame);
    sprite.sprite.setFrame(frameIndex);
  }

  private getDeathFrameForDirection(direction: Direction, frame: number): number {
    // Death animation starts at frame 72
    // 8 directions × 7 frames = 56 frames
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
    return 72 + (dirIndex * 7) + frame;
  }
}
