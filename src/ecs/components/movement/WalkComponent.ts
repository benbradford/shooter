import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { TransformComponent } from '../core/TransformComponent';
import type { InputComponent } from '../input/InputComponent';
import type { ControlModeComponent } from '../input/ControlModeComponent';
import type { LevelData } from '../../../systems/level/LevelLoader';
import { GridPositionComponent } from './GridPositionComponent';
import { GridCollisionComponent } from './GridCollisionComponent';
import { HealthComponent } from '../core/HealthComponent';
import { AttackComboComponent } from '../combat/AttackComboComponent';
import { SlideAbilityComponent } from '../abilities/SlideAbilityComponent';
import { WaterEffectComponent } from '../visual/WaterEffectComponent';
import { Direction, dirFromDelta } from '../../../constants/Direction';

export type WalkProps = {
  speed: number;
  accelerationTime: number;
  decelerationTime: number;
  stopThreshold: number;
  levelData?: () => LevelData;
}

export class WalkComponent implements Component {
  entity!: Entity;
  public readonly speed: number;
  public lastDir: Direction = Direction.Down;
  private readonly getLevelData?: () => LevelData;

  private velocityX = 0;
  private velocityY = 0;
  private enabled = true;
  
  getVelocityX(): number {
    return this.velocityX;
  }
  
  getVelocityY(): number {
    return this.velocityY;
  }
  
  private readonly accelerationTime: number;
  private readonly decelerationTime: number;
  private readonly stopThreshold: number;
  private controlMode: ControlModeComponent | null = null;

  public lastMoveX = 0;
  public lastMoveY = 1;

  constructor(
    private readonly transformComp: TransformComponent,
    private readonly inputComp: InputComponent,
    props: WalkProps
  ) {
    this.speed = props.speed;
    this.accelerationTime = props.accelerationTime;
    this.decelerationTime = props.decelerationTime;
    this.stopThreshold = props.stopThreshold;
    this.getLevelData = props.levelData;
  }

