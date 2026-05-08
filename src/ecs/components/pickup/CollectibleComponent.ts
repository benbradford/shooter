import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import { TransformComponent } from '../core/TransformComponent';
import type { WorldStateManager } from '../../../systems/WorldStateManager';
import type { SoundManager } from '../../../systems/SoundManager';

const COLLECTION_DISTANCE_PX = 48;

export type CollectibleComponentProps = {
  playerEntity: Entity;
  flagName: string;
  worldState: WorldStateManager;
  soundManager: SoundManager;
};

export class CollectibleComponent implements Component {
  entity!: Entity;

  private readonly playerEntity: Entity;
  private readonly flagName: string;
  private readonly worldState: WorldStateManager;
  private readonly soundManager: SoundManager;

  constructor(props: CollectibleComponentProps) {
    this.playerEntity = props.playerEntity;
    this.flagName = props.flagName;
    this.worldState = props.worldState;
    this.soundManager = props.soundManager;
  }

  update(): void {
    const transform = this.entity.require(TransformComponent);
    const playerTransform = this.playerEntity.require(TransformComponent);
    const distance = Math.hypot(playerTransform.x - transform.x, playerTransform.y - transform.y);

    if (distance < COLLECTION_DISTANCE_PX) {
      const current = Number.parseInt(this.worldState.getFlag(this.flagName) ?? '0', 10);
      this.worldState.setFlag(this.flagName, current + 1);
      this.worldState.setFlag(`show_${this.flagName}s`, 'true');
      this.soundManager.play('orb_sfx');
      this.entity.destroy();
    }
  }
}
