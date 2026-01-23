import type { Component } from '../Component';
import type { Entity } from '../Entity';

export interface AimJoystickProps {
  maxRadius?: number;
  innerRadius?: number;
}

export class AimJoystickComponent implements Component {
  entity!: Entity;
  private isActive: boolean = false;
  private startX: number = 0;
  private startY: number = 0;
  private currentX: number = 0;
  private currentY: number = 0;
  public readonly maxRadius: number;
  public readonly innerRadius: number;
  private pointer: Phaser.Input.Pointer | null = null;

  constructor(private readonly scene: Phaser.Scene, props: AimJoystickProps = {}) {
    this.maxRadius = props.maxRadius ?? 100;
    this.innerRadius = props.innerRadius ?? 60;
  }

  init(): void {
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const screenWidth = this.scene.cameras.main.width;
      const screenHeight = this.scene.cameras.main.height;

      // Check if in lower-right quadrant (aiming)
      if (pointer.x > screenWidth / 2 && pointer.y > screenHeight / 2) {
        this.isActive = true;
        this.startX = pointer.x;
        this.startY = pointer.y;
        this.currentX = pointer.x;
        this.currentY = pointer.y;
        this.pointer = pointer;
      }
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isActive && pointer === this.pointer) {
        const dx = pointer.x - this.startX;
        const dy = pointer.y - this.startY;
        const distance = Math.hypot(dx, dy);

        if (distance > this.maxRadius) {
          const angle = Math.atan2(dy, dx);
          this.currentX = this.startX + Math.cos(angle) * this.maxRadius;
          this.currentY = this.startY + Math.sin(angle) * this.maxRadius;
        } else {
          this.currentX = pointer.x;
          this.currentY = pointer.y;
        }
      }
    });

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer === this.pointer) {
        this.isActive = false;
        this.pointer = null;
      }
    });
  }

  update(_delta: number): void {
    // No update logic needed - state is read by visuals component
  }

  getAimDelta(): { dx: number; dy: number } {
    if (!this.isActive) {
      return { dx: 0, dy: 0 };
    }

    const dx = this.currentX - this.startX;
    const dy = this.currentY - this.startY;

    return {
      dx: dx / this.maxRadius,
      dy: dy / this.maxRadius,
    };
  }

  isAiming(): boolean {
    return this.isActive;
  }

  getJoystickState(): { active: boolean; startX: number; startY: number; currentX: number; currentY: number } {
    return {
      active: this.isActive,
      startX: this.startX,
      startY: this.startY,
      currentX: this.currentX,
      currentY: this.currentY,
    };
  }

  onDestroy(): void {
    this.scene.input.off('pointerdown');
    this.scene.input.off('pointermove');
    this.scene.input.off('pointerup');
  }
}
