import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { EntityManager } from '../../EntityManager';
import { TransformComponent } from '../core/TransformComponent';
import { createSmallMushroomEntity } from '../../entities/pickup/SmallMushroomEntity';

export type HealthDropOnDeathProps = {
  dropChance: number;
  scene: Phaser.Scene;
  playerEntity: Entity;
  entityManager: EntityManager;
}

export class HealthDropOnDeathComponent implements Component {
  entity!: Entity;
  private readonly dropChance: number;
  private readonly scene: Phaser.Scene;
  private readonly playerEntity: Entity;
  private readonly entityManager: EntityManager;

  constructor(props: HealthDropOnDeathProps) {
    this.dropChance = props.dropChance;
    this.scene = props.scene;
    this.playerEntity = props.playerEntity;
    this.entityManager = props.entityManager;
  }

  onDestroy(): void {
    if (Math.random() >= this.dropChance) return;

    const transform = this.entity.get(TransformComponent);
    if (!transform) return;

    this.entityManager.add(createSmallMushroomEntity({
      scene: this.scene,
      x: transform.x,
      y: transform.y,
      playerEntity: this.playerEntity
    }));
  }
}
