import { Entity } from '../ecs/Entity';
import { TransformComponent } from '../ecs/components/core/TransformComponent';
import { SpriteComponent } from '../ecs/components/core/SpriteComponent';
import { HealthComponent } from '../ecs/components/core/HealthComponent';
import { GridPositionComponent } from '../ecs/components/movement/GridPositionComponent';
import { GridCollisionComponent } from '../ecs/components/movement/GridCollisionComponent';
import { CollisionComponent } from '../ecs/components/combat/CollisionComponent';
import { HitFlashComponent } from '../ecs/components/visual/HitFlashComponent';
import { BugSpawnerComponent } from '../ecs/components/ai/BugSpawnerComponent';
import { BaseExplosionComponent } from '../ecs/components/visual/BaseExplosionComponent';
import { GridCellBlocker } from '../ecs/components/movement/GridCellBlocker';
import { BugBaseDifficultyComponent } from './BugBaseDifficultyComponent';
import { getBugBaseDifficultyConfig, type BugBaseDifficulty } from './BugBaseDifficulty';
import type { Grid } from '../utils/Grid';

const BASE_GRID_COLLISION_BOX = { offsetX: 0, offsetY: 0, width: 128, height: 128 };
const BASE_ENTITY_COLLISION_BOX = { offsetX: -64, offsetY: -64, width: 128, height: 128 };

export function createBugBaseEntity(
  scene: Phaser.Scene,
  col: number,
  row: number,
  grid: Grid,
  playerEntity: Entity,
  onSpawnBug: (col: number, row: number) => void,
  difficulty: BugBaseDifficulty = 'medium'
): Entity {
  const config = getBugBaseDifficultyConfig(difficulty);
  const entity = new Entity('bug_base');
  entity.tags.add('enemy');

  const worldPos = grid.cellToWorld(col, row);
  const x = worldPos.x + grid.cellSize / 2;
  const y = worldPos.y + grid.cellSize / 2;

  const transform = entity.add(new TransformComponent(x, y, 0, 1));

  const sprite = entity.add(new SpriteComponent(scene, 'bug_base', transform));
  sprite.sprite.setDisplaySize(grid.cellSize, grid.cellSize);
  sprite.sprite.setDepth(-50);

  entity.add(new GridPositionComponent(col, row, BASE_GRID_COLLISION_BOX));
  entity.add(new GridCollisionComponent(grid));
  entity.add(new GridCellBlocker());

  const health = entity.add(new HealthComponent({ maxHealth: config.baseHealth }));
  entity.add(new HitFlashComponent());
  entity.add(new BaseExplosionComponent(scene, grid.cellSize));
  entity.add(new BugSpawnerComponent(playerEntity, onSpawnBug, config.spawnIntervalMs, grid));
  entity.add(new BugBaseDifficultyComponent(difficulty));

  entity.add(new CollisionComponent({
    box: BASE_ENTITY_COLLISION_BOX,
    collidesWith: ['player_projectile'],
    onHit: (other) => {
      if (other.tags.has('player_projectile')) {
        health.takeDamage(10);

        const hitFlash = entity.get(HitFlashComponent);
        if (hitFlash) {
          hitFlash.flash(300);
        }

        const spawner = entity.get(BugSpawnerComponent);
        if (spawner) {
          spawner.activate();
        }

        if (health.getHealth() <= 0) {
          const explosion = entity.get(BaseExplosionComponent);
          if (explosion) {
            explosion.explode();
          }
          scene.time.delayedCall(100, () => entity.destroy());
        }

        scene.time.delayedCall(0, () => other.destroy());
      }
    }
  }));

  entity.setUpdateOrder([
    TransformComponent,
    SpriteComponent,
    GridPositionComponent,
    GridCollisionComponent,
    GridCellBlocker,
    BugSpawnerComponent,
    HitFlashComponent,
    BugBaseDifficultyComponent,
    CollisionComponent
  ]);

  return entity;
}
