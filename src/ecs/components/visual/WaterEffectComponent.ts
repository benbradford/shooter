import { SoundManager } from '../../../systems/SoundManager';
import type { Component } from '../../Component';
import { Depth } from '../../../constants/DepthConstants';
import type { Entity } from '../../Entity';
import { SpriteComponent } from '../core/SpriteComponent';
import { TransformComponent } from '../core/TransformComponent';
import { ShadowComponent } from './ShadowComponent';
import { GridPositionComponent } from '../movement/GridPositionComponent';
import { GridCollisionComponent } from '../movement/GridCollisionComponent';
import { WalkComponent } from '../movement/WalkComponent';
import { JumpComponent } from '../movement/JumpComponent';
import type { CollisionBox } from '../combat/CollisionComponent';
import type { GridReader } from '../../../systems/grid/Grid';

const SWIMMING_COLLISION_BOX: CollisionBox = { offsetX: 0, offsetY: 0, width: 48, height: 32 };

export class WaterEffectComponent implements Component {
  entity!: Entity;
  private isInWater: boolean = false;
  private shadowMask?: Phaser.Display.Masks.GeometryMask;
  private shadowMaskGraphics?: Phaser.GameObjects.Graphics;
  private lastMaskCell: { col: number; row: number } = { col: -1, row: -1 };
  private swimmingSplashTimerMs: number = 0;
  private pendingEntrySplash = false;

  constructor(private readonly scene: Phaser.Scene, private readonly splashTextureKey: string = 'water_splash') {}

  getIsInWater(): boolean {
    return this.isInWater && !this.isHopping();
  }

  isHopping(): boolean {
    const jump = this.entity.get(JumpComponent);
    return jump?.isJumping() ?? false;
  }

