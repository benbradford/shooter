import Phaser from 'phaser';
import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { TouchJoystickComponent } from './TouchJoystickComponent';
import type { AimJoystickComponent } from './AimJoystickComponent';
import type { ControlModeComponent } from './ControlModeComponent';
import type { Grid } from '../../../utils/Grid';
import { TransformComponent } from '../core/TransformComponent';

export class InputComponent implements Component {
  entity!: Entity;
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
  private readonly keys: Record<string, Phaser.Input.Keyboard.Key> | undefined;
  private readonly fireKey: Phaser.Input.Keyboard.Key | undefined;
  private joystick: TouchJoystickComponent | null = null;
  private aimJoystick: AimJoystickComponent | null = null;
  private controlMode: ControlModeComponent | null = null;
  private fireHeldTime: number = 0;
  private readonly grid: Grid;
  private readonly getEnemies: () => Entity[];
  private readonly bulletMaxDistance: number;

  constructor(scene: Phaser.Scene, grid: Grid, getEnemies: () => Entity[], bulletMaxDistance: number) {
    const keyboard = scene.input.keyboard;
    if (keyboard) {
      this.cursors = keyboard.createCursorKeys();
      this.keys = keyboard.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>;
      this.fireKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }
    this.grid = grid;
    this.getEnemies = getEnemies;
    this.bulletMaxDistance = bulletMaxDistance;
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
    // Get raw input without deadzone (for facing direction)
    if (this.joystick) {
      const joystickDelta = this.joystick.getRawInputDelta();
      if (joystickDelta.dx !== 0 || joystickDelta.dy !== 0) {
        return joystickDelta;
      }
    }

    // Keyboard has no deadzone
    if (!this.cursors || !this.keys) {
      return { dx: 0, dy: 0 };
    }
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
      // Mode 1: Aim joystick or crosshair button or keyboard
      if (this.aimJoystick?.isAiming()) {
        return true;
      }
      if (this.joystick?.isFireButtonPressed()) {
        return true;
      }
      return this.fireKey?.isDown ?? false;
    }
    
    // Mode 2: Aim joystick or keyboard
    if (this.aimJoystick?.isAiming()) {
      return true;
    }
    return this.fireKey?.isDown ?? false;
  }

  getFireHeldTime(): number {
    return this.fireHeldTime;
  }

  getManualAimDirection(): { dx: number; dy: number } | null {
    if (!this.aimJoystick?.isInManualAimMode()) {
      return null;
    }
    const aimDelta = this.aimJoystick.getAimDelta();
    if (aimDelta.dx === 0 && aimDelta.dy === 0) {
      return null;
    }
    const length = Math.hypot(aimDelta.dx, aimDelta.dy);
    return { dx: aimDelta.dx / length, dy: aimDelta.dy / length };
  }

  /** Get auto-aim direction to nearest visible enemy (mode 1 only) */
  getAutoAimDirection(): { dx: number; dy: number } | null {
    const mode = this.controlMode?.getMode() ?? 1;
    if (mode !== 1) return null;

    const playerTransform = this.entity.get(TransformComponent);
    if (!playerTransform) return null;

    const enemies = this.getEnemies();
    let nearestEnemy: Entity | null = null;
    let nearestDistance = Infinity;

    for (const enemy of enemies) {
      const enemyTransform = enemy.get(TransformComponent);
      if (!enemyTransform) continue;

      const dx = enemyTransform.x - playerTransform.x;
      const dy = enemyTransform.y - playerTransform.y;
      const distance = Math.hypot(dx, dy);

      if (distance <= this.bulletMaxDistance && distance < nearestDistance && this.hasLineOfSight(playerTransform.x, playerTransform.y, enemyTransform.x, enemyTransform.y)) {
        nearestDistance = distance;
        nearestEnemy = enemy;
      }
    }

    if (nearestEnemy) {
      const enemyTransform = nearestEnemy.require(TransformComponent);
      const dx = enemyTransform.x - playerTransform.x;
      const dy = enemyTransform.y - playerTransform.y;
      const length = Math.hypot(dx, dy);
      return { dx: dx / length, dy: dy / length };
    }

    return null;
  }

  private hasLineOfSight(x1: number, y1: number, x2: number, y2: number): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.hypot(dx, dy);
    const steps = Math.ceil(distance / (this.grid.cellSize / 2));

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x1 + dx * t;
      const y = y1 + dy * t;
      const cell = this.grid.worldToCell(x, y);
      const cellData = this.grid.getCell(cell.col, cell.row);
      if (cellData?.layer === 1) {
        return false;
      }
    }

    return true;
  }
}
