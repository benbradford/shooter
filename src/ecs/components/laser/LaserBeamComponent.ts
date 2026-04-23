import type Phaser from 'phaser';
import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { Grid } from '../../../systems/grid/Grid';
import type { EntityManager } from '../../EntityManager';
import type { BlockedAreaManager } from '../../../systems/BlockedAreaManager';
import { TransformComponent } from '../core/TransformComponent';
import { GridPositionComponent } from '../movement/GridPositionComponent';
import { GridCellBlocker } from '../movement/GridCellBlocker';
import { HealthComponent } from '../core/HealthComponent';
import { HitFlashComponent } from '../visual/HitFlashComponent';
import { CollisionComponent } from '../combat/CollisionComponent';
import { StateMachineComponent } from '../core/StateMachineComponent';
import { WorldStateManager } from '../../../systems/WorldStateManager';
import { Depth } from '../../../constants/DepthConstants';

const BEAM_OUTER_WIDTH_PX = 8;
const BEAM_INNER_WIDTH_PX = 3;
const BEAM_COLLISION_HALF_WIDTH_PX = 4;
const RAYCAST_STEP_PX = 4;
const PULSE_PERIOD_MS = 500;
const SPARK_TEXTURE_KEY = '__laser_spark';
const SPARK_TEXTURE_SIZE_PX = 4;
const LASER_DAMAGE = 3;
const DAMAGE_COOLDOWN_MS = 50;
const PUSHBACK_MARGIN_PX = 20;
const BEAM_START_OFFSET_PX = 26;
const ENEMY_LASER_KILL_DAMAGE = 9999;

export type LaserBeamProps = {
  scene: Phaser.Scene;
  grid: Grid;
  angle: number;
  flagName: string;
  layer: number;
  blockedAreaManager?: BlockedAreaManager;
  entityManager: EntityManager;
  nozzleSprite?: Phaser.GameObjects.Sprite;
};

export class LaserBeamComponent implements Component {
  entity!: Entity;

  private readonly scene: Phaser.Scene;
  private readonly grid: Grid;
  private readonly dirX: number;
  private readonly dirY: number;
  private readonly flagName: string;
  private readonly layer: number;
  private readonly blockedAreaManager?: BlockedAreaManager;
  private readonly entityManager: EntityManager;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly emitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly nozzleSprite?: Phaser.GameObjects.Sprite;

  private isOn = true;
  private pulseTimeMs = 0;
  private damageCooldownMs = 0;

  constructor(props: LaserBeamProps) {
    this.scene = props.scene;
    this.grid = props.grid;
    this.flagName = props.flagName;
    this.layer = props.layer;
    this.blockedAreaManager = props.blockedAreaManager;
    this.entityManager = props.entityManager;

    const rad = (props.angle - 90) * Math.PI / 180;
    this.dirX = Math.cos(rad);
    this.dirY = Math.sin(rad);

    this.graphics = props.scene.add.graphics();
    this.graphics.setDepth(Depth.particle);
    this.nozzleSprite = props.nozzleSprite;

    this.emitter = this.createImpactEmitter();
  }

  update(delta: number): void {
    this.pulseTimeMs += delta;
    if (this.damageCooldownMs > 0) this.damageCooldownMs -= delta;

    const flagValue = WorldStateManager.getInstance().getFlag(this.flagName);
    this.isOn = flagValue !== 'false';

    if (!this.isOn) {
      this.graphics.setVisible(false);
      this.emitter.stop();
      return;
    }

    const transform = this.entity.require(TransformComponent);
    const startX = transform.x + this.dirX * BEAM_START_OFFSET_PX;
    const startY = transform.y + this.dirY * BEAM_START_OFFSET_PX;

    const endpoint = this.raycast(startX, startY);

    this.renderBeam(startX, startY, endpoint.x, endpoint.y);

    this.emitter.setPosition(endpoint.x, endpoint.y);
    if (!this.emitter.emitting) this.emitter.start();

    this.checkPlayerCollision(startX, startY, endpoint.x, endpoint.y);
    this.checkEnemyCollision(startX, startY, endpoint.x, endpoint.y);
  }

