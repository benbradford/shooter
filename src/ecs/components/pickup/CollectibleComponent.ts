import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import { WorldStateManager } from '../../../systems/WorldStateManager';
import { SoundManager } from '../../../systems/SoundManager';

const COLLECTION_DISTANCE_PX = 48;

export type CollectibleComponentProps = {
  playerEntity: Entity;
  flagName: string;
};

export class CollectibleComponent implements Component {
  entity!: Entity;

  private readonly playerEntity: Entity;
  private readonly flagName: string;

  constructor(props: CollectibleComponentProps) {
    this.playerEntity = props.playerEntity;
    this.flagName = props.flagName;
  }

  update(): void {
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const distance = Math.hypot(playerTransform.x - transform.x, playerTransform.y - transform.y);

    if (distance < COLLECTION_DISTANCE_PX) {
      const wsm = WorldStateManager.getInstance();
      const current = Number.parseInt(wsm.getFlag(this.flagName) ?? '0', 10);
      wsm.setFlag(this.flagName, current + 1);
      wsm.setFlag(`show_${this.flagName}s`, 'true');
      SoundManager.getInstance().play('orb_sfx');
      this.entity.destroy();
    }
  }
}
