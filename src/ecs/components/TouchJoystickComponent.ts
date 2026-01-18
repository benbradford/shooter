import type { Component } from '../Component';
import type { Entity } from '../Entity';

export class TouchJoystickComponent implements Component {
  entity!: Entity;
  private isActive: boolean = false;
  private startX: number = 0;
  private startY: number = 0;
  private currentX: number = 0;
  private currentY: number = 0;
  private readonly maxRadius: number = 70; // Outer circle radius
  private pointer: Phaser.Input.Pointer | null = null;
  
  // Fire button state
  private isFirePressed: boolean = false;
  private crosshairBounds: { x: number; y: number; radius: number } | null = null;

  constructor(private readonly scene: Phaser.Scene) {}

  setCrosshairBounds(x: number, y: number, radius: number): void {
    this.crosshairBounds = { x, y, radius };
  }

  init(): void {
    // Listen for pointer down in lower-left quadrant (movement)
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const screenWidth = this.scene.cameras.main.width;
      const screenHeight = this.scene.cameras.main.height;
      
      // Check if in lower-left quadrant (movement)
      if (pointer.x < screenWidth / 2 && pointer.y > screenHeight / 2) {
        this.isActive = true;
        this.startX = pointer.x;
        this.startY = pointer.y;
        this.currentX = pointer.x;
        this.currentY = pointer.y;
        this.pointer = pointer;
      }
      
      // Check if touching crosshair (fire)
      if (this.crosshairBounds) {
        const dx = pointer.x - this.crosshairBounds.x;
        const dy = pointer.y - this.crosshairBounds.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= this.crosshairBounds.radius) {
          this.isFirePressed = true;
        }
      }
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isActive && pointer === this.pointer) {
        // Calculate position relative to start, clamped to max radius
        const dx = pointer.x - this.startX;
        const dy = pointer.y - this.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
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
      if (pointer === this.pointer) {
        this.isActive = false;
        this.pointer = null;
      }
      
      // Release fire button
      this.isFirePressed = false;
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
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 20) {
      // Dead zone
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
