import { Entity } from '../../Entity';
import type { EntityManager } from '../../EntityManager';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { HealthComponent } from '../../components/core/HealthComponent';
import { GridPositionComponent } from '../../components/movement/GridPositionComponent';
import { GridCollisionComponent } from '../../components/movement/GridCollisionComponent';
import { CollisionComponent } from '../../components/combat/CollisionComponent';
import { HitFlashComponent } from '../../components/visual/HitFlashComponent';
import { BugSpawnerComponent } from '../../components/ai/BugSpawnerComponent';
import { BaseExplosionComponent } from '../../components/visual/BaseExplosionComponent';
import { BaseSpawnComponent } from '../../components/visual/BaseSpawnComponent';
import { GridCellBlocker } from '../../components/movement/GridCellBlocker';
import { DifficultyComponent } from '../../components/ai/DifficultyComponent';
import { getBugBaseDifficultyConfig } from './BugBaseDifficulty';
import type { EnemyDifficulty } from '../../../constants/EnemyDifficulty';
import type { Grid } from '../../../systems/grid/Grid';

export type CreateBugBaseProps = {
  scene: Phaser.Scene;
  col: number;
  row: number;
  grid: Grid;
  playerEntity: Entity;
  onSpawnBug: (col: number, row: number) => void;
  difficulty: EnemyDifficulty;
  entityId: string;
  entityManager: EntityManager;
}

export function createBugBaseEntity(props: CreateBugBaseProps): Entity {
  const { scene, col, row, grid, playerEntity, onSpawnBug, difficulty, entityId, entityManager } = props;
  const BUG_BASE_COLLISION_SIZE = grid.cellSize * 0.75;
  const BASE_GRID_COLLISION_BOX = { offsetX: 0, offsetY: 0, width: BUG_BASE_COLLISION_SIZE, height: BUG_BASE_COLLISION_SIZE };
  const BASE_ENTITY_COLLISION_BOX = { offsetX: -BUG_BASE_COLLISION_SIZE / 2, offsetY: -BUG_BASE_COLLISION_SIZE / 2, width: BUG_BASE_COLLISION_SIZE, height: BUG_BASE_COLLISION_SIZE };

  const config = getBugBaseDifficultyConfig(difficulty);
  const entity = new Entity(entityId);
  entity.tags.add('enemy');

  const worldPos = grid.cellToWorld(col, row);
  const spriteX = worldPos.x + grid.cellSize / 2;
  const spriteY = worldPos.y + grid.cellSize / 2;

  const scale = (grid.cellSize / 153) * 1.2;
  const transform = entity.add(new TransformComponent(spriteX, spriteY, 0, 0));

  const sprite = entity.add(new SpriteComponent(scene, 'bug_base', transform));
  sprite.sprite.setOrigin(0.5, 0.5);
  sprite.sprite.setDepth(-50);
  sprite.sprite.setAlpha(0);

  entity.add(new GridPositionComponent(col, row, BASE_GRID_COLLISION_BOX));
  entity.add(new GridCollisionComponent(grid));
  entity.add(new GridCellBlocker());

  const health = entity.add(new HealthComponent({ maxHealth: config.baseHealth }));
  entity.add(new HitFlashComponent());
  entity.add(new BaseExplosionComponent({ scene, grid, col, row, entityManager }));
  entity.add(new BaseSpawnComponent(scene, playerEntity, grid.cellSize, scale * 0.3));
  entity.add(new BugSpawnerComponent(playerEntity, onSpawnBug, config.spawnIntervalMs, grid));
  entity.add(new DifficultyComponent<EnemyDifficulty>(difficulty));

  entity.add(new CollisionComponent({
    box: BASE_ENTITY_COLLISION_BOX,
    collidesWith: ['player_projectile'],
    onHit: (other) => {
      if (other.tags.has('player_projectile')) {
        const spawner = entity.require(BugSpawnerComponent);
        if (!spawner.isFullySpawned()) {
          return;
        }

        if (health.getHealth() <= 0) {
          return;
        }

        health.takeDamage(10);

        const hitFlash = entity.get(HitFlashComponent);
        if (hitFlash) {
          hitFlash.flash(300);
        }

        spawner.activate();

        if (health.getHealth() <= 0) {
          const explosion = entity.get(BaseExplosionComponent);
          if (explosion) {
            explosion.explode();
          }

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
    BaseSpawnComponent,
    BugSpawnerComponent,
    HitFlashComponent,
    BaseExplosionComponent,
    DifficultyComponent,
    CollisionComponent
  ]);

  return entity;
}
