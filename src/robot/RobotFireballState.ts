import type { IState } from '../utils/state/IState';
import type { Entity } from '../ecs/Entity';
import { Direction, dirFromDelta } from '../constants/Direction';
import { TransformComponent } from '../ecs/components/TransformComponent';
import { StateMachineComponent } from '../ecs/components/StateMachineComponent';
import { SpriteComponent } from '../ecs/components/SpriteComponent';
import { FireballPropertiesComponent } from '../ecs/components/FireballPropertiesComponent';
import { createFireballEntity } from '../projectile/FireballEntity';

interface FireballOffset {
  x: number;
  y: number;
}

// Fireball state configuration
const FIREBALL_ANIMATION_SPEED_MS = 100; // milliseconds per frame
const FIREBALL_TOTAL_FRAMES = 6;
const FIREBALL_LAUNCH_FRAME = 4; // frame number to launch fireball

// Fireball launch offsets per direction
const FIREBALL_OFFSETS: Record<Direction, FireballOffset> = {
  [Direction.None]: { x: 0, y: 0 },
  [Direction.Down]: { x: 0, y: 20 },
  [Direction.Up]: { x: 0, y: -20 },
  [Direction.Left]: { x: -20, y: 0 },
  [Direction.Right]: { x: 20, y: 0 },
  [Direction.UpLeft]: { x: -15, y: -15 },
  [Direction.UpRight]: { x: 15, y: -15 },
  [Direction.DownLeft]: { x: -15, y: 15 },
  [Direction.DownRight]: { x: 15, y: 15 },
};

export class RobotFireballState implements IState {
  private readonly entity: Entity;
  private readonly scene: Phaser.Scene;
  private readonly playerEntity: Entity;
  private currentDirection: Direction = Direction.Down;
  private animationFrame: number = 0;
  private animationTimer: number = 0;
  private hasLaunchedFireball: boolean = false;

  constructor(entity: Entity, scene: Phaser.Scene, playerEntity: Entity) {
    this.entity = entity;
    this.scene = scene;
    this.playerEntity = playerEntity;
  }

  onEnter(): void {
    this.animationFrame = 0;
    this.animationTimer = 0;
    this.hasLaunchedFireball = false;

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
    if (this.animationTimer >= FIREBALL_ANIMATION_SPEED_MS) {
      this.animationTimer = 0;
      this.animationFrame++;

      // Launch fireball on specific frame
      if (this.animationFrame === FIREBALL_LAUNCH_FRAME && !this.hasLaunchedFireball) {
        this.launchFireball();
        this.hasLaunchedFireball = true;
      }

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

  private launchFireball(): void {
    const transform = this.entity.get(TransformComponent);
    const playerTransform = this.playerEntity.get(TransformComponent);
    const fireballProps = this.entity.get(FireballPropertiesComponent);

    if (!transform || !playerTransform || !fireballProps) return;

    // Calculate direction to player
    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    const distance = Math.hypot(dx, dy);

    if (distance === 0) return;

    const dirX = dx / distance;
    const dirY = dy / distance;

    // Calculate max distance from duration
    const maxDistance = fireballProps.speed * (fireballProps.duration / 1000);

    // Get offset for current direction
    const offset = FIREBALL_OFFSETS[this.currentDirection];

    // Create fireball entity
    const fireball = createFireballEntity(
      this.scene,
      transform.x + offset.x,
      transform.y + offset.y,
      dirX,
      dirY,
      fireballProps.speed,
      maxDistance
    );

    // Add to scene's entity manager
    const gameScene = this.scene as Phaser.Scene & {
      entityManager?: { add: (entity: Entity) => void };
    };
    if (gameScene.entityManager) {
      gameScene.entityManager.add(fireball);
    }
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
