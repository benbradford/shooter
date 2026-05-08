import { Entity } from '../../Entity';
import { Depth } from '../../../constants/DepthConstants';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { CollisionComponent } from '../../components/combat/CollisionComponent';
import { LeverComponent, type LeverState } from '../../components/lever/LeverComponent';
import type { GridReader } from '../../../systems/grid/Grid';
import type { EventManagerSystem } from '../../systems/EventManagerSystem';
import { WorldStateManager } from '../../../systems/WorldStateManager';

export type CreateLeverProps = {
  scene: Phaser.Scene;
  col: number;
  row: number;
  grid: GridReader;
  entityId: string;
  eventToRaise: string;
  startState: LeverState;
  oneShot: boolean;
  eventManager: EventManagerSystem;
};

export function createLeverEntity(props: CreateLeverProps): Entity {
  const { scene, col, row, grid, entityId, eventToRaise, startState, oneShot, eventManager } = props;
  const entity = new Entity(entityId);
  entity.tags.add('lever');

  const worldPos = grid.cellToWorld(col, row);
  const x = worldPos.x + grid.cellSize / 2;
  const y = worldPos.y + grid.cellSize / 2;

  const textureObj = scene.textures.get('lever');
  const frame = textureObj.get(0);
  const maxDim = Math.max(frame.width, frame.height);
  const scale = grid.cellSize / maxDim;

  const transform = entity.add(new TransformComponent(x, y, 0, scale));
  const sprite = entity.add(new SpriteComponent(scene, 'lever', transform));
  sprite.sprite.setDepth(Depth.breakable);

  const lever = entity.add(new LeverComponent({ entityId, eventToRaise, eventManager, startState, oneShot, worldState: WorldStateManager.getInstance() }));
  lever.init();

  const COLLISION_SIZE = grid.cellSize;
  const handledPunches = new Set<string>();
  entity.add(new CollisionComponent({
    box: { offsetX: -COLLISION_SIZE / 2, offsetY: -COLLISION_SIZE / 2, width: COLLISION_SIZE, height: COLLISION_SIZE },
    collidesWith: ['player_projectile'],
    onHit: (other) => {
      if (other.tags.has('player_projectile') && !handledPunches.has(other.id)) {
        handledPunches.add(other.id);
        lever.activate();
      }
    }
  }));

  entity.setUpdateOrder([
    TransformComponent,
    SpriteComponent,
    CollisionComponent,
  ]);

  return entity;
}
