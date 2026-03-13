import type { Entity } from '../ecs/Entity';
import { NPCInteractionComponent } from '../ecs/entities/npc/NPCInteractionComponent';
import { TransformComponent } from '../ecs/components/core/TransformComponent';
import type GameScene from '../scenes/GameScene';

export class NPCManager {
  private static instance: NPCManager;
  private _lastInteractedNpcId: string | undefined;

  private constructor(private readonly scene: GameScene) {}

  get lastInteractedNpcId(): string | undefined {
    return this._lastInteractedNpcId;
  }

  set lastInteractedNpcId(npcId: string | undefined) {
    this._lastInteractedNpcId = npcId;
  }

  static getInstance(scene?: GameScene): NPCManager {
    if (!NPCManager.instance && scene) {
      NPCManager.instance = new NPCManager(scene);
    }
    return NPCManager.instance;
  }

  getClosestInteractableNPC(playerEntity: Entity): Entity | null {
    const npcs = this.scene.entityManager.getByType('npc');

    let closestNPC: Entity | null = null;
    let closestDistance = Infinity;

    for (const npc of npcs) {
      const interaction = npc.get(NPCInteractionComponent);
      if (!interaction) continue;

      if (!interaction.getActiveInteraction()) continue;
      if (!interaction.isPlayerInRange(playerEntity)) continue;

      const npcTransform = npc.require(TransformComponent);
      const playerTransform = playerEntity.require(TransformComponent);
      const distance = Math.hypot(
        npcTransform.x - playerTransform.x,
        npcTransform.y - playerTransform.y
      );

      if (distance < closestDistance) {
        closestDistance = distance;
        closestNPC = npc;
      }
    }

    return closestNPC;
  }
}
