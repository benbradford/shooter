import { Entity } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { GridPositionComponent } from '../../components/movement/GridPositionComponent';
import { GridCollisionComponent } from '../../components/movement/GridCollisionComponent';
import { HealthComponent } from '../../components/core/HealthComponent';
import { CollisionComponent } from '../../components/combat/CollisionComponent';
import { StateMachineComponent } from '../../components/core/StateMachineComponent';
import { DifficultyComponent } from '../../components/ai/DifficultyComponent';
import { ShadowComponent } from '../../components/visual/ShadowComponent';
import { HitFlashComponent } from '../../components/visual/HitFlashComponent';
import { StateMachine } from '../../../systems/state/StateMachine';
import { Depth } from '../../../constants/DepthConstants';
import { Direction } from '../../../constants/Direction';
import type { Grid } from '../../../systems/grid/Grid';
import { type PumaDifficulty, getPumaDifficultyConfig } from './PumaDifficulty';
import { createPumaAnimations } from './PumaAnimations';
import { PumaRestingState } from './PumaRestingState';
import { PumaStandUpState } from './PumaStandUpState';
import { PumaThreateningState } from './PumaThreateningState';
import { PumaChasingState } from './PumaChasingState';
import { PumaJumpingState } from './PumaJumpingState';
import { PumaRecoverState } from './PumaRecoverState';
import { PumaDeathState } from './PumaDeathState';

export type CreatePumaProps = {
  scene: Phaser.Scene;
  col: number;
  row: number;
  grid: Grid;
  playerEntity: Entity;
  difficulty: PumaDifficulty;
  startDirection: Direction;
  entityId: string;
}

const PUMA_SCALE = 1.5;
const PUMA_GRID_COLLISION_BOX = { offsetX: 0, offsetY: 16, width: 32, height: 16 };
const PUMA_ENTITY_COLLISION_BOX = { offsetX: -12, offsetY: -12, width: 48, height: 48 };

export function createPumaEntity(props: CreatePumaProps): Entity {
  const { scene, col, row, grid, playerEntity, difficulty, startDirection, entityId } = props;

  createPumaAnimations(scene);

  const config = getPumaDifficultyConfig(difficulty);
  const entity = new Entity(entityId);
  entity.tags.add('enemy');
  entity.tags.add('puma');

  const worldPos = grid.cellToWorld(col, row);
  const x = worldPos.x + grid.cellSize / 2;
  const y = worldPos.y + grid.cellSize / 2;

  const transform = entity.add(new TransformComponent(x, y, 0, PUMA_SCALE));
  const sprite = entity.add(new SpriteComponent(scene, 'puma', transform));
  sprite.sprite.setDepth(Depth.enemy);

  entity.add(new GridPositionComponent(col, row, PUMA_GRID_COLLISION_BOX));
  entity.add(new GridCollisionComponent(grid));
  entity.add(new HealthComponent({ maxHealth: config.health }));
  entity.add(new HitFlashComponent());
  entity.add(new DifficultyComponent(difficulty));

  const shadow = entity.add(new ShadowComponent(scene, { scale: 1.5, offsetX: 0, offsetY: 10 }));
  shadow.init();

  const stateMachine = new StateMachine<void>({
    resting: new PumaRestingState(entity, playerEntity, grid, config, startDirection),
    standup: new PumaStandUpState(entity, playerEntity),
    threatening: new PumaThreateningState(entity, playerEntity, config),
    chasing: new PumaChasingState(entity, playerEntity, grid, config),
    jumping: new PumaJumpingState(entity, playerEntity, grid, config),
    recover: new PumaRecoverState(entity, playerEntity),
    death: new PumaDeathState(entity, scene)
  }, 'resting');

  entity.add(new StateMachineComponent(stateMachine));

  entity.add(new CollisionComponent({
    box: PUMA_ENTITY_COLLISION_BOX,
    collidesWith: ['player_projectile'],
    onHit: (other) => {
      if (other.tags.has('player_projectile')) {
        const health = entity.get(HealthComponent);
        if (health && health.getHealth() > 0) {
          stateMachine.enter('death');
        }
        scene.time.delayedCall(0, () => other.destroy());
      }
    }
  }));

  entity.setUpdateOrder([
    TransformComponent,
    HitFlashComponent,
    SpriteComponent,
    ShadowComponent,
    GridPositionComponent,
    GridCollisionComponent,
    StateMachineComponent,
    CollisionComponent
  ]);

  return entity;
}
