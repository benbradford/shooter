import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import { SpriteComponent } from '../core/SpriteComponent';
import type { Grid } from '../../../systems/grid/Grid';

export type CoinComponentProps = {
  targetY: number;
  velocityX: number;
  velocityY: number;
  grid: Grid;
  playerEntity: Entity;
  coinSize: number;
}

const GRAVITY_PX_PER_SEC_SQ = 400;
const COLLECTION_DISTANCE_PX = 40;
const COLLECTION_DELAY_MS = 500;
const COIN_LIFETIME_MS = 8000;
const COIN_FADE_START_MS = 4000;

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

      const cellBelow = this.grid.getCell(
        Math.floor(transform.x / this.grid.cellSize),
        Math.floor((nextY + halfCoin) / this.grid.cellSize)
      );

      if (isBlocked(cellBelow)) {
        this.hasLanded = true;
      } else {
        transform.y = nextY;
        this.velocityY += GRAVITY_PX_PER_SEC_SQ * deltaInSec;

        if (transform.y >= this.targetY) {
          transform.y = this.targetY;
          this.hasLanded = true;
        }
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
        this.entity.destroy();
      }
    }
  }
}
