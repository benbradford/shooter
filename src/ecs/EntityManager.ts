import type { Entity } from './Entity';

export class EntityManager {
  private entities: Entity[] = [];

  add(entity: Entity): Entity {
    this.entities.push(entity);
    return entity;
  }

  remove(entity: Entity): void {
    const index = this.entities.indexOf(entity);
    if (index > -1) {
      this.entities[index].destroy();
      this.entities.splice(index, 1);
    }
  }

  update(delta: number): void {
    // Update all entities
    for (const entity of this.entities) {
      entity.update(delta);
    }
    
    // Remove marked entities
    const toRemove = this.entities.filter(entity => entity.markedForRemoval);
    toRemove.forEach(entity => this.remove(entity));
    
    // Remove destroyed entities (do this after all updates)
    this.entities = this.entities.filter(entity => !entity.isDestroyed);
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

  get count(): number {
    return this.entities.length;
  }
}
