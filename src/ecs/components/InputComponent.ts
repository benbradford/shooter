import Phaser from 'phaser';
import type { Component } from '../Component';
import type { Entity } from '../Entity';
import type { TouchJoystickComponent } from './TouchJoystickComponent';
import type { AimJoystickComponent } from './AimJoystickComponent';
import type { ControlModeComponent } from './ControlModeComponent';

export class InputComponent implements Component {
  entity!: Entity;
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly keys: Record<string, Phaser.Input.Keyboard.Key>;
  private readonly fireKey: Phaser.Input.Keyboard.Key;
  private joystick: TouchJoystickComponent | null = null;
  private aimJoystick: AimJoystickComponent | null = null;
  private controlMode: ControlModeComponent | null = null;
  private fireHeldTime: number = 0;

  constructor(scene: Phaser.Scene) {
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.keys = scene.input.keyboard!.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>;
    this.fireKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  setJoystick(joystick: TouchJoystickComponent): void {
    this.joystick = joystick;
  }

  setAimJoystick(aimJoystick: AimJoystickComponent): void {
    this.aimJoystick = aimJoystick;
  }

  setControlMode(controlMode: ControlModeComponent): void {
    this.controlMode = controlMode;
  }

  update(delta: number): void {
    // Track how long fire has been held
    if (this.isFirePressed()) {
      this.fireHeldTime += delta;
    } else {
      this.fireHeldTime = 0;
    }
  }

  onDestroy(): void {}

  /** Get input with deadzone applied (for movement) */
  getInputDelta(): { dx: number; dy: number } {
    // Prioritize joystick input over keyboard
    if (this.joystick) {
      const joystickDelta = this.joystick.getInputDelta();
      if (joystickDelta.dx !== 0 || joystickDelta.dy !== 0) {
        return joystickDelta;
      }
    }

    // Fall back to keyboard
    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown || this.keys.A.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.keys.D.isDown) dx += 1;
    if (this.cursors.up.isDown || this.keys.W.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.keys.S.isDown) dy += 1;
    return { dx, dy };
  }

  /** Get raw input without deadzone (for facing direction) */
  getRawInputDelta(): { dx: number; dy: number } {
    // Get raw input without deadzone (for facing direction)
    if (this.joystick) {
      const joystickDelta = this.joystick.getRawInputDelta();
      if (joystickDelta.dx !== 0 || joystickDelta.dy !== 0) {
        return joystickDelta;
      }
    }

    // Keyboard has no deadzone
    return this.getInputDelta();
  }

  /** Get aim direction (mode 2 only) */
  getAimDelta(): { dx: number; dy: number } {
    if (this.aimJoystick && this.controlMode?.getMode() === 2) {
      return this.aimJoystick.getAimDelta();
    }
    return { dx: 0, dy: 0 };
  }

  /** Check if actively aiming (mode 2 only) */
  isAiming(): boolean {
    if (this.aimJoystick && this.controlMode?.getMode() === 2) {
      return this.aimJoystick.isAiming();
    }
    return false;
  }

  hasInput(): boolean {
    const { dx, dy } = this.getRawInputDelta();
    return dx !== 0 || dy !== 0;
  }

  isFirePressed(): boolean {
    const mode = this.controlMode?.getMode() ?? 1;

    if (mode === 1) {
      // Mode 1: Crosshair button or keyboard
      if (this.joystick?.isFireButtonPressed()) {
        return true;
      }
      return this.fireKey.isDown;
    }
    
    // Mode 2: Aim joystick or keyboard
    if (this.aimJoystick?.isAiming()) {
      return true;
    }
    return this.fireKey.isDown;
  }

  getFireHeldTime(): number {
    return this.fireHeldTime;
  }
}