  onDestroy(): void {
    this.graphics.destroy();
    this.emitter.destroy();
    this.nozzleSprite?.destroy();
  }

  private raycast(startX: number, startY: number): { x: number; y: number } {
    const maxDistPx = Math.hypot(
      this.grid.width * this.grid.cellSize,
      this.grid.height * this.grid.cellSize
    );
    const steps = Math.ceil(maxDistPx / RAYCAST_STEP_PX);
    let prevCol = -1;
    let prevRow = -1;

    for (let i = 1; i <= steps; i++) {
      const x = startX + this.dirX * i * RAYCAST_STEP_PX;
      const y = startY + this.dirY * i * RAYCAST_STEP_PX;
      const col = Math.floor(x / this.grid.cellSize);
      const row = Math.floor(y / this.grid.cellSize);

      if (col === prevCol && row === prevRow) continue;
      prevCol = col;
      prevRow = row;

      if (col < 0 || col >= this.grid.width || row < 0 || row >= this.grid.height) {
        return { x, y };
      }

      const cell = this.grid.getCell(col, row);
      if (!cell) return { x, y };

      if (this.grid.isWall(cell) || cell.properties.has('platform')) {
        return { x, y };
      }

      if (this.blockedAreaManager?.getBlockedCells().has(`${col},${row}`)) {
        return { x, y };
      }

      for (const occupant of cell.occupants) {
        if (occupant === this.entity) continue;
        if (occupant.get(GridCellBlocker)) {
          return { x, y };
        }
      }
    }

    return { x: startX + this.dirX * maxDistPx, y: startY + this.dirY * maxDistPx };
  }

  private renderBeam(startX: number, startY: number, endX: number, endY: number): void {
    this.graphics.clear();
    this.graphics.setVisible(true);

    // Outer glow
    this.graphics.lineStyle(BEAM_OUTER_WIDTH_PX, 0xff0000, 0.4);
    this.graphics.lineBetween(startX, startY, endX, endY);

    // Inner core
    this.graphics.lineStyle(BEAM_INNER_WIDTH_PX, 0xffffcc, 1.0);
    this.graphics.lineBetween(startX, startY, endX, endY);

    // Pulsing overlay
    const t = this.pulseTimeMs / PULSE_PERIOD_MS;
    const pulseWidthPx = 4 + Math.sin(t * Math.PI * 2);
    const pulseAlpha = 0.25 + Math.sin(t * Math.PI * 2) * 0.1;
    this.graphics.lineStyle(pulseWidthPx, 0xff4400, pulseAlpha);
    this.graphics.lineBetween(startX, startY, endX, endY);
  }

