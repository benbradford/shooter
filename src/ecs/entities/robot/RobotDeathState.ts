import type { IState } from '../../../utils/state/IState';
import type { Entity } from '../../Entity';
import { Direction } from '../../../constants/Direction';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { CollisionComponent } from '../../components/combat/CollisionComponent';
import { RobotHitParticlesComponent } from '../../components/visual/RobotHitParticlesComponent';
import type Phaser from 'phaser';

// Death state configuration
const DEATH_ANIMATION_SPEED = 200; // milliseconds per frame
const DEATH_TOTAL_FRAMES = 7;

export class RobotDeathState implements IState {
  private readonly entity: Entity;
  private currentDirection: Direction = Direction.Down;
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

    // Emit death particle burst
    const hitParticles = this.entity.get(RobotHitParticlesComponent);
    if (hitParticles) {
      hitParticles.emitDeathParticles();
    }

    // Remove collision component so bullets pass through
    this.entity.remove(CollisionComponent);

    // Get current facing direction from sprite frame
    const sprite = this.entity.get(SpriteComponent);
    if (sprite) {
      const currentFrame = sprite.sprite.frame.name;
      const frameNum = Number.parseInt(currentFrame, 10);
      
      // Determine direction from current frame
      // Idle frames: 0-7 (8 directions)
      // Walk frames: 8-71 (8 directions × 8 frames)
      if (frameNum < 8) {
        // Idle frame
        this.currentDirection = this.getDirectionFromIdleFrame(frameNum);
      } else if (frameNum < 72) {
        // Walk frame
        const dirIndex = Math.floor((frameNum - 8) / 8);
        this.currentDirection = this.getDirectionFromIndex(dirIndex);
      }
      
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

  private getDirectionFromIdleFrame(frame: number): Direction {
    const directions = [
      Direction.Down,
      Direction.Up,
      Direction.Left,
      Direction.Right,
      Direction.UpLeft,
      Direction.UpRight,
      Direction.DownLeft,
      Direction.DownRight,
    ];
    return directions[frame] || Direction.Down;
  }

  private getDirectionFromIndex(index: number): Direction {
    const directions = [
      Direction.Down,
      Direction.Up,
      Direction.Left,
      Direction.Right,
      Direction.UpLeft,
      Direction.UpRight,
      Direction.DownLeft,
      Direction.DownRight,
    ];
    return directions[index] || Direction.Down;
  }
}
