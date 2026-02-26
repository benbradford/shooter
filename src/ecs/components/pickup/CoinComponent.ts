import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import { SpriteComponent } from '../core/SpriteComponent';
import { WorldStateManager } from '../../../systems/WorldStateManager';
import type { Grid } from '../../../systems/grid/Grid';

export type CoinComponentProps = {
  targetY: number;
  velocityX: number;
  velocityY: number;
  grid: Grid;
  playerEntity: Entity;
  coinSize: number;
}

const GRAVITY_PX_PER_SEC_SQ = 600;
const COLLECTION_DISTANCE_PX = 70;
const COLLECTION_DELAY_MS = 500;
const COIN_LIFETIME_MS = 15000;
const COIN_FADE_START_MS = 10000;
const FLY_TO_HUD_SPEED_PX_PER_SEC = 1200;
const FLY_TO_HUD_ACCELERATION = 2;

export const COIN_SPAWN_ANGLE_RANDOMNESS_RAD = 0.5;
export const COIN_SPAWN_MIN_SPEED_PX_PER_SEC = 120;
export const COIN_SPAWN_SPEED_RANGE_PX_PER_SEC = 100;
export const COIN_SPAWN_MIN_UPWARD_VELOCITY_PX_PER_SEC = 130;
export const COIN_SPAWN_UPWARD_VELOCITY_RANGE_PX_PER_SEC = 200;
export const COIN_SPAWN_TARGET_Y_OFFSET_PX = -10;
export const COIN_SPAWN_TARGET_Y_RANDOMNESS_PX = 20;
export const COIN_SPRITE_SCALE = 0.15;
export const COIN_SIZE_PX = 24;

export class CoinComponent implements Component {
  entity!: Entity;
  private readonly targetY: number;
  private velocityX: number;
  private velocityY: number;
  private readonly grid: Grid;
  private readonly playerEntity: Entity;
  private readonly coinSize: number;
  private hasLanded = false;
  private elapsedMs = 0;
  private flyingToHud = false;
  private flySpeed = FLY_TO_HUD_SPEED_PX_PER_SEC;
  private hudTargetX = 0;
  private hudTargetY = 0;
  private targetSetFrame = 0;

  constructor(props: CoinComponentProps) {
    this.targetY = props.targetY;
    this.velocityX = props.velocityX;
    this.velocityY = props.velocityY;
    this.grid = props.grid;
    this.playerEntity = props.playerEntity;
    this.coinSize = props.coinSize;
  }

  update(delta: number): void {
    this.elapsedMs += delta;
    const transform = this.entity.require(TransformComponent);
    const sprite = this.entity.require(SpriteComponent);
    const deltaInSec = delta / 1000;

    if (this.flyingToHud) {
      if (Date.now() - this.targetSetFrame < 100) {
        console.log('[Coin] Flying to:', { 
          target: `${this.hudTargetX},${this.hudTargetY}`,
          current: `${transform.x},${transform.y}`,
          elapsed: Date.now() - this.targetSetFrame
        });
      }
      
      const dx = this.hudTargetX - transform.x;
      const dy = this.hudTargetY - transform.y;
      const distance = Math.hypot(dx, dy);

      if (distance < 10) {
        this.entity.destroy();
        return;
      }

      this.flySpeed += FLY_TO_HUD_ACCELERATION * this.flySpeed * deltaInSec;
      const moveDistance = this.flySpeed * deltaInSec;

      transform.x += (dx / distance) * moveDistance;
      transform.y += (dy / distance) * moveDistance;
      return;
    }

    if (!this.hasLanded) {
      const nextX = transform.x + this.velocityX * deltaInSec;
      const nextY = transform.y + this.velocityY * deltaInSec;

      const halfCoin = this.coinSize / 2;

      const cellLeft = this.grid.getCell(
        Math.floor((nextX - halfCoin) / this.grid.cellSize),
        Math.floor(nextY / this.grid.cellSize)
      );
      const cellRight = this.grid.getCell(
        Math.floor((nextX + halfCoin) / this.grid.cellSize),
        Math.floor(nextY / this.grid.cellSize)
      );

      const isBlocked = (cell: ReturnType<typeof this.grid.getCell>): boolean => {
        if (!cell) return false;
        return cell.layer > 0 || cell.properties.has('wall') || cell.properties.has('platform') || cell.properties.has('blocked');
      };

      if (isBlocked(cellLeft) || isBlocked(cellRight)) {
        this.velocityX = 0;
      } else {
        transform.x = nextX;
      }

      const cellAbove = this.grid.getCell(
        Math.floor(transform.x / this.grid.cellSize),
        Math.floor((nextY - halfCoin) / this.grid.cellSize)
      );
      const cellBelow = this.grid.getCell(
        Math.floor(transform.x / this.grid.cellSize),
        Math.floor((nextY + halfCoin) / this.grid.cellSize)
      );

      if (this.velocityY < 0 && isBlocked(cellAbove)) {
        this.velocityY = 0;
      } else if (this.velocityY > 0 && isBlocked(cellBelow)) {
        this.hasLanded = true;
      } else {
        transform.y = nextY;
      }

      this.velocityY += GRAVITY_PX_PER_SEC_SQ * deltaInSec;

      if (transform.y >= this.targetY) {
        transform.y = this.targetY;
        this.hasLanded = true;
      }
    }

    if (this.elapsedMs >= COIN_LIFETIME_MS) {
      this.entity.destroy();
      return;
    }

    if (this.elapsedMs >= COIN_FADE_START_MS) {
      const fadeProgress = (this.elapsedMs - COIN_FADE_START_MS) / (COIN_LIFETIME_MS - COIN_FADE_START_MS);
      sprite.sprite.setAlpha(1 - fadeProgress);
    }

    if (this.elapsedMs >= COLLECTION_DELAY_MS) {
      const playerTransform = this.playerEntity.require(TransformComponent);
      const distance = Math.hypot(playerTransform.x - transform.x, playerTransform.y - transform.y);
      if (distance < COLLECTION_DISTANCE_PX) {
        const scene = sprite.sprite.scene;
        const camera = scene.cameras.main;
        const displayWidth = scene.scale.displaySize.width;
        const displayHeight = scene.scale.displaySize.height;

        const hudScreenX = displayWidth * 0.05;
        const hudScreenY = displayHeight * 0.05;
        this.hudTargetX = camera.scrollX + hudScreenX / camera.zoom;
        this.hudTargetY = camera.scrollY + hudScreenY / camera.zoom;
        this.targetSetFrame = Date.now();

        console.log('[Coin] Target set:', { 
          hudTargetX: this.hudTargetX, 
          hudTargetY: this.hudTargetY,
          displayWidth,
          displayHeight,
          scrollX: camera.scrollX,
          scrollY: camera.scrollY
        });

        this.flyingToHud = true;
        sprite.sprite.setAlpha(1);
      }
    }
  }

  onDestroy(): void {
    if (this.flyingToHud) {
      const worldState = WorldStateManager.getInstance();
      worldState.addCoins(1);
    }
  }
}
