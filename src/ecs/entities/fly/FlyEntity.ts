import { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { HealthComponent } from '../../components/core/HealthComponent';
import { CollisionComponent } from '../../components/combat/CollisionComponent';
import { ShadowComponent } from '../../components/visual/ShadowComponent';
import { HitFlashComponent } from '../../components/visual/HitFlashComponent';
import { DamageComponent } from '../../components/core/DamageComponent';
import { FlyBehaviorComponent } from '../../components/fly/FlyBehaviorComponent';
import { canPlayerHitEnemy } from '../../../systems/combat/LayerCollisionHelper';
import { createFlyAnimations, getFlyAnimKey } from './FlyAnimations';
import { Direction } from '../../../constants/Direction';
import type { Grid } from '../../../systems/grid/Grid';

export type CreateFlyProps = {
  scene: Phaser.Scene;
  col: number;
  row: number;
  grid: Grid;
  playerEntity: Entity;
  entityId: string;
};

const FLY_SCALE = 0.7;
const FLY_COLLISION_BOX = { offsetX: -16, offsetY: -16, width: 32, height: 32 };

export function createFlyEntity(props: CreateFlyProps): Entity {
  const { scene, col, row, grid, playerEntity, entityId } = props;

  createFlyAnimations(scene);

  const entity = new Entity(entityId);
  entity.tags.add('enemy');
  entity.tags.add('fly');

  const worldPos = grid.cellToWorld(col, row);
  const x = worldPos.x + grid.cellSize / 2;
  const y = worldPos.y + grid.cellSize / 2;

  const transform = entity.add(new TransformComponent(x, y, 0, FLY_SCALE));
  const sprite = entity.add(new SpriteComponent(scene, 'fly', transform));
  sprite.sprite.play(getFlyAnimKey(Direction.Down));

  entity.add(new HealthComponent({ maxHealth: 1 }));
  entity.add(new HitFlashComponent(0xffffff, null, true));

  const shadow = entity.add(new ShadowComponent(scene, { scale: 0.4, offsetX: 0, offsetY: 0 }));
  shadow.init();

  const flyBehavior = entity.add(new FlyBehaviorComponent({ playerEntity, startX: x, startY: y }));

  entity.add(new CollisionComponent({
    box: FLY_COLLISION_BOX,
    collidesWith: ['player_projectile'],
    onHit: (other) => {
      if (!flyBehavior.isVulnerable()) return;
      if (!canPlayerHitEnemy(playerEntity, entity, grid, other)) return;

      const dmg = other.get(DamageComponent);
      const health = entity.require(HealthComponent);
      health.takeDamage(dmg?.damage ?? 20);

      entity.require(HitFlashComponent).flash(300);

      if (health.getHealth() <= 0) {
        entity.destroy();
      }
    }
  }));

  entity.setUpdateOrder([
    TransformComponent,
    HitFlashComponent,
    SpriteComponent,
    ShadowComponent,
    FlyBehaviorComponent,
    CollisionComponent
  ]);

  return entity;
}
