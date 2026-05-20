import type Phaser from 'phaser';
import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { GridReader } from '../../../systems/grid/Grid';
import type { EntityManager } from '../../EntityManager';
import type { BlockedAreaManager } from '../../../systems/BlockedAreaManager';
import type { EventManagerSystem } from '../../systems/EventManagerSystem';
import type { EventListener } from '../../systems/EventListener';
import { TransformComponent } from '../core/TransformComponent';
import { GridPositionComponent } from '../movement/GridPositionComponent';
import { GridCellBlocker } from '../movement/GridCellBlocker';
import { HealthComponent } from '../core/HealthComponent';
import { HitFlashComponent } from '../visual/HitFlashComponent';
import { CollisionComponent } from '../combat/CollisionComponent';
import { StateMachineComponent } from '../core/StateMachineComponent';
import { BugBurstComponent } from '../visual/BugBurstComponent';
import { SoundManager } from '../../../systems/SoundManager';
import type { WorldStateManager } from '../../../systems/WorldStateManager';
import { CachedFlag } from '../../../systems/state/CachedFlag';
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
const SOUND_MAX_DISTANCE_PX = 600;
const SOUND_MAX_VOLUME = 0.4;

export type LaserBeamProps = {
  scene: Phaser.Scene;
  grid: GridReader;
  angle: number;
  flagName: string;
  layer: number;
  blockedAreaManager?: BlockedAreaManager;
  entityManager: EntityManager;
  nozzleSprite?: Phaser.GameObjects.Sprite;
  onDestroyEvent?: string;
  baseSprite: Phaser.GameObjects.Sprite;
  eventManager?: EventManagerSystem;
  worldState: WorldStateManager;
};

export class LaserBeamComponent implements Component, EventListener {
  entity!: Entity;

  private readonly scene: Phaser.Scene;
  private readonly grid: GridReader;
  private readonly dirX: number;
  private readonly dirY: number;
  private readonly layer: number;
  private readonly blockedAreaManager?: BlockedAreaManager;
  private readonly entityManager: EntityManager;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly emitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly nozzleSprite?: Phaser.GameObjects.Sprite;
  private readonly baseSprite: Phaser.GameObjects.Sprite;
  private readonly onDestroyEvent?: string;
  private readonly eventManager?: EventManagerSystem;
  private readonly worldState: WorldStateManager;
  private readonly onFlag: CachedFlag;

  private isOn = true;
  private isDestroyed = false;
  private pulseTimeMs = 0;
  private damageCooldownMs = 0;

  isActive(): boolean {
    return this.isOn && !this.isDestroyed;
  }
  private readonly loopSound?: Phaser.Sound.BaseSound;

  constructor(props: LaserBeamProps) {
    this.scene = props.scene;
    this.grid = props.grid;
    this.layer = props.layer;
    this.blockedAreaManager = props.blockedAreaManager;
    this.entityManager = props.entityManager;
    this.baseSprite = props.baseSprite;
    this.onDestroyEvent = props.onDestroyEvent;
    this.worldState = props.worldState;
    this.onFlag = new CachedFlag(props.flagName, props.worldState, (v) => v !== 'false');

    const rad = (props.angle - 90) * Math.PI / 180;
    this.dirX = Math.cos(rad);
    this.dirY = Math.sin(rad);

    this.graphics = props.scene.add.graphics();
    this.graphics.setDepth(Depth.particle);
    this.nozzleSprite = props.nozzleSprite;

    this.emitter = this.createImpactEmitter();

    if (props.scene.cache.audio.exists('laser_burn')) {
      this.loopSound = props.scene.sound.add('laser_burn', { loop: true, volume: 0 });
      this.loopSound.play();
    }

    this.eventManager = props.eventManager;
    if (this.onDestroyEvent && this.eventManager) {
      this.eventManager.register(this.onDestroyEvent, this);
    }
  }

  onEvent(eventName: string): void {
    if (eventName === this.onDestroyEvent) {
      this.destroyLaser();
    }
  }

  private destroyLaser(): void {
    this.isDestroyed = true;
    this.graphics.setVisible(false);
    this.emitter.stop();
    this.nozzleSprite?.setVisible(false);
    this.loopSound?.destroy();

    // Explosion particles
    const transform = this.entity.require(TransformComponent);
    const explosion = this.scene.add.particles(transform.x, transform.y, 'fire', {
      speed: { min: 50, max: 100 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xffffff, 0xff8800, 0xff0000],
      lifespan: 400,
      frequency: 5,
      blendMode: 'ADD',
    });
    explosion.setDepth(Depth.particle);
    this.scene.time.delayedCall(80, () => explosion.stop());
    this.scene.time.delayedCall(480, () => explosion.destroy());

    // Swap base to destroyed texture
    this.baseSprite.setTexture('laser_base_destroyed');

    // Track as destroyed so it doesn't respawn on re-entry
    if (this.entity.levelName) {
      const ws = this.worldState;
      ws.addDestroyedEntity(this.entity.levelName, this.entity.id);
    }

    if (this.eventManager && this.onDestroyEvent) {
      this.eventManager.deregister(this.onDestroyEvent, this);
    }
  }

