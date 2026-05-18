import type Phaser from 'phaser';
import type { Entity } from '../ecs/Entity';
import type { Grid } from './grid/Grid';
import { PET_REGISTRY, type PetSpritesheetMetadata } from '../ecs/entities/pet/PetConfig';
import { WorldFlags } from '../constants/WorldFlags';
import { createPetEntity } from '../ecs/entities/pet/PetEntity';
import { WorldStateManager } from './WorldStateManager';
import { TransformComponent } from '../ecs/components/core/TransformComponent';
import { PetFollowComponent } from '../ecs/components/pet/PetFollowComponent';
import { SpriteComponent } from '../ecs/components/core/SpriteComponent';
import { GridPositionComponent } from '../ecs/components/movement/GridPositionComponent';
import { JumpComponent } from '../ecs/components/movement/JumpComponent';

export class PetManager {
  private static instance: PetManager | null = null;
  
  private scene: Phaser.Scene | null = null;
  private grid: Grid | null = null;
  private playerEntity: Entity | null = null;
  private activePetEntity: Entity | null = null;
  private selectedPetId: string | null = null;
  private readonly metadataCache: Map<string, PetSpritesheetMetadata> = new Map();
  
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}
  
  static getInstance(): PetManager {
    PetManager.instance ??= new PetManager();
    return PetManager.instance;
  }
  
  initialize(scene: Phaser.Scene, grid: Grid, playerEntity: Entity): void {
    this.scene = scene;
    this.grid = grid;
    this.playerEntity = playerEntity;
    
    const worldState = WorldStateManager.getInstance();
    const selectedId = worldState.getFlag(WorldFlags.petSelected);
    
    if (selectedId && selectedId !== '') {
      void this.spawnPet(selectedId);
    }
  }
  
  async spawnPet(petId: string): Promise<void> {
    if (!this.scene || !this.grid || !this.playerEntity) {
      return;
    }
    
    const config = PET_REGISTRY[petId];
    if (!config) {
      console.error(`[PetManager] Unknown pet: ${petId}`);
      return;
    }
    
    if (this.activePetEntity) {
      this.despawnPet();
    }
    
    const metadata = await this.loadMetadata(petId);
    if (!metadata) return;
    
    const playerTransform = this.playerEntity.require(TransformComponent);
    const playerGridPos = this.playerEntity.get(GridPositionComponent);
    const feetOffsetY = playerGridPos ? playerGridPos.collisionBox.offsetY : 0;
    
    this.activePetEntity = createPetEntity({
      scene: this.scene,
      grid: this.grid,
      playerEntity: this.playerEntity,
      config,
      metadata,
      startX: playerTransform.x,
      startY: playerTransform.y + feetOffsetY,
    });
    
    // Add to EntityManager
    if (this.scene && 'entityManager' in this.scene) {
      const entityManager = (this.scene as unknown as { entityManager: { add(entity: Entity): void } }).entityManager;
      if (entityManager) {
        entityManager.add(this.activePetEntity);
      }
    }

    // Wire player jump to pet sync jump
    this.wireJumpSync();
    
    this.selectedPetId = petId;
    WorldStateManager.getInstance().setFlag(WorldFlags.petSelected, petId);
  }
  
  despawnPet(): void {
    if (this.activePetEntity) {
      this.activePetEntity.destroy();
      this.activePetEntity = null;
    }
    this.playerEntity?.get(JumpComponent)?.setOnJumpStart(undefined);
  }

  private wireJumpSync(): void {
    if (!this.playerEntity || !this.activePetEntity) return;
    const playerJump = this.playerEntity.get(JumpComponent);
    const petFollow = this.activePetEntity.get(PetFollowComponent);
    if (!playerJump || !petFollow) return;
    playerJump.setOnJumpStart((info) => {
      petFollow.syncJump(info.landCol, info.landRow, info.totalDurationMs, info.isFallJump, info.flightDurationMs);
    });
  }
  
  private async loadMetadata(petId: string): Promise<PetSpritesheetMetadata | null> {
    if (this.metadataCache.has(petId)) {
      return this.metadataCache.get(petId) ?? null;
    }
    
    try {
      const response = await fetch(`assets/pets/${petId}/${petId}_spritesheet_metadata.json`);
      const metadata = await response.json() as PetSpritesheetMetadata;
      this.metadataCache.set(petId, metadata);
      return metadata;
    } catch (error) {
      console.error(`[PetManager] Failed to load metadata for ${petId}:`, error);
      return null;
    }
  }
  
  getActivePetEntity(): Entity | null {
    return this.activePetEntity;
  }
  
  getSelectedPetId(): string | null {
    return this.selectedPetId;
  }
  
  isActive(): boolean {
    return this.activePetEntity !== null;
  }
  
  getCollectedPets(): string[] {
    const worldState = WorldStateManager.getInstance();
    const collected: string[] = [];
    
    Object.values(PET_REGISTRY).forEach(config => {
      const flag = worldState.getFlag(config.worldStateFlag);
      if (flag === 'true') {
        collected.push(config.id);
      }
    });
    
    return collected;
  }
  
  selectNext(): void {
    const collected = this.getCollectedPets();
    if (collected.length <= 1) return;
    const currentIndex = collected.indexOf(this.selectedPetId ?? '');
    const nextIndex = (currentIndex + 1) % collected.length;
    void this.spawnPet(collected[nextIndex]);
  }

  selectPrevious(): void {
    const collected = this.getCollectedPets();
    if (collected.length <= 1) return;
    const currentIndex = collected.indexOf(this.selectedPetId ?? '');
    const prevIndex = (currentIndex - 1 + collected.length) % collected.length;
    void this.spawnPet(collected[prevIndex]);
  }

  updateWaterState(isInWater: boolean): void {
    if (!this.activePetEntity) return;
    
    const follow = this.activePetEntity.get(PetFollowComponent);
    if (!follow) return;
    
    follow.setHidden(isInWater);
    
    if (isInWater) {
      const sprite = this.activePetEntity.get(SpriteComponent);
      if (sprite) {
        sprite.sprite.setAlpha(0);
      }
    } else {
      const sprite = this.activePetEntity.get(SpriteComponent);
      if (sprite) {
        sprite.sprite.setAlpha(1);
      }
    }
  }
}
