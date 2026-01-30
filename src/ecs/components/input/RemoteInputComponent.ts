import type { Component } from '../../Component';
import type { Entity } from '../../Entity';

export class RemoteInputComponent implements Component {
  entity!: Entity;
  private moveX: number = 0;
  private moveY: number = 0;
  private movePressed: boolean = false;
  private movePointerX: number = 0;
  private movePointerY: number = 0;
  private aimX: number = 0;
  private aimY: number = 1;
  private aimPressed: boolean = false;
  private aimPointerX: number = 0;
  private aimPointerY: number = 0;

  setWalk(x: number, y: number, isPressed: boolean): void {
    this.moveX = x;
    this.moveY = y;
    this.movePressed = isPressed;
    
    // Simulate pointer position (center of screen + offset based on direction)
    if (isPressed) {
      const screenWidth = 1280;
      const screenHeight = 720;
      this.movePointerX = screenWidth * 0.15 + x * 50;
      this.movePointerY = screenHeight * 0.65 + y * 50;
    }
  }

  setAim(x: number, y: number, isPressed: boolean): void {
    this.aimX = x;
    this.aimY = y;
    this.aimPressed = isPressed;
    
    // Simulate pointer position
    if (isPressed) {
      const screenWidth = 1280;
      const screenHeight = 720;
      this.aimPointerX = screenWidth * 0.65 + x * 50;
      this.aimPointerY = screenHeight * 0.5 + y * 50;
    }
  }

  getWalkInput(): { x: number; y: number; isPressed: boolean } {
    return { x: this.moveX, y: this.moveY, isPressed: this.movePressed };
  }

  getAimInput(): { x: number; y: number; isPressed: boolean } {
    return { x: this.aimX, y: this.aimY, isPressed: this.aimPressed };
  }

  getWalkPointerState(): { startX: number; startY: number; currentX: number; currentY: number; active: boolean } {
    const screenWidth = 1280;
    const screenHeight = 720;
    const baseX = screenWidth * 0.15;
    const baseY = screenHeight * 0.65;
    
    return {
      startX: baseX,
      startY: baseY,
      currentX: this.movePressed ? this.movePointerX : baseX,
      currentY: this.movePressed ? this.movePointerY : baseY,
      active: this.movePressed
    };
  }

  getAimPointerState(): { startX: number; startY: number; currentX: number; currentY: number; active: boolean } {
    const screenWidth = 1280;
    const screenHeight = 720;
    const baseX = screenWidth * 0.65;
    const baseY = screenHeight * 0.5;
    
    return {
      startX: baseX,
      startY: baseY,
      currentX: this.aimPressed ? this.aimPointerX : baseX,
      currentY: this.aimPressed ? this.aimPointerY : baseY,
      active: this.aimPressed
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  update(_delta: number): void {}
}
