import type { IState } from '../../systems/state/IState';
import type { EntityManager } from '../../ecs/EntityManager';
import type { CollisionSystem } from '../../systems/CollisionSystem';
import type { Grid } from '../../systems/grid/Grid';
import type { LevelData } from '../../systems/level/LevelLoader';

export class InGameState implements IState {
  constructor(
    private readonly getEntityManager: () => EntityManager,
    private readonly getCollisionSystem: () => CollisionSystem,
    private readonly getGrid: () => Grid,
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
    this.getEntityManager().update(delta);

    // Check collisions
    this.getCollisionSystem().update(this.getEntityManager().getAll());

    // Render grid debug
    this.getGrid().render(this.getEntityManager(), this.getLevelData());
  }
}