  update(delta: number): void {
    if (this.isDestroyed) return;
    this.pulseTimeMs += delta;
    if (this.damageCooldownMs > 0) this.damageCooldownMs -= delta;

    this.isOn = this.onFlag.get();

    if (!this.isOn) {
      this.graphics.setVisible(false);
      this.emitter.stop();
      if (this.loopSound?.isPlaying) this.setLoopVolume(0);
      return;
    }

    const transform = this.entity.require(TransformComponent);
    const startX = transform.x + this.dirX * BEAM_START_OFFSET_PX;
    const startY = transform.y + this.dirY * BEAM_START_OFFSET_PX;

    const endpoint = this.raycast(startX, startY);

    this.renderBeam(startX, startY, endpoint.x, endpoint.y);

    this.emitter.setPosition(endpoint.x, endpoint.y);
    if (!this.emitter.emitting) this.emitter.start();

    this.updateSoundVolume(transform.x, transform.y);

    this.checkPlayerCollision(startX, startY, endpoint.x, endpoint.y);
    this.checkEnemyCollision(startX, startY, endpoint.x, endpoint.y);
  }

  onDestroy(): void {
    this.onFlag.destroy();
    this.graphics.destroy();
    this.emitter.destroy();
    this.nozzleSprite?.destroy();
    this.loopSound?.destroy();
    if (this.eventManager && this.onDestroyEvent) {
      this.eventManager.deregister(this.onDestroyEvent, this);
    }
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
    this.graphics.lineStyle(BEAM_INNER_WIDTH_PX, 0xffffcc, 1);
    this.graphics.lineBetween(startX, startY, endX, endY);

    // Pulsing overlay
    const t = this.pulseTimeMs / PULSE_PERIOD_MS;
    const pulseWidthPx = 4 + Math.sin(t * Math.PI * 2);
    const pulseAlpha = 0.25 + Math.sin(t * Math.PI * 2) * 0.1;
    this.graphics.lineStyle(pulseWidthPx, 0xff4400, pulseAlpha);
    this.graphics.lineBetween(startX, startY, endX, endY);
  }

  private setLoopVolume(volume: number): void {
    if (!this.loopSound) return;
    (this.loopSound as unknown as { setVolume: (v: number) => void }).setVolume(volume);
  }

  private updateSoundVolume(laserX: number, laserY: number): void {
    if (!this.loopSound) return;
    const player = this.entityManager.getFirst('player');
    if (!player || player.isDestroyed) return;
    const pt = player.require(TransformComponent);
    const dist = Math.hypot(pt.x - laserX, pt.y - laserY);
    const volume = Math.max(0, 1 - dist / SOUND_MAX_DISTANCE_PX) * SOUND_MAX_VOLUME;
    this.setLoopVolume(volume);
  }

  private checkPlayerCollision(startX: number, startY: number, endX: number, endY: number): void {
    if (this.damageCooldownMs > 0) return;

    const player = this.entityManager.getFirst('player');
    if (!player || player.isDestroyed) return;

    const gridPos = player.get(GridPositionComponent);
    if (gridPos?.currentLayer !== this.layer) return;

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

    const sm = player.get(StateMachineComponent);
    if (sm?.stateMachine.getCurrentKey() === 'push') {
      sm.stateMachine.enter('idle');
    }

    this.pushEntityFromBeam(playerTransform, collision, gridPos!.currentLayer, cx, cy, startX, startY, dist);
  }

  private pushEntityFromBeam(
    transform: TransformComponent,
    collision: CollisionComponent,
    layer: number,
    cx: number,
    cy: number,
    beamStartX: number,
    beamStartY: number,
    distFromBeam: number
  ): void {
    const perpX = -this.dirY;
    const perpY = this.dirX;
    const toEntityX = cx - beamStartX;
    const toEntityY = cy - beamStartY;
    const side = toEntityX * perpX + toEntityY * perpY;
    const pushDirX = side >= 0 ? perpX : -perpX;
    const pushDirY = side >= 0 ? perpY : -perpY;

    const clearancePx = BEAM_COLLISION_HALF_WIDTH_PX + collision.box.width / 2 + PUSHBACK_MARGIN_PX;
    const pushDistPx = clearancePx - distFromBeam;
    if (pushDistPx <= 0) return;

    const targetX = transform.x + pushDirX * pushDistPx;
    const targetY = transform.y + pushDirY * pushDistPx;
    const targetCell = this.grid.worldToCell(targetX, targetY);
    const cell = this.grid.getCell(targetCell.col, targetCell.row);

    if (!cell) return;
    if (this.grid.isWall(cell) || cell.properties.has('platform')) return;
    if (cell.layer !== layer) return;
    if (this.blockedAreaManager?.getBlockedCells().has(`${targetCell.col},${targetCell.row}`)) return;
    for (const occupant of cell.occupants) {
      if (occupant.get(GridCellBlocker)) return;
    }

    transform.x = targetX;
    transform.y = targetY;
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
            const burst = entity.get(BugBurstComponent);
            if (burst) burst.burst();
            SoundManager.getInstance().play('splatter');
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
