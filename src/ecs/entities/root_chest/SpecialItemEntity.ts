import type { Component } from '../../Component';
import { Entity } from '../../Entity';
import type { GridReader } from '../../../systems/grid/Grid';
import type { EventManagerSystem } from '../../systems/EventManagerSystem';
import { TransformComponent } from '../../components/core/TransformComponent';
import { SpriteComponent } from '../../components/core/SpriteComponent';
import { GridPositionComponent } from '../../components/movement/GridPositionComponent';
import { PulsingScaleComponent } from '../../components/visual/PulsingScaleComponent';
import { WorldStateManager } from '../../../systems/WorldStateManager';
import { Depth } from '../../../constants/DepthConstants';

const PICKUP_DISTANCE_PX = 48;
const PICKUP_DELAY_MS = 1000;
const SPRITE_SIZE_RATIO = 0.75;
const PULSE_AMPLITUDE = 0.07;
const PULSE_FREQUENCY_HZ = 1.3;

class SpecialItemPickupComponent implements Component {
  entity!: Entity;
  private elapsedMs = 0;

  constructor(
    private readonly playerEntity: Entity,
    private readonly itemType: string,
    private readonly parentEntityId: string,
    private readonly eventManager: EventManagerSystem
  ) {}

  update(delta: number): void {
    this.elapsedMs += delta;
    if (this.elapsedMs < PICKUP_DELAY_MS) return;

    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const gridPos = this.playerEntity.get(GridPositionComponent);
    const box = gridPos?.collisionBox;
    const feetX = playerTransform.x + (box ? box.offsetX + box.width / 2 : 0);
    const feetY = playerTransform.y + (box ? box.offsetY + box.height : 0);
    const distance = Math.hypot(feetX - transform.x, feetY - transform.y);

    if (distance < PICKUP_DISTANCE_PX) {
      this.eventManager.raiseEvent(`special_pickup_${this.itemType}`);
      WorldStateManager.getInstance().setFlag(`${this.parentEntityId}_collected`, 'true');
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

export function createSpecialItemEntity(props: CreateSpecialItemProps): Entity {
  const { scene, x, y, grid, itemType, parentEntityId, playerEntity, eventManager } = props;
  const entity = new Entity(`pickup_${parentEntityId}_${itemType}`);
  entity.tags.add('special_item');

  const targetSize = grid.cellSize * SPRITE_SIZE_RATIO;
  const textureObj = scene.textures.get(itemType);
  const frame = textureObj.get(0);
  const maxDim = Math.max(frame.width, frame.height);
  const baseScale = targetSize / maxDim;

  const transform = entity.add(new TransformComponent(x, y, 0, baseScale));
  const sprite = entity.add(new SpriteComponent(scene, itemType, transform));
  sprite.sprite.setDepth(Depth.specialItem);
  sprite.sprite.setAlpha(0);
  scene.tweens.add({ targets: sprite.sprite, alpha: 1, duration: 1000 });

  entity.add(new PulsingScaleComponent({
    baseScale,
    amplitude: PULSE_AMPLITUDE,
    frequency: PULSE_FREQUENCY_HZ,
  }));

  entity.add(new SpecialItemPickupComponent(playerEntity, itemType, parentEntityId, eventManager));

  entity.setUpdateOrder([
    PulsingScaleComponent,
    TransformComponent,
    SpriteComponent,
    SpecialItemPickupComponent,
  ]);

  return entity;
}
