import type { Entity } from '../ecs/Entity';
import type { Grid } from './grid/Grid';
import { GridPositionComponent } from '../ecs/components/movement/GridPositionComponent';
import { NPCInteractionComponent } from '../ecs/entities/npc/NPCInteractionComponent';
import { TransformComponent } from '../ecs/components/core/TransformComponent';
import type GameScene from '../scenes/GameScene';

export class NPCManager {
  private static instance: NPCManager;
  private cachedClosestNPC: Entity | null = null;
  private lastPlayerCol = -1;
  private lastPlayerRow = -1;
  
  private constructor(private readonly scene: GameScene) {}
  
  static getInstance(scene?: GameScene): NPCManager {
    if (!NPCManager.instance && scene) {
      NPCManager.instance = new NPCManager(scene);
    }
    return NPCManager.instance;
  }
  
  getClosestInteractableNPC(playerEntity: Entity, grid: Grid): Entity | null {
    const gridPos = playerEntity.get(GridPositionComponent);
    if (!gridPos) return null;
    
    if (gridPos.currentCell.col === this.lastPlayerCol && gridPos.currentCell.row === this.lastPlayerRow) {
      return this.cachedClosestNPC;
    }
    
    this.lastPlayerCol = gridPos.currentCell.col;
    this.lastPlayerRow = gridPos.currentCell.row;
    
    const npcs = this.scene.entityManager.getByType('npc');
    
    let closestNPC: Entity | null = null;
    let closestDistance = Infinity;
    
    for (const npc of npcs) {
      const interaction = npc.get(NPCInteractionComponent);
      if (!interaction) continue;
      
      if (!interaction.getActiveInteraction()) continue;
      if (!interaction.isPlayerInRange(playerEntity, grid)) continue;
      
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
    
    this.cachedClosestNPC = closestNPC;
    return closestNPC;
  }
}
