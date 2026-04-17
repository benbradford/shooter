import type Phaser from 'phaser';
import type { Entity } from '../ecs/Entity';
import type { EntityManager } from '../ecs/EntityManager';
import { createCompanionEntity } from '../ecs/entities/companion/CompanionEntity';
import { TransformComponent } from '../ecs/components/core/TransformComponent';
import { WorldStateManager } from './WorldStateManager';

const COMPANION_FLAG = 'hasCompanion';

export class CompanionManager {
  private static instance: CompanionManager | null = null;
  private companionEntity: Entity | null = null;

  private constructor() {}

  static getInstance(): CompanionManager {
    if (!CompanionManager.instance) {
      CompanionManager.instance = new CompanionManager();
    }
    return CompanionManager.instance;
  }

  initialize(scene: Phaser.Scene, entityManager: EntityManager, playerEntity: Entity): void {
    this.destroy();

    const worldState = WorldStateManager.getInstance();
    if (worldState.getFlag(COMPANION_FLAG) !== 'true') return;

    const pt = playerEntity.require(TransformComponent);
    this.companionEntity = createCompanionEntity({
      scene,
      playerEntity,
      startX: pt.x + 32,
      startY: pt.y - 48,
    });
    entityManager.add(this.companionEntity);
  }

  destroy(): void {
    if (this.companionEntity) {
      this.companionEntity.destroy();
      this.companionEntity = null;
    }
  }
}
