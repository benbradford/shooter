import type { Component } from '../Component';
import type { Entity } from '../Entity';
import type { TransformComponent } from './TransformComponent';
import type { InputComponent } from './InputComponent';
import { Direction, dirFromDelta } from '../../constants/Direction';

export class WalkComponent implements Component {
  entity!: Entity;
  public speed = 300;
  public lastDir: Direction = Direction.Down;
  
  private velocityX = 0;
  private velocityY = 0;
  private readonly accelerationTime = 300; // ms to reach full speed
  private readonly stopThreshold = 50; // velocity below this snaps to zero
  
  // Normalized direction vector for shooting
  public lastMoveX = 0;
  public lastMoveY = 1; // Default to down

  constructor(
    private readonly transformComp: TransformComponent,
    private readonly inputComp: InputComponent
  ) {}

  update(delta: number): void {
    const movementInput = this.inputComp.getInputDelta();
    const facingInput = this.inputComp.getRawInputDelta();
    
    // Update facing direction from raw input (ignores joystick deadzone)
    if (facingInput.dx !== 0 || facingInput.dy !== 0) {
      this.updateFacingDirection(facingInput.dx, facingInput.dy);
    }
    
    // Calculate target velocity from deadzone-filtered input
    const targetVelocity = this.calculateTargetVelocity(movementInput.dx, movementInput.dy);
    
    // Apply momentum (smooth acceleration/deceleration)
    this.applyMomentum(targetVelocity, delta);
    
    // Snap to zero if no input and moving very slowly
    if (movementInput.dx === 0 && movementInput.dy === 0) {
      this.applyStopThreshold();
    }
    
    // Apply velocity to position
    this.transformComp.x += this.velocityX * (delta / 1000);
    this.transformComp.y += this.velocityY * (delta / 1000);
  }

  private updateFacingDirection(dx: number, dy: number): void {
    const len = Math.sqrt(dx * dx + dy * dy);
    this.lastDir = dirFromDelta(dx, dy);
    this.lastMoveX = dx / len;
    this.lastMoveY = dy / len;
  }

  private calculateTargetVelocity(dx: number, dy: number): { x: number; y: number } {
    if (dx === 0 && dy === 0) {
      return { x: 0, y: 0 };
    }
    
    const len = Math.sqrt(dx * dx + dy * dy);
    return {
      x: (dx / len) * this.speed,
      y: (dy / len) * this.speed,
    };
  }

  private applyMomentum(target: { x: number; y: number }, delta: number): void {
    const lerpFactor = Math.min(1, delta / this.accelerationTime);
    this.velocityX += (target.x - this.velocityX) * lerpFactor;
    this.velocityY += (target.y - this.velocityY) * lerpFactor;
  }

  private applyStopThreshold(): void {
    const magnitude = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
    if (magnitude < this.stopThreshold) {
      this.velocityX = 0;
      this.velocityY = 0;
    }
  }

  onDestroy(): void {}

  isMoving(): boolean {
    return Math.abs(this.velocityX) > 1 || Math.abs(this.velocityY) > 1;
  }

  getVelocityMagnitude(): number {
    return Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
  }
}
