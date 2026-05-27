import type { Entity } from './Entity';
import type { EventManagerSystem } from './systems/EventManagerSystem';

const EMPTY_TAG_SET: ReadonlySet<Entity> = new Set();

export class EntityManager {
  private entities: Entity[] = [];
  private eventManager?: EventManagerSystem;
  private readonly tagIndex: Map<string, Set<Entity>> = new Map();

  setEventManager(eventManager: EventManagerSystem): void {
    this.eventManager = eventManager;
  }

  add(entity: Entity): Entity {
    this.entities.push(entity);
    this.indexEntityTags(entity);
    return entity;
  }

  remove(entity: Entity): void {
    console.log("Removing entity " + entity.entityId);
    const index = this.entities.indexOf(entity);
    if (index > -1) {
      this.unindexEntityTags(entity);
      this.entities[index].destroy();
      this.entities.splice(index, 1);
      if (this.eventManager) {
        this.eventManager.raiseEvent(`${entity.id}_destroyed`);
      }
    }
  }

  update(delta: number): void {
    const scene = this.entities[0]?.getScene() as { isInInteraction?: boolean } | undefined;

    if (scene?.isInInteraction) {
      for (const entity of this.entities) {
        // Update interaction-active entities OR entities in HudScene
        const entityScene = entity.getScene();
        const isHudEntity = entityScene?.scene.key === 'HudScene';

        if ((entity.tags.has('interaction_active') || isHudEntity) && !entity.isDestroyed) {
          entity.update(delta);
        }
      }
    } else {
      for (const entity of this.entities) {
        if (!entity.isDestroyed) {
          entity.update(delta);
        }
      }
    }

    const destroyedEntities = this.entities.filter(entity => entity.isDestroyed);
    if (destroyedEntities.length > 0) {
      for (const entity of destroyedEntities) {
        this.unindexEntityTags(entity);
      }
      this.entities = this.entities.filter(entity => !entity.isDestroyed);
    }

    if (this.eventManager) {
      for (const entity of destroyedEntities) {
        this.eventManager.raiseEvent(`${entity.id}_destroyed`);
      }
    }
  }

  getByType(type: string): Entity[] {
    return this.entities.filter(e => e.id.startsWith(type));
  }

  getFirst(type: string): Entity | undefined {
    return this.entities.find(e => e.id.startsWith(type));
  }

  /**
   * Zero-allocation tag query — returns a shared ReadonlySet of all entities currently carrying `tag`.
   * Iterating the returned set never allocates; do NOT mutate it.
   *
   * Tags are indexed at `add()` time. If a tag is added to an entity AFTER it joins the manager,
   * call `refreshEntityTags(entity)` to update the index.
   */
  getByTag(tag: string): ReadonlySet<Entity> {
    return this.tagIndex.get(tag) ?? EMPTY_TAG_SET;
  }

  /** Re-sync an entity's tag index entries after dynamic tag changes. */
  refreshEntityTags(entity: Entity): void {
    this.unindexEntityTags(entity);
    if (!entity.isDestroyed) this.indexEntityTags(entity);
  }

  private indexEntityTags(entity: Entity): void {
    for (const tag of entity.tags) {
      let set = this.tagIndex.get(tag);
      if (!set) {
        set = new Set();
        this.tagIndex.set(tag, set);
      }
      set.add(entity);
    }
  }

  private unindexEntityTags(entity: Entity): void {
    for (const tag of entity.tags) {
      const set = this.tagIndex.get(tag);
      if (!set) continue;
      set.delete(entity);
      if (set.size === 0) this.tagIndex.delete(tag);
    }
  }

  destroyAll(): void {
    this.entities.forEach(e => e.destroy());
    this.entities = [];
    this.tagIndex.clear();
  }

  getAll(): Entity[] {
    return [...this.entities];
  }

  get count(): number {
    return this.entities.length;
  }
}
