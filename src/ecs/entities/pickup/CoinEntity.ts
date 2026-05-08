import { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { CoinComponent, COIN_SPRITE_SCALE, COIN_SIZE_PX } from '../../components/pickup/CoinComponent';
import type { GridReader } from '../../../systems/grid/Grid';
import { SoundManager } from '../../../systems/SoundManager';
import { WorldStateManager } from '../../../systems/WorldStateManager';

export { COIN_SPRITE_SCALE, COIN_SIZE_PX };

export type CreateCoinProps = {
  scene: Phaser.Scene;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  targetY: number;
  grid: GridReader;
  playerEntity: Entity;
  scale: number;
  coinSize: number;
}

export function createCoinEntity(props: CreateCoinProps): Entity {
  const { scene, x, y, velocityX, velocityY, targetY, grid, playerEntity, scale, coinSize } = props;
  
  const entity = new Entity('coin');
  entity.tags.add('coin');

  const transform = entity.add(new TransformComponent(x, y, 0, scale));
  entity.add(new SpriteComponent(scene, 'coin', transform));
  entity.add(new CoinComponent({ targetY, velocityX, velocityY, grid, playerEntity, coinSize, soundManager: SoundManager.getInstance(), worldState: WorldStateManager.getInstance() }));

  entity.setUpdateOrder([
    TransformComponent,
    SpriteComponent,
    CoinComponent
  ]);

  return entity;
}
