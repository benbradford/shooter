import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { EntityManager } from '../../EntityManager';
import type { GridReader } from '../../../systems/grid/Grid';
import type { EventManagerSystem } from '../../systems/EventManagerSystem';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { GridPositionComponent } from '../../components/movement/GridPositionComponent';
import { createSpecialItemEntity } from './SpecialItemEntity';
import { createOpenedRootChestEntity } from './OpenedRootChestEntity';
import { WorldStateManager } from '../../../systems/WorldStateManager';

const CHEST_HEALTH = 60;
const HIT_FLASH_DURATION_MS = 300;
const SHAKE_AMOUNT_PX = 3;
const SHAKE_DURATION_MS = 100;

// Death sequence timings
const CRACKING_DURATION_MS = 400;
const BREAKING_DURATION_MS = 200;
const OPEN_GLOW_DURATION_MS = 200;
const OPEN_PARTICLES_DURATION_MS = 200;

// Debris shard constants
const SHARD_FADE_DURATION_MS = 800;
const SHARD_EXPLOSION_SPEED_PX_PER_SEC = 40;
const SHARD_INITIAL_UPWARD_VELOCITY_PX_PER_SEC = 50;
const SHARD_GRAVITY_PX_PER_SEC_SQ = 150;
const SHARD_ROTATION_SPEED_DEG_PER_SEC = 120;
const SHARD_GRID_SIZE = 3;

type ChestState = 'idle' | 'hit_flash' | 'death_cracking' | 'death_breaking' | 'death_open_glow' | 'death_open_particles' | 'dead';

type FrameInfo = { readonly x: number; readonly y: number; readonly width: number; readonly height: number };

const FRAMES: Record<string, FrameInfo> = {
  chest_closed: { x: 182, y: 175, width: 384, height: 264 },
  chest_cracking: { x: 570, y: 172, width: 387, height: 268 },
  chest_breaking: { x: 1011, y: 172, width: 434, height: 271 },
  chest_open_glow: { x: 169, y: 607, width: 420, height: 248 },
  chest_open_particles: { x: 587, y: 604, width: 386, height: 252 },
  chest_empty: { x: 1031, y: 716, width: 410, height: 140 },
};

export type RootChestComponentProps = {
  readonly scene: Phaser.Scene;
  readonly grid: GridReader;
  readonly specialItem: string;
  readonly entityManager: EntityManager;
  readonly eventManager: EventManagerSystem;
  readonly playerEntity: Entity;
};

export class RootChestComponent implements Component {
  entity!: Entity;
  private health = CHEST_HEALTH;
  private state: ChestState = 'idle';
  private stateTimerMs = 0;
  private readonly scene: Phaser.Scene;
  private readonly grid: GridReader;
  private readonly specialItem: string;
  private readonly entityManager: EntityManager;
  private readonly eventManager: EventManagerSystem;
  private readonly playerEntity: Entity;

  constructor(props: RootChestComponentProps) {
    this.scene = props.scene;
    this.grid = props.grid;
    this.specialItem = props.specialItem;
    this.entityManager = props.entityManager;
    this.eventManager = props.eventManager;
    this.playerEntity = props.playerEntity;
  }

  init(): void {
    this.ensureFrames();
    this.setFrame('chest_closed');
  }

