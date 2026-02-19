import type { Entity } from '../ecs/Entity';
import type { EntityManager } from '../ecs/EntityManager';
import type { EventListener } from '../ecs/systems/EventListener';
import type { EventManagerSystem } from '../ecs/systems/EventManagerSystem';

export type EntityCreator = () => Entity;

export class EntityCreatorManager implements EventListener {
  private readonly creators: Map<string, EntityCreator> = new Map();
  private readonly firedEvents: Set<string> = new Set();

  constructor(
    private readonly entityManager: EntityManager,
    private readonly eventManager: EventManagerSystem
  ) {}

  register(createOnEvent: string, creator: EntityCreator): void {
    if (this.creators.has(createOnEvent)) {
      throw new Error(`Entity creator already registered for event: ${createOnEvent}`);
    }
    this.creators.set(createOnEvent, creator);
    this.eventManager.register(createOnEvent, this);
  }

  onEvent(createOnEvent: string): void {
    if (this.firedEvents.has(createOnEvent)) {
      throw new Error(`Event already fired: ${createOnEvent}. Duplicate entity creation prevented.`);
    }

    const creator = this.creators.get(createOnEvent);
    if (!creator) {
      return;
    }

    this.firedEvents.add(createOnEvent);
    const entity = creator();
    this.entityManager.add(entity);
    this.creators.delete(createOnEvent);
    this.eventManager.deregister(createOnEvent, this);

    console.log(`[EntityCreator] Created entity via event: ${createOnEvent}`);
  }

  clear(): void {
    for (const createOnEvent of this.creators.keys()) {
      this.eventManager.deregister(createOnEvent, this);
    }
    this.creators.clear();
    this.firedEvents.clear();
  }
}
