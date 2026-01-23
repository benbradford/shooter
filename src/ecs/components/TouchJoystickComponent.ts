import type { Component } from '../Component';
import type { Entity } from '../Entity';

export interface TouchJoystickProps {
  maxRadius?: number;
  innerRadius?: number;
  deadZoneDistance?: number;
}

export class TouchJoystickComponent implements Component {
  entity!: Entity;
  private isActive: boolean = false;
  private startX: number = 0;
  private startY: number = 0;
  private currentX: number = 0;
  private currentY: number = 0;
  public readonly maxRadius: number;
  public readonly innerRadius: number;
  private readonly deadZoneDistance: number;
  private pointerId: number = -1;

  // Fire button state
  private isFirePressed: boolean = false;
  private firePointerId: number = -1;
  private crosshairBounds: { x: number; y: number; radius: number } | null = null;

  constructor(private readonly scene: Phaser.Scene, props: TouchJoystickProps = {}) {
    this.maxRadius = props.maxRadius ?? 150;
    this.innerRadius = props.innerRadius ?? 80;
    this.deadZoneDistance = props.deadZoneDistance ?? 30;
  }

  setCrosshairBounds(x: number, y: number, radius: number): void {
    this.crosshairBounds = { x, y, radius };
  }

  init(): void {
    // Listen for pointer down in lower-left quadrant (movement)
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Use display size (screen pixels) - pointer.x/y are in screen pixels when using UI camera
      const displayWidth = this.scene.scale.displaySize.width;
      const displayHeight = this.scene.scale.displaySize.height;
      
      const screenWidth = displayWidth;
      const screenHeight = displayHeight;

      // Check if in lower-left area (movement) - expanded area
      if (pointer.x < screenWidth * 0.6 && pointer.y > screenHeight * 0.3 && this.pointerId === -1) {
        this.isActive = true;
        this.startX = pointer.x;
        this.startY = pointer.y;
        this.currentX = pointer.x;
        this.currentY = pointer.y;
        this.pointerId = pointer.id;
      }

      // Check if touching crosshair (fire)
      if (this.crosshairBounds && this.firePointerId === -1) {
        const dx = pointer.x - this.crosshairBounds.x;
        const dy = pointer.y - this.crosshairBounds.y;
        const distance = Math.hypot(dx, dy);

        if (distance <= this.crosshairBounds.radius) {
          this.isFirePressed = true;
          this.firePointerId = pointer.id;
        }
      }
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isActive && pointer.id === this.pointerId) {
        // Use pointer.x/y directly (screen pixels)
        const dx = pointer.x - this.startX;
        const dy = pointer.y - this.startY;
        const distance = Math.hypot(dx, dy);

        if (distance > this.maxRadius) {
          // Clamp to circle boundary
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
      if (pointer.id === this.pointerId) {
        this.isActive = false;
        this.pointerId = -1;
      }

      if (pointer.id === this.firePointerId) {
        this.isFirePressed = false;
        this.firePointerId = -1;
      }
    });
  }

  update(_delta: number): void {
    // Component just tracks state, visuals component reads it
  }

  getInputDelta(): { dx: number; dy: number } {
    if (!this.isActive) {
      return { dx: 0, dy: 0 };
    }

    const dx = this.currentX - this.startX;
    const dy = this.currentY - this.startY;
    const distance = Math.hypot(dx, dy);

    if (distance < this.deadZoneDistance) {
      return { dx: 0, dy: 0 };
    }

    // Normalize to -1 to 1 range
    return {
      dx: dx / this.maxRadius,
      dy: dy / this.maxRadius,
    };
  }

  getRawInputDelta(): { dx: number; dy: number } {
    if (!this.isActive) {
      return { dx: 0, dy: 0 };
    }

    const dx = this.currentX - this.startX;
    const dy = this.currentY - this.startY;

    // Return raw direction without deadzone check
    return {
      dx: dx / this.maxRadius,
      dy: dy / this.maxRadius,
    };
  }

  isFireButtonPressed(): boolean {
    return this.isFirePressed;
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
