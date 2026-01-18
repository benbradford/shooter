import type { Component } from '../Component';
import type { Entity } from '../Entity';
import { TransformComponent } from './TransformComponent';
import { WalkComponent } from './WalkComponent';
import { Direction } from '../../constants/Direction';

export interface EmitterOffset {
  x: number;
  y: number;
}

export class ProjectileEmitterComponent implements Component {
  entity!: Entity;
  private canFire: boolean = true;
  
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onFire: (x: number, y: number, dirX: number, dirY: number) => void,
    private readonly offsets: Record<Direction, EmitterOffset>,
    private readonly shouldFire: () => boolean,
    private readonly cooldown: number = 200,
    private readonly onShellEject?: (x: number, y: number, direction: 'left' | 'right', playerDirection: Direction) => void
  ) {}

  update(_delta: number): void {
    if (this.shouldFire() && this.canFire) {
      this.fire();
      this.canFire = false;
      this.scene.time.delayedCall(this.cooldown, () => {
        this.canFire = true;
      });
    }
  }

  private fire(): void {
    const transform = this.entity.get(TransformComponent)!;
    const walk = this.entity.get(WalkComponent)!;
    const direction = walk.lastDir;
    
    const offset = this.offsets[direction];
    const emitX = transform.x + offset.x;
    const emitY = transform.y + offset.y;
    
    // Direction vector
    const dirMap: Record<Direction, { x: number; y: number }> = {
      [Direction.Down]: { x: 0, y: 1 },
      [Direction.Up]: { x: 0, y: -1 },
      [Direction.Left]: { x: -1, y: 0 },
      [Direction.Right]: { x: 1, y: 0 },
      [Direction.UpLeft]: { x: -0.707, y: -0.707 },
      [Direction.UpRight]: { x: 0.707, y: -0.707 },
      [Direction.DownLeft]: { x: -0.707, y: 0.707 },
      [Direction.DownRight]: { x: 0.707, y: 0.707 },
      [Direction.None]: { x: 0, y: 1 },
    };
    
    const dir = dirMap[direction];
    this.onFire(emitX, emitY, dir.x, dir.y);
    
    // Eject shell casing
    if (this.onShellEject) {
      const shellDir = [Direction.Left, Direction.UpLeft, Direction.DownLeft].includes(direction)
        ? 'left'
        : 'right';
      this.onShellEject(transform.x, transform.y, shellDir, direction);
    }
  }

  getEmitterPosition(): { x: number; y: number } {
    const transform = this.entity.get(TransformComponent)!;
    const walk = this.entity.get(WalkComponent)!;
    const offset = this.offsets[walk.lastDir];
    return {
      x: transform.x + offset.x,
      y: transform.y + offset.y,
    };
  }

  onDestroy(): void {}
}
