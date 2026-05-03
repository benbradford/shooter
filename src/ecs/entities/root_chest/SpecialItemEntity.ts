import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { GridReader } from '../../../systems/grid/Grid';
import type { EventManagerSystem } from '../../systems/EventManagerSystem';
import { Entity as EntityClass } from '../../Entity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { PulsingScaleComponent } from '../../components/visual/PulsingScaleComponent';
import { Depth } from '../../../constants/DepthConstants';

const PICKUP_DISTANCE_PX = 24;
const SPRITE_SIZE_RATIO = 0.5;
const PULSE_AMPLITUDE = 0.06;
const PULSE_FREQUENCY_HZ = 1;

class SpecialItemPickupComponent implements Component {
  entity!: Entity;

  constructor(
    private readonly playerEntity: Entity,
    private readonly itemType: string,
    private readonly eventManager: EventManagerSystem
  ) {}

  update(): void {
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const distance = Math.hypot(playerTransform.x - transform.x, playerTransform.y - transform.y);

    if (distance < PICKUP_DISTANCE_PX) {
      this.eventManager.raiseEvent(`special_pickup_${this.itemType}`);
      this.entity.destroy();
    }
  }
}

export type CreateSpecialItemProps = {
  readonly scene: Phaser.Scene;
  readonly x: number;
  readonly y: number;
  readonly grid: GridReader;
  readonly itemType: string;
  readonly parentEntityId: string;
  readonly playerEntity: Entity;
  readonly eventManager: EventManagerSystem;
};

export function createSpecialItemEntity(props: CreateSpecialItemProps): EntityClass {
  const { scene, x, y, grid, itemType, parentEntityId, playerEntity, eventManager } = props;
  const entity = new EntityClass(`pickup_${parentEntityId}_${itemType}`);
  entity.tags.add('special_item');

  const targetSize = grid.cellSize * SPRITE_SIZE_RATIO;
  const textureObj = scene.textures.get(itemType);
  const frame = textureObj.get(0);
  const maxDim = Math.max(frame.width, frame.height);
  const baseScale = targetSize / maxDim;

  const transform = entity.add(new TransformComponent(x, y, 0, baseScale));
  const sprite = entity.add(new SpriteComponent(scene, itemType, transform));
  sprite.sprite.setDepth(Depth.pickup);
  sprite.sprite.setAlpha(0);
  scene.tweens.add({ targets: sprite.sprite, alpha: 1, duration: 1000 });

  entity.add(new PulsingScaleComponent({
    baseScale,
    amplitude: PULSE_AMPLITUDE,
    frequency: PULSE_FREQUENCY_HZ,
  }));

  entity.add(new SpecialItemPickupComponent(playerEntity, itemType, eventManager));

  entity.setUpdateOrder([
    PulsingScaleComponent,
    TransformComponent,
    SpriteComponent,
    SpecialItemPickupComponent,
  ]);

  return entity;
}
