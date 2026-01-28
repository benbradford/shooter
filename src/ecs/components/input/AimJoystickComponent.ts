import type { Component } from '../../Component';
import type { Entity } from '../../Entity';

export type AimJoystickProps = {
  maxRadius: number;
  innerRadius: number;
  manualAimThreshold: number;
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
  private readonly manualAimThreshold: number;
  private pointerId: number = -1;
  private isManualAim: boolean = false;

  constructor(private readonly scene: Phaser.Scene, props: AimJoystickProps) {
    this.maxRadius = props.maxRadius;
    this.innerRadius = props.innerRadius;
    this.manualAimThreshold = props.manualAimThreshold;
  }

  init(): void {
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const screenWidth = this.scene.cameras.main.width;
      const screenHeight = this.scene.cameras.main.height;

      // Mode 1: Activate anywhere on right half
      // Mode 2: Activate only in lower-right quadrant
      const isRightHalf = pointer.x > screenWidth / 2;
      const isLowerRight = pointer.x > screenWidth / 2 && pointer.y > screenHeight / 2;
      
      if ((isRightHalf || isLowerRight) && this.pointerId === -1) {
        this.isActive = true;
        this.isManualAim = false;
        this.startX = pointer.x;
        this.startY = pointer.y;
        this.currentX = pointer.x;
        this.currentY = pointer.y;
        this.pointerId = pointer.id;
      }
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isActive && pointer.id === this.pointerId) {
        const dx = pointer.x - this.startX;
        const dy = pointer.y - this.startY;
        const distance = Math.hypot(dx, dy);

        // Enter manual aim when dragged beyond threshold
        if (distance > this.manualAimThreshold) {
          this.isManualAim = true;
        }
        
        // Resume auto-aim when dragged back within threshold
        if (distance <= this.manualAimThreshold) {
          this.isManualAim = false;
        }

        // Clamp to keep inner circle within outer circle
        const maxDistance = this.maxRadius - this.innerRadius;
        if (distance > maxDistance) {
          const angle = Math.atan2(dy, dx);
          this.currentX = this.startX + Math.cos(angle) * maxDistance;
          this.currentY = this.startY + Math.sin(angle) * maxDistance;
        } else {
          this.currentX = pointer.x;
          this.currentY = pointer.y;
        }
      }
    });

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.pointerId) {
        this.isActive = false;
        this.isManualAim = false;
        this.pointerId = -1;
      }
    });
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

  isInManualAimMode(): boolean {
    return this.isManualAim;
  }

  getJoystickState(): { active: boolean; startX: number; startY: number; currentX: number; currentY: number; isManualAim: boolean } {
    return {
      active: this.isActive,
      startX: this.startX,
      startY: this.startY,
      currentX: this.isManualAim ? this.currentX : this.startX,
      currentY: this.isManualAim ? this.currentY : this.startY,
      isManualAim: this.isManualAim,
    };
  }

  onDestroy(): void {
    this.scene.input.off('pointerdown');
    this.scene.input.off('pointermove');
    this.scene.input.off('pointerup');
  }
}
