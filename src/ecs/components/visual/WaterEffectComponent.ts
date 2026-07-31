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
import { findMovingTileCovering } from '../moving-tile/MovingTileComponent';
import type { CollisionBox } from '../combat/CollisionComponent';
import type { GridReader, WorldCoord } from '../../../systems/grid/Grid';

const SWIMMING_COLLISION_BOX: CollisionBox = { offsetX: 0, offsetY: 0, width: 48, height: 32 };

export class WaterEffectComponent implements Component {
  entity!: Entity;
  private isInWater: boolean = false;
  private shadowMask?: Phaser.Display.Masks.GeometryMask;
  private shadowMaskGraphics?: Phaser.GameObjects.Graphics;
  private lastMaskCell: { col: number; row: number } = { col: -1, row: -1 };
  private spriteMask?: Phaser.Display.Masks.GeometryMask;
  private spriteMaskGraphics?: Phaser.GameObjects.Graphics;
  private spriteMaskActive = false;
  private swimmingSplashTimerMs: number = 0;
  private pendingEntrySplash = false;
  private readonly _tmpWorld: WorldCoord = { x: 0, y: 0 };

  constructor(private readonly scene: Phaser.Scene, private readonly splashTextureKey: string = 'water_splash') {}

  getIsInWater(): boolean {
    return this.isInWater && !this.isHopping();
  }

  enterWaterImmediate(): void {
    this.isInWater = true;
    this.spriteMaskActive = true;
    this.lastMaskCell = { col: -1, row: -1 };
    const gridPos = this.entity.get(GridPositionComponent);
    if (gridPos) gridPos.pushCollisionBox(SWIMMING_COLLISION_BOX);
    const sprite = this.entity.get(SpriteComponent);
    if (sprite) sprite.sprite.setDepth(Depth.playerSwimming);
  }

  isHopping(): boolean {
    const jump = this.entity.get(JumpComponent);
    return jump?.isJumping() ?? false;
  }

  update(delta: number): void {
    const sprite = this.entity.get(SpriteComponent);
    const transform = this.entity.get(TransformComponent);
    const gridPos = this.entity.get(GridPositionComponent);

    if (!sprite || !transform || !gridPos) return;

    // During a jump, keep player at normal depth so background textures don't render in front
    const jump = this.entity.get(JumpComponent);
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
      this.spriteMaskActive = true;
      this.lastMaskCell = { col: -1, row: -1 };
    }

    const gridCollision = this.entity.get(GridCollisionComponent);
    if (!gridCollision) return;
    const grid = gridCollision.getGrid();
    const currentCell = grid.getCell(gridPos.currentCell.col, gridPos.currentCell.row);
    // Riding a moving tile keeps the entity dry even over water.
    const onMovingTile = findMovingTileCovering(grid, gridPos.currentCell.col, gridPos.currentCell.row) !== null;
    const isCurrentCellWater = !onMovingTile && (currentCell?.properties.has('water') ?? false);
    const isCurrentCellBridge = currentCell?.properties.has('bridge') ?? false;
    const walk = this.entity.get(WalkComponent);

    const nowInWater = this.determineWaterState(isCurrentCellWater, isCurrentCellBridge, gridPos, walk, grid);

    this.updateShadow(nowInWater, transform, gridPos, grid);
    this.updateSpriteDepth(nowInWater, sprite);
    this.handleWaterTransition(nowInWater, isCurrentCellWater, transform, gridPos, walk, grid, jump);
    this.updateSwimmingSplash(delta, transform, walk);

