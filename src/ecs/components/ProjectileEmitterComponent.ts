import type { Component } from '../Component';
import type { Entity } from '../Entity';
import { TransformComponent } from './TransformComponent';
import { WalkComponent } from './WalkComponent';
import { Direction } from '../../constants/Direction';
import type { AmmoComponent } from './AmmoComponent';

export interface EmitterOffset {
  x: number;
  y: number;
}

export interface ProjectileEmitterProps {
  scene: Phaser.Scene;
  onFire: (x: number, y: number, dirX: number, dirY: number) => void;
  offsets: Record<Direction, EmitterOffset>;
  shouldFire: () => boolean;
  cooldown: number;
  onShellEject: (x: number, y: number, direction: 'left' | 'right', playerDirection: Direction) => void;
  ammoComponent: AmmoComponent;
}

export class ProjectileEmitterComponent implements Component {
  entity!: Entity;
  private canFire: boolean = true;
  private readonly scene: Phaser.Scene;
  private readonly onFire: (x: number, y: number, dirX: number, dirY: number) => void;
  private readonly offsets: Record<Direction, EmitterOffset>;
  private readonly shouldFire: () => boolean;
  private readonly cooldown: number;
  private readonly onShellEject: (x: number, y: number, direction: 'left' | 'right', playerDirection: Direction) => void;
  private readonly ammoComponent: AmmoComponent;

  constructor(props: ProjectileEmitterProps) {
    this.scene = props.scene;
    this.onFire = props.onFire;
    this.offsets = props.offsets;
    this.shouldFire = props.shouldFire;
    this.cooldown = props.cooldown ?? 200;
    this.onShellEject = props.onShellEject;
    this.ammoComponent = props.ammoComponent;
  }

  update(_delta: number): void {
    if (this.shouldFire() && this.canFire && this.hasAmmo()) {
      this.fire();
      this.canFire = false;
      this.scene.time.delayedCall(this.cooldown, () => {
        this.canFire = true;
      });
    }
  }

  private hasAmmo(): boolean {
    return !this.ammoComponent || this.ammoComponent.canFire();
  }

  private fire(): void {
    const transform = this.entity.get(TransformComponent)!;
    const walk = this.entity.get(WalkComponent)!;
    const direction = walk.lastDir;

    const offset = this.offsets[direction];
    const emitX = transform.x + offset.x;
    const emitY = transform.y + offset.y;

    // Use actual movement direction instead of discrete sprite direction
    const dirX = walk.lastMoveX;
    const dirY = walk.lastMoveY;

    this.onFire(emitX, emitY, dirX, dirY);

    // Consume ammo
    if (this.ammoComponent) {
      this.ammoComponent.consumeAmmo();
    }

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
