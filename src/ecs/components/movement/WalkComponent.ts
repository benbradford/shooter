import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { TransformComponent } from '../core/TransformComponent';
import type { InputComponent } from '../input/InputComponent';
import type { ControlModeComponent } from '../input/ControlModeComponent';
import { Direction, dirFromDelta } from '../../../constants/Direction';

export type WalkProps = {
  speed: number;
  accelerationTime: number;
  decelerationTime: number;
  stopThreshold: number;
}

export class WalkComponent implements Component {
  entity!: Entity;
  public readonly speed: number;
  public lastDir: Direction = Direction.Down;

  private velocityX = 0;
  private velocityY = 0;
  private readonly accelerationTime: number;
  private readonly decelerationTime: number;
  private readonly stopThreshold: number;
  private controlMode: ControlModeComponent | null = null;
  private wasAiming: boolean = false;

  // Normalized direction vector for shooting
  public lastMoveX = 0;
  public lastMoveY = 1; // Default to down

  constructor(
    private readonly transformComp: TransformComponent,
    private readonly inputComp: InputComponent,
    props: WalkProps
  ) {
    this.speed = props.speed;
    this.accelerationTime = props.accelerationTime;
    this.decelerationTime = props.decelerationTime;
    this.stopThreshold = props.stopThreshold;
  }

  setControlMode(controlMode: ControlModeComponent): void {
    this.controlMode = controlMode;
  }

  update(delta: number): void {
    const mode = this.controlMode?.getMode() ?? 1;
    const movementInput = this.inputComp.getInputDelta();
    const facingInput = this.inputComp.getRawInputDelta();

    if (mode === 1) {
      this.updateMode1(facingInput);
    } else {
      this.updateMode2(facingInput);
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

  private updateMode1(facingInput: { dx: number; dy: number }): void {
    // Mode 1: Manual aim > Auto-aim > Movement direction
    const manualAim = this.inputComp.getManualAimDirection();
    const autoAim = this.inputComp.getAutoAimDirection();
    const isFiring = this.inputComp.isFirePressed();

    // Track when firing stops to start cooldown
    if (this.wasAiming && !isFiring && this.controlMode) {
      this.controlMode.startAimStopCooldown();
    }
    this.wasAiming = isFiring;

    if (isFiring && manualAim) {
      // Manual aim overrides everything
      this.updateFacingDirection(manualAim.dx, manualAim.dy);
    } else if (isFiring && autoAim) {
      // Auto-aim overrides facing direction
      this.updateFacingDirection(autoAim.dx, autoAim.dy);
    } else if (isFiring && !autoAim && (facingInput.dx !== 0 || facingInput.dy !== 0)) {
      // Firing but no auto-aim target - face movement direction
      this.updateFacingDirection(facingInput.dx, facingInput.dy);
    } else if (!isFiring && this.controlMode && !this.controlMode.isInAimStopCooldown() && (facingInput.dx !== 0 || facingInput.dy !== 0)) {
      // Not firing and cooldown expired - face movement direction
      this.updateFacingDirection(facingInput.dx, facingInput.dy);
    }
    // During cooldown or no input, keep current facing direction
  }

  private updateMode2(facingInput: { dx: number; dy: number }): void {
    // Mode 2: Aiming overrides facing, movement continues
    const aimDelta = this.inputComp.getAimDelta();
    const isAiming = this.inputComp.isAiming();

    // Track when aiming stops to start cooldown
    if (this.wasAiming && !isAiming && this.controlMode) {
      this.controlMode.startAimStopCooldown();
    }
    this.wasAiming = isAiming;

    if (isAiming && (aimDelta.dx !== 0 || aimDelta.dy !== 0)) {
      // Aiming overrides facing direction
      this.updateFacingDirection(aimDelta.dx, aimDelta.dy);
    } else if (!isAiming && this.controlMode && !this.controlMode.isInAimStopCooldown() && (facingInput.dx !== 0 || facingInput.dy !== 0)) {
      // Not aiming and cooldown expired - face movement direction
      this.updateFacingDirection(facingInput.dx, facingInput.dy);
    }
    // During cooldown or no input, keep current facing direction
  }

  isMovementStopped(): boolean {
    return false; // Never stop movement when firing
  }

  // Called by GridCollisionComponent when movement is blocked
  resetVelocity(resetX: boolean, resetY: boolean): void {
    if (resetX) this.velocityX = 0;
    if (resetY) this.velocityY = 0;
  }

  updateFacingDirection(dx: number, dy: number): void {
    const len = Math.hypot(dx, dy);
    this.lastDir = dirFromDelta(dx, dy);
    this.lastMoveX = dx / len;
    this.lastMoveY = dy / len;
  }

  private calculateTargetVelocity(dx: number, dy: number): { x: number; y: number } {
    if (dx === 0 && dy === 0) {
      return { x: 0, y: 0 };
    }

    const len = Math.hypot(dx, dy);
    return {
      x: (dx / len) * this.speed,
      y: (dy / len) * this.speed,
    };
  }

  private applyMomentum(target: { x: number; y: number }, delta: number): void {
    const isDecelerating = target.x === 0 && target.y === 0;
    const timeToUse = isDecelerating ? this.decelerationTime : this.accelerationTime;
    const lerpFactor = Math.min(1, delta / timeToUse);
    this.velocityX += (target.x - this.velocityX) * lerpFactor;
    this.velocityY += (target.y - this.velocityY) * lerpFactor;
  }

  private applyStopThreshold(): void {
    const magnitude = Math.hypot(this.velocityX, this.velocityY);
    if (magnitude < this.stopThreshold) {
      this.velocityX = 0;
      this.velocityY = 0;
    }
  }


  isMoving(): boolean {
    return Math.abs(this.velocityX) > 1 || Math.abs(this.velocityY) > 1;
  }

  getVelocityMagnitude(): number {
    return Math.hypot(this.velocityX, this.velocityY);
  }
}