  setControlMode(controlMode: ControlModeComponent): void {
    this.controlMode = controlMode;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.velocityX = 0;
      this.velocityY = 0;
    }
  }

  update(delta: number): void {
    if (!this.enabled) {
      return;
    }
    
    const waterEffect = this.entity.get(WaterEffectComponent);
    if (waterEffect?.isHopping()) {
      return;
    }
    
    const slide = this.entity.get(SlideAbilityComponent);
    if (slide?.isActive()) {
      return;
    }

    const attackCombo = this.entity.get(AttackComboComponent);
    const isLocked = attackCombo?.isMovementLocked() ?? false;

    const mode = this.controlMode?.getMode() ?? 1;
    const movementInput = isLocked ? { dx: 0, dy: 0 } : this.inputComp.getInputDelta();
    const facingInput = this.inputComp.getRawInputDelta();

    if (mode === 1) {
      this.updateMode1(facingInput);
    } else {
      this.updateMode2(facingInput);
    }

    const targetVelocity = this.calculateTargetVelocity(movementInput.dx, movementInput.dy);

    this.applyMomentum(targetVelocity, delta);

    if (movementInput.dx === 0 && movementInput.dy === 0) {
      this.applyStopThreshold();
    }

    const health = this.entity.require(HealthComponent);
    const gridPos = this.entity.get(GridPositionComponent);
    const gridCollision = this.entity.get(GridCollisionComponent);
    const grid = gridCollision?.getGrid();
    const cell = grid && gridPos ? grid.getCell(gridPos.currentCell.col, gridPos.currentCell.row) : null;
    const isInWater = cell?.properties.has('water') ?? false;
    const isBridge = cell?.properties.has('bridge') ?? false;
    const isSwimming = waterEffect?.getIsInWater() ?? false;
    
    let speedMultiplier = health.isOverhealed() ? 1.5 : 1;
    if (isInWater && (!isBridge || isSwimming)) {
      speedMultiplier *= 0.7;
    }

    let currentForceX = 0;
    let currentForceY = 0;
    if (isInWater && (!isBridge || isSwimming) && grid && gridPos) {
      const levelData = this.getLevelData?.();
      if (levelData?.background?.water) {
        const flowDir = levelData.background.water.flowDirection;
        const currentForcePxPerSec = levelData.background.water.force;
        const BLOCKER_STOP_DISTANCE_PX = 20;
        
        let checkCol = gridPos.currentCell.col;
        let checkRow = gridPos.currentCell.row;
        
        if (flowDir === 'left') {
          checkCol -= 1;
          const nextCell = grid.getCell(checkCol, checkRow);
          const isNextWater = nextCell?.properties.has('water') ?? false;
          const isNextBlocked = nextCell?.properties.has('blocked') ?? false;
          const cellWorld = grid.cellToWorld(gridPos.currentCell.col, gridPos.currentCell.row);
          const cellEdgeX = cellWorld.x;
          const distToBlocker = this.transformComp.x - cellEdgeX;
          if ((isNextWater && !isNextBlocked) || distToBlocker > BLOCKER_STOP_DISTANCE_PX) {
            currentForceX = -currentForcePxPerSec;
          }
        } else if (flowDir === 'right') {
          checkCol += 1;
          const nextCell = grid.getCell(checkCol, checkRow);
          const isNextWater = nextCell?.properties.has('water') ?? false;
          const isNextBlocked = nextCell?.properties.has('blocked') ?? false;
          const cellWorld = grid.cellToWorld(gridPos.currentCell.col, gridPos.currentCell.row);
          const cellEdgeX = cellWorld.x + grid.cellSize;
          const distToBlocker = cellEdgeX - this.transformComp.x;
          if ((isNextWater && !isNextBlocked) || distToBlocker > BLOCKER_STOP_DISTANCE_PX) {
            currentForceX = currentForcePxPerSec;
          }
        } else if (flowDir === 'up') {
          checkRow -= 1;
          const nextCell = grid.getCell(checkCol, checkRow);
          const isNextWater = nextCell?.properties.has('water') ?? false;
          const isNextBlocked = nextCell?.properties.has('blocked') ?? false;
          const cellWorld = grid.cellToWorld(gridPos.currentCell.col, gridPos.currentCell.row);
          const cellEdgeY = cellWorld.y;
          const distToBlocker = this.transformComp.y - cellEdgeY;
          if ((isNextWater && !isNextBlocked) || distToBlocker > BLOCKER_STOP_DISTANCE_PX) {
            currentForceY = -currentForcePxPerSec;
          }
        } else if (flowDir === 'down') {
          checkRow += 1;
          const nextCell = grid.getCell(checkCol, checkRow);
          const isNextWater = nextCell?.properties.has('water') ?? false;
          const isNextBlocked = nextCell?.properties.has('blocked') ?? false;
          const cellWorld = grid.cellToWorld(gridPos.currentCell.col, gridPos.currentCell.row);
          const cellEdgeY = cellWorld.y + grid.cellSize;
          const distToBlocker = cellEdgeY - this.transformComp.y;
          if ((isNextWater && !isNextBlocked) || distToBlocker > BLOCKER_STOP_DISTANCE_PX) {
            currentForceY = currentForcePxPerSec;
          }
        }
      }
    }

    this.transformComp.x += (this.velocityX * speedMultiplier + currentForceX) * (delta / 1000);
    this.transformComp.y += (this.velocityY * speedMultiplier + currentForceY) * (delta / 1000);
  }

  private updateMode1(facingInput: { dx: number; dy: number }): void {
    if (facingInput.dx !== 0 || facingInput.dy !== 0) {
      this.updateFacingDirection(facingInput.dx, facingInput.dy);
    }
  }

  private updateMode2(facingInput: { dx: number; dy: number }): void {
    this.updateMode1(facingInput);
  }

  isMovementStopped(): boolean {
    return false;
  }

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
