import { Entity } from '../ecs/Entity';
import { EnemySpawnComponent } from '../ecs/components/spawner/EnemySpawnComponent';
import type { EventManagerSystem } from '../ecs/systems/EventManagerSystem';

export type CreateEnemySpawnerProps = {
  eventManager: EventManagerSystem;
  eventName: string;
  enemyIds: string[];
  spawnDelayMs: number;
  onSpawnEnemy: (enemyId: string) => void;
};

export function createEnemySpawnerEntity(props: CreateEnemySpawnerProps): Entity {
  const entity = new Entity('enemy_spawner');

  entity.add(new EnemySpawnComponent({
    eventManager: props.eventManager,
    eventName: props.eventName,
    enemyIds: props.enemyIds,
    spawnDelayMs: props.spawnDelayMs,
    onSpawnEnemy: props.onSpawnEnemy
  }));

  entity.setUpdateOrder([
    EnemySpawnComponent
  ]);

  return entity;
}