  update(delta: number): void {
    const sprite = this.entity.get(SpriteComponent);
    const shadow = this.entity.get(ShadowComponent);
    const transform = this.entity.get(TransformComponent);
    const gridPos = this.entity.get(GridPositionComponent);
    const gridCollision = this.entity.get(GridCollisionComponent);
    const walk = this.entity.get(WalkComponent);
    const jump = this.entity.get(JumpComponent);

    if (!sprite || !transform || !gridPos) return;

    // During a jump, keep player at normal depth so background textures don't render in front
    if (jump?.isJumping()) {
      if (sprite.sprite.depth !== Depth.player) {
        sprite.sprite.setDepth(Depth.player);
      }
      return;
    }

    // If we just finished a water-entry jump, play the splash
    if (this.pendingEntrySplash) {
      this.pendingEntrySplash = false;
      this.createSplashEffect(transform.x, transform.y, false);
      SoundManager.getInstance().play('splash2');
    }

    if (!gridCollision) return;
    const grid = gridCollision.getGrid();
    const currentCell = grid.getCell(gridPos.currentCell.col, gridPos.currentCell.row);
    const isCurrentCellWater = currentCell?.properties.has('water') ?? false;
    const isCurrentCellBridge = currentCell?.properties.has('bridge') ?? false;

    // Determine water state
    let nowInWater = false;

    if (this.isInWater) {
      // Already in water - check if should exit
      if (walk && isCurrentCellWater) {
        const moveX = walk.lastMoveX;
        const moveY = walk.lastMoveY;

        if (moveX !== 0 || moveY !== 0) {
          // Check cell in movement direction (use quantized direction to match exit cell logic)
          const exitDir = this.getJoystickDirection(walk);
          const checkCol = gridPos.currentCell.col + exitDir.dx;
          const checkRow = gridPos.currentCell.row + exitDir.dy;
          const nextCell = grid.getCell(checkCol, checkRow);
          const isNextCellDry = !nextCell?.properties.has('water');
          const isNextCellBridge = nextCell?.properties.has('bridge') ?? false;
          const isNextCellBlocked = nextCell?.properties.has('blocked') || nextCell?.properties.has('platform') || nextCell?.properties.has('wall') || false;

          if (isNextCellDry && !isNextCellBridge && !isCurrentCellBridge && !isNextCellBlocked) {
            const cellWorld = grid.cellToWorld(gridPos.currentCell.col, gridPos.currentCell.row);
            const cellCenterX = cellWorld.x + grid.cellSize / 2;
            const cellCenterY = cellWorld.y + grid.cellSize / 2;
            const halfCell = grid.cellSize / 2;

            let distToEdge = Infinity;
            if (exitDir.dx < 0) {
              distToEdge = transform.x - (cellCenterX - halfCell);
            } else if (exitDir.dx > 0) {
              distToEdge = (cellCenterX + halfCell) - transform.x;
            } else if (exitDir.dy < 0) {
              distToEdge = transform.y - (cellCenterY - halfCell);
            } else if (exitDir.dy > 0) {
              distToEdge = (cellCenterY + halfCell) - transform.y;
            }

            if (distToEdge <= halfCell / 2) {
              nowInWater = false;
            } else {
              nowInWater = true;
            }
          } else {
            nowInWater = true;
          }
        } else {
          nowInWater = isCurrentCellWater || isCurrentCellBridge;
        }
      } else {
        nowInWater = isCurrentCellWater || isCurrentCellBridge;
      }
    } else {
      // Not in water - check if should enter
      nowInWater = isCurrentCellWater && !isCurrentCellBridge;
    }

    if (shadow) {
      const baseOffsetY = shadow.props.offsetY;

      if (nowInWater) {
        // Shadow visible but faded and below player when swimming
        shadow.shadow.setVisible(true);
        shadow.shadow.setAlpha(0.3);
        shadow.shadow.setDepth(Depth.shadowSwimming);
        shadow.shadow.setY(transform.y + baseOffsetY + 32);

        // Update shadow mask if player moved to different cell
        if (gridPos.currentCell.col !== this.lastMaskCell.col || gridPos.currentCell.row !== this.lastMaskCell.row) {
          this.updateShadowMask(shadow, gridPos, grid);
          this.lastMaskCell = { col: gridPos.currentCell.col, row: gridPos.currentCell.row };
        }
      } else {
        // Normal shadow when not in water
        shadow.shadow.setVisible(true);
        shadow.shadow.setAlpha(1);
        shadow.shadow.setDepth(Depth.shadow);
        shadow.shadow.setY(transform.y + baseOffsetY);
        shadow.shadow.clearMask();
      }
    }

    // Adjust sprite depth based on swimming state
    if (nowInWater) {
      if (sprite.sprite.depth !== Depth.playerSwimming) {
        sprite.sprite.setDepth(Depth.playerSwimming);
      }
    } else if (sprite.sprite.depth !== Depth.player) {
      sprite.sprite.setDepth(Depth.player);
    }

    // Block water exit if no valid dry landing cell exists or player slid onto dry cell
    if (!nowInWater && this.isInWater) {
      if (isCurrentCellWater) {
        // On water cell — only allow exit if there's a valid dry landing
        const dir = this.getJoystickDirection(walk);
        const exitCell = this.findValidExitCell(gridPos.currentCell.col, gridPos.currentCell.row, dir, grid);
        if (!exitCell) {
          nowInWater = true;
        }
      } else {
        // Player's currentCell became dry (sliding/boundary) — stay in water, let normal exit handle it
        nowInWater = true;
      }
    }

    // Detect water entry/exit — trigger JumpComponent jump
    if (nowInWater !== this.isInWater) {
      const dbgDir = this.getJoystickDirection(walk);
      console.log(`[WATER] state change: nowInWater=${nowInWater} wasInWater=${this.isInWater} cell=(${gridPos.currentCell.col},${gridPos.currentCell.row}) isCurrentCellWater=${isCurrentCellWater} dir=(${dbgDir.dx},${dbgDir.dy}) moveX=${walk?.lastMoveX?.toFixed(2)} moveY=${walk?.lastMoveY?.toFixed(2)}`);
      const wasInWater = this.isInWater;
      this.isInWater = nowInWater;

      if (!nowInWater && wasInWater) {
        // Exiting water — pop swimming collision box, splash immediately, sound on exit
        gridPos.popCollisionBox();
        SoundManager.getInstance().play('splash1');
        this.createSplashEffect(transform.x, transform.y, false);
      }

      if (nowInWater && !wasInWater) {
        // Entering water — push swimming collision box, splash plays after jump lands
        gridPos.pushCollisionBox(SWIMMING_COLLISION_BOX);
        this.pendingEntrySplash = true;
      }

      // Calculate target cell and trigger jump (skip if already on dry cell — no jump needed)
      const jumpTarget = this.calculateJumpTarget(nowInWater, isCurrentCellWater, gridPos, walk, grid);
      if (jump && jumpTarget && (nowInWater || isCurrentCellWater)) {
        jump.triggerWaterJump(jumpTarget.col, jumpTarget.row, jumpTarget.dx, jumpTarget.dy, nowInWater);
      }
    }

    // Swimming splash effects
    if (this.isInWater && walk) {
      const isMoving = walk.isMoving();
      if (isMoving) {
        this.swimmingSplashTimerMs += delta;
        if (this.swimmingSplashTimerMs >= 500) {
          this.swimmingSplashTimerMs = 0;
          this.createSplashEffect(transform.x, transform.y, true);
        }
      } else {
        this.swimmingSplashTimerMs = 0;
      }
    }

    // Normal sprite Y when not jumping
    sprite.sprite.y = transform.y + sprite.visualOffsetYPx;
  }

