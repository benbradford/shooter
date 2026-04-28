import type Phaser from 'phaser';
import type { Grid } from '../../../systems/grid/Grid';
import { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { HealthComponent } from '../../components/core/HealthComponent';
import { GridPositionComponent } from '../../components/movement/GridPositionComponent';
import { GridCollisionComponent } from '../../components/movement/GridCollisionComponent';
import { CollisionComponent } from '../../components/combat/CollisionComponent';
import { DamageComponent } from '../../components/core/DamageComponent';
import { ShadowComponent } from '../../components/visual/ShadowComponent';
import { HitFlashComponent } from '../../components/visual/HitFlashComponent';
import { TvFaceComponent } from './TvFaceComponent';
import { TvMonkBehaviorComponent } from './TvMonkBehaviorComponent';
import { Depth } from '../../../constants/DepthConstants';
import { Direction } from '../../../constants/Direction';

import type { EventManagerSystem } from '../../systems/EventManagerSystem';
import { createTvMonkAnimations, getTvMonkAnimKey } from './TvMonkAnimations';

const TV_MONK_HEALTH = 120;
const TV_MONK_SCALE = 1.3;
const GRID_COLLISION_BOX = { offsetX: 0, offsetY: 12, width: 40, height: 20 };
const ENTITY_COLLISION_BOX = { offsetX: -18, offsetY: -18, width: 36, height: 36 };

export type CreateTvMonkProps = {
  readonly scene: Phaser.Scene;
  readonly grid: Grid;
  readonly col: number;
  readonly row: number;
  readonly entityId: string;
  readonly playerEntity: Entity;
  readonly eventManager: EventManagerSystem;
};

export function createTvMonkEntity(props: CreateTvMonkProps): Entity {
  const { scene, grid, col, row, entityId, playerEntity, eventManager } = props;
  const worldPos = grid.cellToWorld(col, row);
  const x = worldPos.x + grid.cellSize / 2;
  const y = worldPos.y + grid.cellSize / 2;

  createTvMonkAnimations(scene);

  const entity = new Entity(entityId);
  entity.tags.add('enemy');
  entity.tags.add('interaction_active');

  const transform = entity.add(new TransformComponent(x, y, 0, TV_MONK_SCALE));
  const sprite = entity.add(new SpriteComponent(scene, 'tv_monk', transform));
  sprite.sprite.setDepth(Depth.enemy);

  const idleAnimKey = getTvMonkAnimKey('idle', Direction.Down);
  sprite.sprite.play(idleAnimKey);

  entity.add(new GridPositionComponent(col, row, GRID_COLLISION_BOX));
  entity.add(new GridCollisionComponent(grid));
  entity.add(new HealthComponent({ maxHealth: TV_MONK_HEALTH }));
  entity.add(new HitFlashComponent());

  entity.add(new CollisionComponent({
    box: ENTITY_COLLISION_BOX,
    collidesWith: ['player_projectile'],
    onHit: (other: Entity) => {
      const dmg = other.get(DamageComponent);
      const health = entity.get(HealthComponent);
      if (dmg && health && health.getHealth() > 0) {
        health.takeDamage(dmg.damage);
        const flash = entity.get(HitFlashComponent);
        flash?.flash(300);
        if (health.getHealth() <= 0) {
          // Remove collision and flash so monk can't be hit again
          const col = entity.get(CollisionComponent);
          if (col) entity.remove(CollisionComponent);
          const hf = entity.get(HitFlashComponent);
          if (hf) entity.remove(HitFlashComponent);

          // Stop face rendering — death anim is baked into spritesheet
          const face = entity.get(TvFaceComponent);
          face?.die();

          // Stop behavior (no more facing player)
          const beh = entity.get(TvMonkBehaviorComponent);
          if (beh) entity.remove(TvMonkBehaviorComponent);

          // Play falling animation on the original spritesheet
          const spr = entity.get(SpriteComponent);
          if (spr) {
            spr.sprite.setTexture('tv_monk');
            spr.sprite.clearTint();
            const deathKey = getTvMonkAnimKey('death', Direction.Down);
            spr.sprite.play(deathKey);
          }
        }
      }
    },
  }));

  const shadow = entity.add(new ShadowComponent(scene, { scale: 0.9, offsetX: 0, offsetY: 22 }));
  shadow.init();

  const tvFace = entity.add(new TvFaceComponent({ scene }));
  const behavior = entity.add(new TvMonkBehaviorComponent({ playerEntity, grid, eventManager }));

  entity.setUpdateOrder([
    TransformComponent,
    HitFlashComponent,
    SpriteComponent,
    GridPositionComponent,
    GridCollisionComponent,
    TvMonkBehaviorComponent,
    TvFaceComponent,
  ]);

  tvFace.init();
  behavior.init();

  return entity;
}
