import Phaser from 'phaser';
import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { TouchJoystickComponent } from './TouchJoystickComponent';
import type { AttackButtonComponent } from './AttackButtonComponent';
import type { ControlModeComponent } from './ControlModeComponent';
import { RemoteInputComponent } from './RemoteInputComponent';

export class InputComponent implements Component {
  entity!: Entity;
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
  private readonly keys: Record<string, Phaser.Input.Keyboard.Key> | undefined;
  private readonly slideKey: Phaser.Input.Keyboard.Key | undefined;
  private joystick: TouchJoystickComponent | null = null;
  private attackButton: AttackButtonComponent | null = null;

  constructor(scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;
    if (keyboard) {
      this.cursors = keyboard.createCursorKeys();
      this.keys = keyboard.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>;
      this.slideKey = keyboard.addKey('H');
    }
  }

  setJoystick(joystick: TouchJoystickComponent): void {
    this.joystick = joystick;
  }

  setAttackButton(attackButton: AttackButtonComponent): void {
    this.attackButton = attackButton;
  }

  setControlMode(_controlMode: ControlModeComponent): void {
    // No-op for now
  }

  update(): void {
    // No-op for now
  }


  /** Get input with deadzone applied (for movement) */
  getInputDelta(): { dx: number; dy: number } {
    // Check for remote input first (test mode)
    const remoteInput = this.entity.get(RemoteInputComponent);
    if (remoteInput) {
      const walk = remoteInput.getWalkInput();
      return { dx: walk.x, dy: walk.y };
    }

    // Prioritize joystick input over keyboard
    if (this.joystick) {
      const joystickDelta = this.joystick.getInputDelta();
      if (joystickDelta.dx !== 0 || joystickDelta.dy !== 0) {
        return joystickDelta;
      }
    }

    // Fall back to keyboard
    if (!this.cursors || !this.keys) {
      return { dx: 0, dy: 0 };
    }

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
    const remoteInput = this.entity.get(RemoteInputComponent);
    if (remoteInput) {
      const aim = remoteInput.getAimInput();
      if (aim.isPressed) {
        return { dx: aim.x, dy: aim.y };
      }
      const walk = remoteInput.getWalkInput();
      return { dx: walk.x, dy: walk.y };
    }

    if (this.joystick) {
      const joystickDelta = this.joystick.getRawInputDelta();
      if (joystickDelta.dx !== 0 || joystickDelta.dy !== 0) {
        return joystickDelta;
      }
    }

    if (!this.cursors || !this.keys) {
      return { dx: 0, dy: 0 };
    }
    return this.getInputDelta();
  }

  hasInput(): boolean {
    const { dx, dy } = this.getRawInputDelta();
    return dx !== 0 || dy !== 0;
  }

  isAttackPressed(): boolean {
    const remoteInput = this.entity.get(RemoteInputComponent);
    if (remoteInput) {
      return remoteInput.getAimInput().isPressed;
    }

    if (this.attackButton?.isAttackPressed()) {
      return true;
    }
    
    return false;
  }

  isSlidePressed(): boolean {
    return this.slideKey?.isDown ?? false;
  }

  onDestroy(): void {
    // No cleanup needed
  }
}
