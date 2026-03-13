import type { Component } from '../../Component';
import type { Entity } from '../../Entity';
import type { NPCInteraction } from './NPCEntity';
import { TransformComponent } from '../../components/core/TransformComponent';
import { CollisionComponent } from '../../components/combat/CollisionComponent';
import { WorldStateManager } from '../../../systems/WorldStateManager';

const INTERACTION_RANGE_PX = 50;

export class NPCInteractionComponent implements Component {
  entity!: Entity;
  private hasWarnedNoValid = false;
  private hasWarnedMultipleValid = false;

  constructor(
    private readonly interactions: NPCInteraction[],
    private readonly defaultCol: number,
    private readonly defaultRow: number
  ) {}

  getActiveInteraction(): { name: string; col: number; row: number } | null {
    const worldState = WorldStateManager.getInstance();
    const validInteractions: NPCInteraction[] = [];

    for (const interaction of this.interactions) {
      if (!interaction.whenFlagSet) {
        validInteractions.push(interaction);
        continue;
      }

      const cond = interaction.whenFlagSet;
      if (worldState.isFlagCondition(
        cond.name,
        cond.condition as 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte',
        cond.value
      )) {
        validInteractions.push(interaction);
      }
    }

    if (validInteractions.length > 1 && !this.hasWarnedMultipleValid) {
      console.warn(`[NPC] Multiple valid interactions for ${this.entity.id}`);
      this.hasWarnedMultipleValid = true;
    }

    if (validInteractions.length === 0) {
      if (!this.hasWarnedNoValid) {
        console.warn(`[NPC] No valid interactions for ${this.entity.id}`);
        this.hasWarnedNoValid = true;
      }
      return null;
    }

    const interaction = validInteractions[0];
    const col = interaction.position?.col ?? this.defaultCol;
    const row = interaction.position?.row ?? this.defaultRow;

    return { name: interaction.name, col, row };
  }

  isPlayerInRange(playerEntity: Entity): boolean {
    const activeInteraction = this.getActiveInteraction();
    if (!activeInteraction) return false;

    const npcTransform = this.entity.require(TransformComponent);
    const playerTransform = playerEntity.require(TransformComponent);
    const collision = playerEntity.get(CollisionComponent);

    let playerCenterX: number;
    let playerCenterY: number;

    if (collision) {
      playerCenterX = playerTransform.x + collision.box.offsetX + collision.box.width / 2;
      playerCenterY = playerTransform.y + collision.box.offsetY + collision.box.height / 2;
    } else {
      playerCenterX = playerTransform.x;
      playerCenterY = playerTransform.y;
    }

    const distance = Math.hypot(npcTransform.x - playerCenterX, npcTransform.y - playerCenterY);
    return distance <= INTERACTION_RANGE_PX;
  }

  getInteractions(): NPCInteraction[] {
    return this.interactions;
  }
}
