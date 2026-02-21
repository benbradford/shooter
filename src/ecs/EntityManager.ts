import type { Entity } from './Entity';
import type { EventManagerSystem } from './systems/EventManagerSystem';

export class EntityManager {
  private entities: Entity[] = [];
  private eventManager?: EventManagerSystem;

  setEventManager(eventManager: EventManagerSystem): void {
    this.eventManager = eventManager;
  }

  add(entity: Entity): Entity {
    this.entities.push(entity);
    return entity;
  }

  remove(entity: Entity): void {
    const index = this.entities.indexOf(entity);
    if (index > -1) {
      this.entities[index].destroy();
      this.entities.splice(index, 1);
      if (this.eventManager) {
        this.eventManager.raiseEvent(`${entity.id}_destroyed`);
      }
    }
  }

  update(delta: number): void {
    for (const entity of this.entities) {
      if (!entity.isDestroyed) {
        entity.update(delta);
      }
    }

    const destroyedEntities = this.entities.filter(entity => entity.isDestroyed);
    this.entities = this.entities.filter(entity => !entity.isDestroyed);
    
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

  destroyAll(): void {
    this.entities.forEach(e => e.destroy());
    this.entities = [];
  }

  getAll(): Entity[] {
    return [...this.entities];
  }

  get count(): number {
    return this.entities.length;
  }
}