  private calculateJumpTarget(
    nowInWater: boolean,
    isCurrentCellWater: boolean,
    gridPos: GridPositionComponent,
    walk: WalkComponent | undefined,
    grid: GridReader
  ): { col: number; row: number; dx: number; dy: number } | null {
    const dir = this.getJoystickDirection(walk);

    if (nowInWater) {
      // Entering water — jump to current cell center, joystick direction for animation
      return { col: gridPos.currentCell.col, row: gridPos.currentCell.row, ...dir };
    }

    // Exiting water — find a dry cell in the joystick direction with fallbacks
    if (!walk) return null;

    if (isCurrentCellWater) {
      const target = this.findValidExitCell(gridPos.currentCell.col, gridPos.currentCell.row, dir, grid);
      return target;
    }

    // Already on dry cell
    return { col: gridPos.currentCell.col, row: gridPos.currentCell.row, ...dir };
  }

  /** Find a non-water cell adjacent to (col,row), trying preferred direction then cardinal fallbacks. */
  private findValidExitCell(
    col: number, row: number, dir: { dx: number; dy: number }, grid: GridReader
  ): { col: number; row: number; dx: number; dy: number } | null {
    const candidates: { dx: number; dy: number }[] = [dir];
    if (dir.dx !== 0 && dir.dy !== 0) {
      candidates.push({ dx: dir.dx, dy: 0 });
      candidates.push({ dx: 0, dy: dir.dy });
    }

    for (const c of candidates) {
      const cell = grid.getCell(col + c.dx, row + c.dy);
      if (cell && !cell.properties.has('water')) {
        return { col: col + c.dx, row: row + c.dy, ...c };
      }
    }
    return null;
  }

  /** Get 8-direction from joystick input. */
  private getJoystickDirection(walk: WalkComponent | undefined): { dx: number; dy: number } {
    if (!walk) return { dx: 0, dy: 1 };
    const mx = walk.lastMoveX;
    const my = walk.lastMoveY;
    if (mx === 0 && my === 0) return { dx: 0, dy: 1 };
    const absMx = Math.abs(mx);
    const absMy = Math.abs(my);
    const DIAG_THRESHOLD = 0.3;
    const maxAbs = Math.max(absMx, absMy);
    const dx = absMx > DIAG_THRESHOLD * maxAbs ? (mx > 0 ? 1 : -1) : 0;
    const dy = absMy > DIAG_THRESHOLD * maxAbs ? (my > 0 ? 1 : -1) : 0;
    return { dx: dx || 0, dy: dy || (dx === 0 ? 1 : 0) };
  }

  private updateShadowMask(shadow: ShadowComponent, gridPos: GridPositionComponent, grid: GridReader): void {
    if (this.shadowMaskGraphics) {
      this.shadowMaskGraphics.destroy();
    }

    this.shadowMaskGraphics = shadow.shadow.scene.add.graphics();
    this.shadowMaskGraphics.fillStyle(0xffffff);
    this.shadowMaskGraphics.setVisible(false);

    const centerCell = gridPos.currentCell;
    const cellRadius = 2;
    const inset = 8;

    for (let row = centerCell.row - cellRadius; row <= centerCell.row + cellRadius; row++) {
      for (let col = centerCell.col - cellRadius; col <= centerCell.col + cellRadius; col++) {
        const cell = grid.getCell(col, row);
        if (cell?.properties.has('water')) {
          const world = grid.cellToWorld(col, row);

          const hasWaterLeft = grid.getCell(col - 1, row)?.properties.has('water') ?? false;
          const hasWaterRight = grid.getCell(col + 1, row)?.properties.has('water') ?? false;
          const hasWaterUp = grid.getCell(col, row - 1)?.properties.has('water') ?? false;
          const hasWaterDown = grid.getCell(col, row + 1)?.properties.has('water') ?? false;

          const left = world.x + (hasWaterLeft ? 0 : inset);
          const top = world.y + (hasWaterUp ? 0 : inset);
          const right = world.x + grid.cellSize - (hasWaterRight ? 0 : inset);
          const bottom = world.y + grid.cellSize - (hasWaterDown ? 0 : inset);

          this.shadowMaskGraphics.fillRect(left, top, right - left, bottom - top);
        }
      }
    }

    this.shadowMask = this.shadowMaskGraphics.createGeometryMask();
    shadow.shadow.setMask(this.shadowMask);
  }

  private createSplashEffect(x: number, y: number, isSwimming: boolean): void {
    const emitter = this.scene.add.particles(x, y, this.splashTextureKey, {
      speed: isSwimming ? { min: 30, max: 60 } : { min: 50, max: 100 },
      angle: { min: 0, max: -180 },
      scale: isSwimming ? { start: 0.09, end: 0 } : { start: 0.15, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 1000,
      frequency: isSwimming ? 3 : 2,
      blendMode: 'NORMAL',
      gravityY: 300,
      emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, 12) } as Phaser.Types.GameObjects.Particles.EmitZoneData
    });

    emitter.setDepth(Depth.particle);
    this.scene.time.delayedCall(isSwimming ? 40 : 80, () => emitter.stop());
    this.scene.time.delayedCall(800, () => emitter.destroy());
  }

  onDestroy(): void {
    if (this.shadowMaskGraphics) {
      this.shadowMaskGraphics.destroy();
    }
  }
}
