import type { Entity } from '../ecs/Entity';
import type { EntityManager } from '../ecs/EntityManager';
import type { EventListener } from '../ecs/systems/EventListener';
import type { EventManagerSystem } from '../ecs/systems/EventManagerSystem';

export type EntityCreator = () => Entity;

type AllEventsTracker = {
  events: Set<string>;
  firedEvents: Set<string>;
  creator: EntityCreator;
}

export class EntityCreatorManager implements EventListener {
  private readonly anyEventCreators: Map<string, EntityCreator[]> = new Map();
  private readonly allEventsCreators: AllEventsTracker[] = [];
  private readonly firedEvents: Set<string> = new Set();

  constructor(
    private readonly entityManager: EntityManager,
    private readonly eventManager: EventManagerSystem
  ) {}

  registerAny(createOnEvent: string, creator: EntityCreator): void {
    if (!this.anyEventCreators.has(createOnEvent)) {
      this.anyEventCreators.set(createOnEvent, []);
      this.eventManager.register(createOnEvent, this);
    }
    this.anyEventCreators.get(createOnEvent)!.push(creator);
  }

  registerAll(events: string[], creator: EntityCreator): void {
    const tracker: AllEventsTracker = {
      events: new Set(events),
      firedEvents: new Set(),
      creator
    };
    this.allEventsCreators.push(tracker);
    
    for (const event of events) {
      if (!this.anyEventCreators.has(event) && !this.allEventsCreators.some(t => t !== tracker && t.events.has(event))) {
        this.eventManager.register(event, this);
      }
    }
  }

  onEvent(eventName: string): void {
    if (this.firedEvents.has(eventName)) {
      return;
    }

    this.firedEvents.add(eventName);
    
    const anyCreators = this.anyEventCreators.get(eventName);
    if (anyCreators) {
      for (const creator of anyCreators) {
        const entity = creator();
        this.entityManager.add(entity);
      }
      
      this.anyEventCreators.delete(eventName);
      
      if (!this.allEventsCreators.some(t => t.events.has(eventName))) {
        this.eventManager.deregister(eventName, this);
      }
      
      console.log(`[EntityCreator] Created ${anyCreators.length} entities via event: ${eventName}`);
    }
    
    for (const tracker of this.allEventsCreators) {
      if (tracker.events.has(eventName)) {
        tracker.firedEvents.add(eventName);
        
        if (tracker.firedEvents.size === tracker.events.size) {
          const entity = tracker.creator();
          this.entityManager.add(entity);
          
          const index = this.allEventsCreators.indexOf(tracker);
          if (index >= 0) {
            this.allEventsCreators.splice(index, 1);
          }
          
          for (const event of tracker.events) {
            if (!this.anyEventCreators.has(event) && !this.allEventsCreators.some(t => t.events.has(event))) {
              this.eventManager.deregister(event, this);
            }
          }
          
          console.log(`[EntityCreator] Created entity after all events fired:`, Array.from(tracker.events));
        }
      }
    }
  }

  clear(): void {
    for (const createOnEvent of this.anyEventCreators.keys()) {
      this.eventManager.deregister(createOnEvent, this);
    }
    this.anyEventCreators.clear();
    
    const allEvents = new Set<string>();
    for (const tracker of this.allEventsCreators) {
      for (const event of tracker.events) {
        allEvents.add(event);
      }
    }
    for (const event of allEvents) {
      this.eventManager.deregister(event, this);
    }
    this.allEventsCreators.length = 0;
    
    this.firedEvents.clear();
  }
}
