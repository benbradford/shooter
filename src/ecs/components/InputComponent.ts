import Phaser from 'phaser';
import type { Component } from '../Component';
import type { Entity } from '../Entity';
import type { TouchJoystickComponent } from './TouchJoystickComponent';

export class InputComponent implements Component {
  entity!: Entity;
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly keys: Record<string, Phaser.Input.Keyboard.Key>;
  private readonly fireKey: Phaser.Input.Keyboard.Key;
  private joystick: TouchJoystickComponent | null = null;
  private fireHeldTime: number = 0;

  constructor(scene: Phaser.Scene) {
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.keys = scene.input.keyboard!.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>;
    this.fireKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  setJoystick(joystick: TouchJoystickComponent): void {
    this.joystick = joystick;
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

  hasInput(): boolean {
    const { dx, dy } = this.getRawInputDelta();
    return dx !== 0 || dy !== 0;
  }

  isFirePressed(): boolean {
    // Check joystick fire button first
    if (this.joystick?.isFireButtonPressed()) {
      return true;
    }
    
    // Fall back to keyboard
    return this.fireKey.isDown;
  }

  getFireHeldTime(): number {
    return this.fireHeldTime;
  }
}
