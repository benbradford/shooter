import type { Entity } from '../ecs/Entity';
import type { EntityManager } from '../ecs/EntityManager';
import type { EventListener } from '../ecs/systems/EventListener';
import type { EventManagerSystem } from '../ecs/systems/EventManagerSystem';

export type EntityCreator = () => Entity;

export class EntityCreatorManager implements EventListener {
  private readonly creators: Map<string, EntityCreator[]> = new Map();
  private readonly firedEvents: Set<string> = new Set();

  constructor(
    private readonly entityManager: EntityManager,
    private readonly eventManager: EventManagerSystem
  ) {}

  register(createOnEvent: string, creator: EntityCreator): void {
    if (!this.creators.has(createOnEvent)) {
      this.creators.set(createOnEvent, []);
      this.eventManager.register(createOnEvent, this);
    }
    this.creators.get(createOnEvent)!.push(creator);
  }

  onEvent(createOnEvent: string): void {
    if (this.firedEvents.has(createOnEvent)) {
      throw new Error(`Event already fired: ${createOnEvent}. Duplicate entity creation prevented.`);
    }

    const creatorList = this.creators.get(createOnEvent);
    if (!creatorList) {
      return;
    }

    this.firedEvents.add(createOnEvent);
    
    for (const creator of creatorList) {
      const entity = creator();
      this.entityManager.add(entity);
    }
    
    this.creators.delete(createOnEvent);
    this.eventManager.deregister(createOnEvent, this);

    console.log(`[EntityCreator] Created ${creatorList.length} entities via event: ${createOnEvent}`);
  }

  clear(): void {
    for (const createOnEvent of this.creators.keys()) {
      this.eventManager.deregister(createOnEvent, this);
    }
    this.creators.clear();
    this.firedEvents.clear();
  }
}
