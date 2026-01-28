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
import { DifficultyComponent } from '../ecs/components/ai/DifficultyComponent';
import { getBugBaseDifficultyConfig } from './BugBaseDifficulty';
import type { EnemyDifficulty } from '../constants/EnemyDifficulty';
import type { Grid } from '../utils/Grid';

export function createBugBaseEntity(
  scene: Phaser.Scene,
  col: number,
  row: number,
  grid: Grid,
  playerEntity: Entity,
  onSpawnBug: (col: number, row: number) => void,
  difficulty: EnemyDifficulty = 'medium'
): Entity {
  const BUG_BASE_COLLISION_SIZE = grid.cellSize * 0.75;
  const BASE_GRID_COLLISION_BOX = { offsetX: 0, offsetY: 0, width: BUG_BASE_COLLISION_SIZE, height: BUG_BASE_COLLISION_SIZE };
  const BASE_ENTITY_COLLISION_BOX = { offsetX: -BUG_BASE_COLLISION_SIZE / 2, offsetY: -BUG_BASE_COLLISION_SIZE / 2, width: BUG_BASE_COLLISION_SIZE, height: BUG_BASE_COLLISION_SIZE };

  const config = getBugBaseDifficultyConfig(difficulty);
  const entity = new Entity('bug_base');
  entity.tags.add('enemy');

  const worldPos = grid.cellToWorld(col, row);
  const spriteX = worldPos.x + grid.cellSize / 2;
  const spriteY = worldPos.y + grid.cellSize / 2;
  const collisionOffset = (grid.cellSize - BUG_BASE_COLLISION_SIZE) / 2;

  const scale = grid.cellSize / 153;
  const transform = entity.add(new TransformComponent(spriteX, spriteY, 0, scale));

  const sprite = entity.add(new SpriteComponent(scene, 'bug_base', transform));
  sprite.sprite.setOrigin(0.5 - collisionOffset / grid.cellSize, 0.5 - collisionOffset / grid.cellSize);
  sprite.sprite.setDepth(-50);

  entity.add(new GridPositionComponent(col, row, BASE_GRID_COLLISION_BOX));
  entity.add(new GridCollisionComponent(grid));
  entity.add(new GridCellBlocker());

  const health = entity.add(new HealthComponent({ maxHealth: config.baseHealth }));
  entity.add(new HitFlashComponent());
  entity.add(new BaseExplosionComponent(scene, grid.cellSize));
  entity.add(new BugSpawnerComponent(playerEntity, onSpawnBug, config.spawnIntervalMs, grid));
  entity.add(new DifficultyComponent<EnemyDifficulty>(difficulty));

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

        const spawner = entity.require(BugSpawnerComponent);
        spawner.activate();

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
    DifficultyComponent,
    CollisionComponent
  ]);

  return entity;
}