  takeDamage(amount: number): void {
    if (this.state !== 'idle' && this.state !== 'hit_flash') return;
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.startDeathSequence();
    } else {
      this.spawnSingleShard();
      this.shakeSprite();
      this.state = 'hit_flash';
      this.stateTimerMs = 0;
      this.setFrame('chest_cracking');
    }
  }

  update(delta: number): void {
    if (this.state === 'idle' || this.state === 'dead') return;

    this.stateTimerMs += delta;

    if (this.state === 'hit_flash' && this.stateTimerMs >= HIT_FLASH_DURATION_MS) {
      this.setFrame('chest_closed');
      this.state = 'idle';
      return;
    }

    if (this.state === 'death_cracking' && this.stateTimerMs >= CRACKING_DURATION_MS) {
      this.setFrame('chest_breaking');
      this.state = 'death_breaking';
      this.stateTimerMs = 0;
      return;
    }

    if (this.state === 'death_breaking' && this.stateTimerMs >= BREAKING_DURATION_MS) {
      this.setFrame('chest_open_glow');
      this.state = 'death_open_glow';
      this.stateTimerMs = 0;
      return;
    }

    if (this.state === 'death_open_glow' && this.stateTimerMs >= OPEN_GLOW_DURATION_MS) {
      this.setFrame('chest_open_particles');
      this.state = 'death_open_particles';
      this.stateTimerMs = 0;
      return;
    }

    if (this.state === 'death_open_particles' && this.stateTimerMs >= OPEN_PARTICLES_DURATION_MS) {
      this.setFrame('chest_empty');
      this.state = 'dead';
      this.eventManager.raiseEvent(`${this.entity.id}_destroyed`);
      this.spawnOpenedChest();
      this.entity.destroy();
      return;
    }
  }

  private startDeathSequence(): void {
    this.setFrame('chest_cracking');
    this.state = 'death_cracking';
    this.stateTimerMs = 0;
    this.spawnSpecialItem();
  }

  private spawnSpecialItem(): void {
    const transform = this.entity.require(TransformComponent);
    const item = createSpecialItemEntity({
      scene: this.scene,
      x: transform.x,
      y: transform.y,
      grid: this.grid,
      itemType: this.specialItem,
      parentEntityId: this.entity.id,
      playerEntity: this.playerEntity,
      eventManager: this.eventManager,
    });
    this.entityManager.add(item);
  }

  private spawnOpenedChest(): void {
    const gridPos = this.entity.require(GridPositionComponent);
    const openedId = `${this.entity.id}_opened`;
    const openedEntity = createOpenedRootChestEntity({
      scene: this.scene,
      col: gridPos.currentCell.col,
      row: gridPos.currentCell.row,
      grid: this.grid,
      entityId: openedId,
    });
    openedEntity.levelName = this.entity.levelName;
    this.entityManager.add(openedEntity);

    if (this.entity.levelName) {
      const worldState = WorldStateManager.getInstance();
      worldState.addLiveEntity(this.entity.levelName, openedId);
    }
  }

  private ensureFrames(): void {
    const texture = this.scene.textures.get('roots_chest');
    for (const [name, info] of Object.entries(FRAMES)) {
      const frameName = `rc_${name}`;
      if (!texture.has(frameName)) {
        texture.add(frameName, 0, info.x, info.y, info.width, info.height);
      }
    }
  }

  private setFrame(frameName: string): void {
    const sprite = this.entity.get(SpriteComponent);
    if (sprite) {
      sprite.sprite.setFrame(`rc_${frameName}`);
      // chest_empty is much shorter — shift down to align with ground
      if (frameName === 'chest_empty') {
        const EMPTY_OFFSET_Y_PX = 13;
        sprite.visualOffsetYPx = EMPTY_OFFSET_Y_PX;
      } else {
        sprite.visualOffsetYPx = 0;
      }
    }
  }

  private shakeSprite(): void {
    const transform = this.entity.require(TransformComponent);
    const originalX = transform.x;
    this.scene.tweens.add({
      targets: transform,
      x: originalX + SHAKE_AMOUNT_PX,
      duration: SHAKE_DURATION_MS / 4,
      yoyo: true,
      repeat: 1,
      onComplete: () => { transform.x = originalX; }
    });
  }

  private spawnSingleShard(): void {
    const transform = this.entity.require(TransformComponent);
    const sprite = this.entity.require(SpriteComponent);

    const frame = sprite.sprite.frame;
    const pieceWidth = frame.width / SHARD_GRID_SIZE;
    const pieceHeight = frame.height / SHARD_GRID_SIZE;
    const scale = sprite.sprite.scaleX;

    const col = Math.floor(Math.random() * SHARD_GRID_SIZE);
    const row = Math.floor(Math.random() * SHARD_GRID_SIZE);
    const cropX = frame.cutX + col * pieceWidth;
    const cropY = frame.cutY + row * pieceHeight;

    const shard = this.scene.add.sprite(transform.x + (col - 1), transform.y + (row - 1), 'roots_chest');
    shard.setCrop(cropX, cropY, pieceWidth, pieceHeight);
    shard.setOrigin(0.5, 0.5);
    shard.setScale(scale);
    shard.setDepth(sprite.sprite.depth);

    const baseAngle = Math.atan2(row - 1, col - 1);
    const finalAngle = baseAngle + (Math.random() - 0.5) * (Math.PI / 4);
    const velocityX = Math.cos(finalAngle) * SHARD_EXPLOSION_SPEED_PX_PER_SEC;
    const velocityY = Math.sin(finalAngle) * SHARD_EXPLOSION_SPEED_PX_PER_SEC;
    const rotationDir = col > 1 ? 1 : col < 1 ? -1 : 0;
    const rotationSpeed = rotationDir * SHARD_ROTATION_SPEED_DEG_PER_SEC;

    const startTime = this.scene.time.now;
    const startX = shard.x;
    const startY = shard.y;
    const maxY = transform.y + (pieceHeight * scale) / 2;

    const updateShard = (): void => {
      const elapsed = this.scene.time.now - startTime;
      if (elapsed >= SHARD_FADE_DURATION_MS) { shard.destroy(); return; }
      const t = elapsed / 1000;
      shard.x = startX + velocityX * t;
      shard.y = Math.min(startY + velocityY * t - SHARD_INITIAL_UPWARD_VELOCITY_PX_PER_SEC * t + (SHARD_GRAVITY_PX_PER_SEC_SQ * t * t) / 2, maxY);
      shard.angle = rotationSpeed * t;
      shard.alpha = 1 - (elapsed / SHARD_FADE_DURATION_MS);
    };

    this.scene.events.on('update', updateShard);
    this.scene.time.delayedCall(SHARD_FADE_DURATION_MS, () => {
      this.scene.events.off('update', updateShard);
    });
  }
}
