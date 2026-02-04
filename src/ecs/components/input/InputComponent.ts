import Phaser from 'phaser';
import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { TouchJoystickComponent } from './TouchJoystickComponent';
import type { AimJoystickComponent } from './AimJoystickComponent';
import type { ControlModeComponent } from './ControlModeComponent';
import { RemoteInputComponent } from './RemoteInputComponent';
import type { Grid } from '../../../systems/grid/Grid';
import { TransformComponent } from '../core/TransformComponent';
import { GridPositionComponent } from '../movement/GridPositionComponent';

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
    // Check for remote input first (test mode)
    const remoteInput = this.entity.get(RemoteInputComponent);
    if (remoteInput) {
      const aim = remoteInput.getAimInput();
      if (aim.isPressed) {
        return { dx: aim.x, dy: aim.y };
      }
      const walk = remoteInput.getWalkInput();
      return { dx: walk.x, dy: walk.y };
    }

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
    // Check for remote input first (test mode)
    const remoteInput = this.entity.get(RemoteInputComponent);
    if (remoteInput) {
      return remoteInput.getAimInput().isPressed;
    }

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
    // Check for remote input first (test mode)
    const remoteInput = this.entity.get(RemoteInputComponent);
    if (remoteInput) {
      const aimState = remoteInput.getAimPointerState();
      const dx = aimState.currentX - aimState.startX;
      const dy = aimState.currentY - aimState.startY;
      const distance = Math.hypot(dx, dy);
      
      // Manual aim threshold (same as AimJoystickComponent)
      if (distance > 70 && aimState.active) {
        const length = Math.hypot(dx, dy);
        return { dx: dx / length, dy: dy / length };
      }
      return null;
    }

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
    const playerGridPos = this.entity.get(GridPositionComponent);
    if (!playerTransform || !playerGridPos) return null;

    const enemies = this.getEnemies();
    let nearestTargetableEnemy: Entity | null = null;
    let nearestTargetableDistance = Infinity;
    let nearestAnyEnemy: Entity | null = null;
    let nearestAnyDistance = Infinity;

    for (const enemy of enemies) {
      const enemyTransform = enemy.get(TransformComponent);
      const enemyGridPos = enemy.get(GridPositionComponent);
      if (!enemyTransform || !enemyGridPos) continue;

      const dx = enemyTransform.x - playerTransform.x;
      const dy = enemyTransform.y - playerTransform.y;
      const distance = Math.hypot(dx, dy);

      if (distance <= this.bulletMaxDistance) {
        // Track nearest enemy regardless of line of sight
        if (distance < nearestAnyDistance) {
          nearestAnyDistance = distance;
          nearestAnyEnemy = enemy;
        }

        // Track nearest targetable enemy (with line of sight)
        if (distance < nearestTargetableDistance && this.hasLineOfSight(playerTransform.x, playerTransform.y, enemyTransform.x, enemyTransform.y, playerGridPos.currentLayer, enemyGridPos.currentLayer)) {
          nearestTargetableDistance = distance;
          nearestTargetableEnemy = enemy;
        }
      }
    }

    // Priority: targetable enemy > any nearby enemy > null
    const targetEnemy = nearestTargetableEnemy ?? nearestAnyEnemy;
    
    if (targetEnemy) {
      const enemyTransform = targetEnemy.require(TransformComponent);
      const dx = enemyTransform.x - playerTransform.x;
      const dy = enemyTransform.y - playerTransform.y;
      const length = Math.hypot(dx, dy);
      return { dx: dx / length, dy: dy / length };
    }

    return null;
  }

  private hasLineOfSight(x1: number, y1: number, x2: number, y2: number, playerLayer: number, _enemyLayer: number): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.hypot(dx, dy);
    const steps = Math.ceil(distance / (this.grid.cellSize / 2));

    let currentLayer = playerLayer;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x1 + dx * t;
      const y = y1 + dy * t;
      const cell = this.grid.worldToCell(x, y);
      const cellData = this.grid.getCell(cell.col, cell.row);
      
      if (!cellData) return false;

      if (this.grid.isTransition(cellData)) {
        currentLayer = Math.max(currentLayer, this.grid.getLayer(cellData) + 1);
      }

      if (this.grid.getLayer(cellData) > currentLayer && !this.grid.isTransition(cellData)) {
        return false;
      }
    }

    return true;
  }
}
