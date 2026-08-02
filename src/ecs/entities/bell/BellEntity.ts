import { Entity } from '../../Entity';
import { Depth } from '../../../constants/DepthConstants';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { CollisionComponent } from '../../components/combat/CollisionComponent';
import { BellComponent } from './BellComponent';
import type { GridReader } from '../../../systems/grid/Grid';
import type { EventManagerSystem } from '../../systems/EventManagerSystem';
import type { EntityManager } from '../../EntityManager';
import { WorldStateManager } from '../../../systems/WorldStateManager';
import type GameScene from '../../../scenes/GameScene';

export type CreateBellProps = {
  scene: GameScene;
  col: number;
  row: number;
  grid: GridReader;
  entityId: string;
  eventManager: EventManagerSystem;
  requiresAll?: boolean;
  entityManager?: EntityManager;
};

const BELL_SCALE = 0.1;
const BELL_OFFSET_Y_PX = -33;
const SHADOW_OFFSET_Y_PX = 60;

export function createBellEntity(props: CreateBellProps): Entity {
  const { scene, col, row, grid, entityId, eventManager } = props;
  const entity = new Entity(entityId);
  entity.tags.add('bell');

  const worldPos = grid.cellToWorld(col, row);
  const x = worldPos.x + grid.cellSize / 2;
  const y = worldPos.y + grid.cellSize / 2;

  const transform = entity.add(new TransformComponent(x, y, 0, BELL_SCALE));

  const visualY = y + BELL_OFFSET_Y_PX;

  const shadowSprite = scene.add.image(x, visualY + SHADOW_OFFSET_Y_PX, 'shadow');
  shadowSprite.setScale(1.2);
  shadowSprite.setAlpha(0.5);
  shadowSprite.setDepth(Depth.shadow);

  const barSprite = scene.add.image(x, visualY, 'bell_bar');
  barSprite.setScale(BELL_SCALE);
  barSprite.setDepth(Depth.bell);

  const bodySprite = scene.add.image(x, visualY + 8, 'bell_body');
  bodySprite.setScale(BELL_SCALE);
  bodySprite.setDepth(Depth.bell);
  bodySprite.setOrigin(0.5, 0.1);

  const spriteComp = entity.add(new SpriteComponent(scene, 'bell_bar', transform));
  spriteComp.sprite.setVisible(false);

  const levelName = scene.getCurrentLevelName();
  const eventName = `${levelName}_${entityId}_rung`;
  const alreadyRung = WorldStateManager.getInstance().isFlagTrue(eventName);

  const bell = entity.add(new BellComponent({
    scene,
    barSprite,
    bodySprite,
    shadowSprite,
    eventManager,
    eventName,
    alreadyRung,
    visualOffsetY: BELL_OFFSET_Y_PX,
    shadowOffsetY: SHADOW_OFFSET_Y_PX,
    requiresAll: props.requiresAll,
    entityManager: props.entityManager,
  }));

  if (!alreadyRung) {
    const COLLISION_SIZE_PX = grid.cellSize;
    const handledPunches = new Set<string>();
    entity.add(new CollisionComponent({
      box: { offsetX: -COLLISION_SIZE_PX / 2, offsetY: -COLLISION_SIZE_PX / 2, width: COLLISION_SIZE_PX, height: COLLISION_SIZE_PX },
      collidesWith: ['player_projectile'],
      onHit: (other) => {
        if (other.tags.has('player_projectile') && !handledPunches.has(other.id)) {
          handledPunches.add(other.id);
          bell.ring();
        }
      }
    }));
  }

  const updateOrder: Array<new (...args: never[]) => import('../../Component').Component> = [TransformComponent, SpriteComponent, BellComponent];
  if (!alreadyRung) updateOrder.push(CollisionComponent);
  entity.setUpdateOrder(updateOrder);

  return entity;
}
