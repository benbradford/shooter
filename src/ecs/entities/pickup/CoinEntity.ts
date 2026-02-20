import { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { CoinComponent } from '../../components/pickup/CoinComponent';
import type { Grid } from '../../../systems/grid/Grid';

export type CreateCoinProps = {
  scene: Phaser.Scene;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  targetY: number;
  grid: Grid;
  playerEntity: Entity;
  scale: number;
  coinSize: number;
}

const COIN_SCALE = 0.2;
const COIN_SIZE_PX = 32;

export function createCoinEntity(props: CreateCoinProps): Entity {
  const { scene, x, y, velocityX, velocityY, targetY, grid, playerEntity, scale, coinSize } = props;
  
  const entity = new Entity('coin');
  entity.tags.add('coin');

  const transform = entity.add(new TransformComponent(x, y, 0, scale));
  entity.add(new SpriteComponent(scene, 'coin', transform));
  entity.add(new CoinComponent({ scene, targetY, velocityX, velocityY, grid, playerEntity, baseScale: scale, coinSize }));

  entity.setUpdateOrder([
    TransformComponent,
    SpriteComponent,
    CoinComponent
  ]);

  return entity;
}
