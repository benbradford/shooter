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
  
  // Track last movement direction for shooting
  public lastMoveX = 0;
  public lastMoveY = 1; // Default to down

  constructor(
    private readonly transformComp: TransformComponent,
    private readonly inputComp: InputComponent
  ) {}

  update(delta: number): void {
    const { dx, dy } = this.inputComp.getInputDelta();
    const { dx: rawDx, dy: rawDy } = this.inputComp.getRawInputDelta();
    
    // Update facing direction from raw input (ignores deadzone)
    if (rawDx !== 0 || rawDy !== 0) {
      const len = Math.sqrt(rawDx * rawDx + rawDy * rawDy);
      this.lastDir = dirFromDelta(rawDx, rawDy);
      this.lastMoveX = rawDx / len;
      this.lastMoveY = rawDy / len;
    }
    
    // Calculate target velocity from deadzone-filtered input
    let targetVelX = 0;
    let targetVelY = 0;
    
    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      targetVelX = (dx / len) * this.speed;
      targetVelY = (dy / len) * this.speed;
    }
    
    // Smoothly interpolate current velocity toward target
    const lerpFactor = Math.min(1, delta / this.accelerationTime);
    this.velocityX += (targetVelX - this.velocityX) * lerpFactor;
    this.velocityY += (targetVelY - this.velocityY) * lerpFactor;
    
    // Snap to zero if no input and moving very slowly (deadzone)
    if (dx === 0 && dy === 0) {
      const velocityMagnitude = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
      if (velocityMagnitude < 50) {
        this.velocityX = 0;
        this.velocityY = 0;
      }
    }
    
    // Apply velocity to position
    this.transformComp.x += this.velocityX * (delta / 1000);
    this.transformComp.y += this.velocityY * (delta / 1000);
  }

  onDestroy(): void {}

  isMoving(): boolean {
    return Math.abs(this.velocityX) > 1 || Math.abs(this.velocityY) > 1;
  }

  getVelocityMagnitude(): number {
    return Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
  }
}
