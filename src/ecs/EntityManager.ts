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
    // Update only non-destroyed entities
    for (const entity of this.entities) {
      if (!entity.isDestroyed) {
        entity.update(delta);
      }
    }
  

    // Remove destroyed entities
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

  getAll(): Entity[] {
    return [...this.entities];
  }

  get count(): number {
    return this.entities.length;
  }
}
