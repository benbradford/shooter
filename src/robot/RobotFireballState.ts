import type { IState } from '../utils/state/IState';
import type { Entity } from '../ecs/Entity';
import type { Grid } from '../utils/Grid';
import { Direction, dirFromDelta } from '../constants/Direction';
import { TransformComponent } from '../ecs/components/core/TransformComponent';
import { StateMachineComponent } from '../ecs/components/core/StateMachineComponent';
import { SpriteComponent } from '../ecs/components/core/SpriteComponent';
import { FireballPropertiesComponent } from '../ecs/components/ai/FireballPropertiesComponent';
import { createFireballEntity } from '../projectile/FireballEntity';

type FireballOffset = {
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

    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);

    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    this.currentDirection = dirFromDelta(dx, dy);
  }

  onExit(): void {
    // Clean up
  }

  onUpdate(delta: number): void {
    this.animationTimer += delta;

    const stateMachine = this.entity.require(StateMachineComponent);
    const sprite = this.entity.require(SpriteComponent);

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
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const fireballProps = this.entity.require(FireballPropertiesComponent);

    const dx = playerTransform.x - transform.x;
    const dy = playerTransform.y - transform.y;
    const distance = Math.hypot(dx, dy);

    if (distance === 0) return;

    const dirX = dx / distance;
    const dirY = dy / distance;

    const maxDistance = fireballProps.speed * (fireballProps.duration / 1000);

    const offset = FIREBALL_OFFSETS[this.currentDirection];

    const gameScene = this.scene as Phaser.Scene & {
      entityManager?: { add: (entity: Entity) => void };
      getGrid?: () => Grid;
    };

    if (!gameScene.entityManager || !gameScene.getGrid) return;

    const grid = gameScene.getGrid();
    const robotCell = grid.worldToCell(transform.x, transform.y);
    const robotCellData = grid.getCell(robotCell.col, robotCell.row);
    const robotLayer = robotCellData?.layer ?? 0;

    const fireball = createFireballEntity({
      scene: this.scene,
      x: transform.x + offset.x,
      y: transform.y + offset.y,
      dirX,
      dirY,
      speed: fireballProps.speed,
      maxDistance,
      grid,
      startLayer: robotLayer
    });

    gameScene.entityManager.add(fireball);
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