    // Normal sprite Y when not jumping
    sprite.sprite.y = transform.y + sprite.visualOffsetYPx;
  }

  private determineWaterState(
    isCurrentCellWater: boolean, isCurrentCellBridge: boolean,
    gridPos: GridPositionComponent, walk: WalkComponent | undefined, grid: GridReader
  ): boolean {
    if (!this.isInWater) {
      return isCurrentCellWater && !isCurrentCellBridge;
    }

    // Already in water - check if should exit
    if (!walk || !isCurrentCellWater) {
      return isCurrentCellWater || isCurrentCellBridge;
    }

    const moveX = walk.lastMoveX;
    const moveY = walk.lastMoveY;
    if (moveX === 0 && moveY === 0) {
      return isCurrentCellWater || isCurrentCellBridge;
    }

    const checkCol = moveX > 0 ? gridPos.currentCell.col + 1 : moveX < 0 ? gridPos.currentCell.col - 1 : gridPos.currentCell.col;
    const checkRow = moveY > 0 ? gridPos.currentCell.row + 1 : moveY < 0 ? gridPos.currentCell.row - 1 : gridPos.currentCell.row;
    const nextCell = grid.getCell(checkCol, checkRow);
    const isNextCellDry = !nextCell?.properties.has('water');
    const isNextCellBridge = nextCell?.properties.has('bridge') ?? false;
    const isNextCellBlocked = (nextCell?.properties.has('blocked') ?? false) || (nextCell?.properties.has('platform') ?? false) || (nextCell?.properties.has('wall') ?? false);

    if (!isNextCellDry || isNextCellBridge || isCurrentCellBridge || isNextCellBlocked) {
      return true;
    }

    const transform = this.entity.require(TransformComponent);
    const cellWorld = grid.cellToWorldInto(gridPos.currentCell.col, gridPos.currentCell.row, this._tmpWorld);
    const cellCenterX = cellWorld.x + grid.cellSize / 2;
    const cellCenterY = cellWorld.y + grid.cellSize / 2;
    const halfCell = grid.cellSize / 2;

    let distToEdge = Infinity;
    if (moveX < 0) distToEdge = transform.x - (cellCenterX - halfCell);
    else if (moveX > 0) distToEdge = (cellCenterX + halfCell) - transform.x;
    else if (moveY < 0) distToEdge = transform.y - (cellCenterY - halfCell);
    else if (moveY > 0) distToEdge = (cellCenterY + halfCell) - transform.y;

    return distToEdge > halfCell / 2;
  }

  private updateShadow(nowInWater: boolean, transform: TransformComponent, gridPos: GridPositionComponent, grid: GridReader): void {
    const shadow = this.entity.get(ShadowComponent);
    if (!shadow) return;
    const baseOffsetY = shadow.props.offsetY;

    if (nowInWater) {
      shadow.shadow.setVisible(true);
      shadow.shadow.setAlpha(0.3);
      shadow.shadow.setDepth(Depth.shadowSwimming);
      shadow.shadow.setY(transform.y + baseOffsetY + 32);

      if (gridPos.currentCell.col !== this.lastMaskCell.col || gridPos.currentCell.row !== this.lastMaskCell.row) {
        this.updateShadowMask(shadow, gridPos, grid);
        if (this.spriteMaskActive) {
          this.updateSpriteMask(gridPos, grid);
        }
        this.lastMaskCell = { col: gridPos.currentCell.col, row: gridPos.currentCell.row };
      }
    } else {
      shadow.shadow.setVisible(true);
      shadow.shadow.setAlpha(1);
      shadow.shadow.setDepth(Depth.shadow);
      shadow.shadow.setY(transform.y + baseOffsetY);
      shadow.shadow.clearMask();
      const sprite = this.entity.get(SpriteComponent);
      if (sprite) sprite.sprite.clearMask();
      this.spriteMaskActive = false;
    }
  }

  private updateSpriteDepth(nowInWater: boolean, sprite: SpriteComponent): void {
    if (nowInWater) {
      if (sprite.sprite.depth !== Depth.playerSwimming) sprite.sprite.setDepth(Depth.playerSwimming);
    } else if (sprite.sprite.depth !== Depth.player) {
      sprite.sprite.setDepth(Depth.player);
    }
  }

  private handleWaterTransition(
    nowInWater: boolean, isCurrentCellWater: boolean,
    transform: TransformComponent, gridPos: GridPositionComponent,
    walk: WalkComponent | undefined, grid: GridReader, jump: JumpComponent | undefined
  ): void {
    if (nowInWater === this.isInWater) return;
    const wasInWater = this.isInWater;
    this.isInWater = nowInWater;

    if (!nowInWater && wasInWater) {
      gridPos.popCollisionBox();
      SoundManager.getInstance().play('splash1');
      this.createSplashEffect(transform.x, transform.y, false);
    }

    if (nowInWater && !wasInWater) {
      gridPos.pushCollisionBox(SWIMMING_COLLISION_BOX);
      this.pendingEntrySplash = true;
    }

    const jumpTarget = this.calculateJumpTarget(nowInWater, isCurrentCellWater, gridPos, walk, grid);
    if (jump && jumpTarget) {
      jump.triggerWaterJump(jumpTarget.col, jumpTarget.row, jumpTarget.dx, jumpTarget.dy, nowInWater);
    }
  }

  private updateSwimmingSplash(delta: number, transform: TransformComponent, walk: WalkComponent | undefined): void {
    if (!this.isInWater || !walk) return;
    if (walk.isMoving()) {
      this.swimmingSplashTimerMs += delta;
      if (this.swimmingSplashTimerMs >= 500) {
        this.swimmingSplashTimerMs = 0;
        this.createSplashEffect(transform.x, transform.y, true);
      }
    } else {
      this.swimmingSplashTimerMs = 0;
    }
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
      if (target) return target;
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
          const world = grid.cellToWorldInto(col, row, this._tmpWorld);

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

  private updateSpriteMask(gridPos: GridPositionComponent, grid: GridReader): void {
    if (this.spriteMaskGraphics) {
      this.spriteMaskGraphics.destroy();
    }

    const sprite = this.entity.get(SpriteComponent);
    if (!sprite) return;

    this.spriteMaskGraphics = this.scene.add.graphics();
    this.spriteMaskGraphics.fillStyle(0xffffff);
    this.spriteMaskGraphics.setVisible(false);

    const centerCell = gridPos.currentCell;
    const cellRadius = 2;
    const BOTTOM_INSET_PX = 10;

    // Find the bottom-most Y where water ends (per column near the player)
    let maxBottomY = 0;
    for (let col = centerCell.col - cellRadius; col <= centerCell.col + cellRadius; col++) {
      for (let row = centerCell.row - cellRadius; row <= centerCell.row + cellRadius; row++) {
        const cell = grid.getCell(col, row);
        if (!cell?.properties.has('water')) continue;
        const hasWaterBelow = grid.getCell(col, row + 1)?.properties.has('water') ?? false;
        const world = grid.cellToWorldInto(col, row, this._tmpWorld);
        const bottomY = hasWaterBelow ? world.y + grid.cellSize : world.y + grid.cellSize - BOTTOM_INSET_PX;
        if (bottomY > maxBottomY) maxBottomY = bottomY;
      }
    }

    // Draw a large rect from far above down to the bottom water edge
    const topY = (centerCell.row - cellRadius) * grid.cellSize - 200;
    const leftX = (centerCell.col - cellRadius) * grid.cellSize - 200;
    const width = (cellRadius * 2 + 1) * grid.cellSize + 400;
    this.spriteMaskGraphics.fillRect(leftX, topY, width, maxBottomY - topY);

    this.spriteMask = this.spriteMaskGraphics.createGeometryMask();
    sprite.sprite.setMask(this.spriteMask);
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
    if (this.spriteMaskGraphics) {
      this.spriteMaskGraphics.destroy();
    }
  }
}
