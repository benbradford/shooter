import type { IState } from '../../systems/state/IState';
import type { EntityManager } from '../../ecs/EntityManager';
import type { CollisionSystem } from '../../systems/CollisionSystem';
import type { Grid } from '../../systems/grid/Grid';
import type { LevelData } from '../../systems/level/LevelLoader';

export class InGameState implements IState {
  constructor(
    private readonly entityManager: EntityManager,
    private readonly collisionSystem: CollisionSystem,
    private readonly grid: Grid,
    private readonly getLevelData: () => LevelData
  ) {}

  onEnter(): void {
    // Setup when entering game state
  }

  onExit(): void {
    // Cleanup when leaving game state
  }

  onUpdate(delta: number): void {
    // Update all entities
    this.entityManager.update(delta);

    // Check collisions
    this.collisionSystem.update(this.entityManager.getAll());

    // Render grid debug
    this.grid.render(this.entityManager, this.getLevelData());
  }
}