  private checkPlayerCollision(startX: number, startY: number, endX: number, endY: number): void {
    if (this.damageCooldownMs > 0) return;

    const player = this.entityManager.getFirst('player');
    if (!player || player.isDestroyed) return;

    const gridPos = player.get(GridPositionComponent);
    if (!gridPos || gridPos.currentLayer !== this.layer) return;

    const playerTransform = player.require(TransformComponent);
    const collision = player.get(CollisionComponent);
    if (!collision) return;

    const cx = playerTransform.x + collision.box.offsetX + collision.box.width / 2;
    const cy = playerTransform.y + collision.box.offsetY + collision.box.height / 2;

    const dist = this.pointToSegmentDist(cx, cy, startX, startY, endX, endY);
    if (dist >= BEAM_COLLISION_HALF_WIDTH_PX + collision.box.width / 2) return;

    const health = player.get(HealthComponent);
    if (!health || health.getHealth() <= 0) return;

    health.takeDamage(LASER_DAMAGE);
    this.damageCooldownMs = DAMAGE_COOLDOWN_MS;

    const hitFlash = player.get(HitFlashComponent);
    hitFlash?.flash(300);

    // If player is in push state, force exit so knockback works
    const sm = player.get(StateMachineComponent);
    if (sm?.stateMachine.getCurrentKey() === 'push') {
      sm.stateMachine.enter('idle');
    }

    // Push player fully out of the beam so they can't walk through
    // Find perpendicular direction from beam to player
    const perpX = -this.dirY;
    const perpY = this.dirX;
    const toPlayerX = cx - startX;
    const toPlayerY = cy - startY;
    const side = toPlayerX * perpX + toPlayerY * perpY;
    // Push toward the side the player is on
    const pushDirX = side >= 0 ? perpX : -perpX;
    const pushDirY = side >= 0 ? perpY : -perpY;

    // Distance needed: beam half-width + player half-width + margin - current distance from beam center
    const clearancePx = BEAM_COLLISION_HALF_WIDTH_PX + collision.box.width / 2 + PUSHBACK_MARGIN_PX;
    const pushDistPx = clearancePx - dist;
    if (pushDistPx <= 0) return;

    const targetX = playerTransform.x + pushDirX * pushDistPx;
    const targetY = playerTransform.y + pushDirY * pushDistPx;
    const targetCell = this.grid.worldToCell(targetX, targetY);
    const cell = this.grid.getCell(targetCell.col, targetCell.row);

    if (!cell) return;
    if (this.grid.isWall(cell) || cell.properties.has('platform')) return;
    if (cell.layer !== gridPos.currentLayer) return;
    if (this.blockedAreaManager?.getBlockedCells().has(`${targetCell.col},${targetCell.row}`)) return;
    for (const occupant of cell.occupants) {
      if (occupant.get(GridCellBlocker)) return;
    }

    playerTransform.x = targetX;
    playerTransform.y = targetY;
  }

  private checkEnemyCollision(startX: number, startY: number, endX: number, endY: number): void {
    for (const entity of this.entityManager.getAll()) {
      if (entity.isDestroyed || !entity.tags.has('enemy') || entity.tags.has('laser')) continue;

      const transform = entity.get(TransformComponent);
      if (!transform) continue;

      const gridPos = entity.get(GridPositionComponent);
      if (gridPos && gridPos.currentLayer !== this.layer) continue;

      const dist = this.pointToSegmentDist(transform.x, transform.y, startX, startY, endX, endY);
      const enemyCollision = entity.get(CollisionComponent);
      const enemyHalfWidth = enemyCollision ? enemyCollision.box.width / 2 : 16;
      if (dist < BEAM_COLLISION_HALF_WIDTH_PX + enemyHalfWidth) {
        const health = entity.get(HealthComponent);
        if (health && health.getHealth() > 0) {
          health.takeDamage(ENEMY_LASER_KILL_DAMAGE);
          const sm = entity.get(StateMachineComponent);
          if (sm?.stateMachine.hasState('death')) {
            sm.stateMachine.enter('death');
          } else {
            entity.destroy();
          }
        }
      }
    }
  }

  private pointToSegmentDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - ax, py - ay);

    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }

  private createImpactEmitter(): Phaser.GameObjects.Particles.ParticleEmitter {
    if (!this.scene.textures.exists(SPARK_TEXTURE_KEY)) {
      const g = this.scene.add.graphics();
      g.fillStyle(0xffffff);
      g.fillCircle(2, 2, 2);
      g.generateTexture(SPARK_TEXTURE_KEY, SPARK_TEXTURE_SIZE_PX, SPARK_TEXTURE_SIZE_PX);
      g.destroy();
    }

    const emitter = this.scene.add.particles(0, 0, SPARK_TEXTURE_KEY, {
      speed: { min: 30, max: 90 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.5, end: 0 },
      lifespan: { min: 150, max: 400 },
      frequency: 25,
      quantity: 2,
      tint: [0xffff00, 0xff6600],
      alpha: { start: 1, end: 0 },
      blendMode: 'ADD',
    });
    emitter.setDepth(Depth.particle);

    return emitter;
  }
}
