import type { Entity } from '../ecs/Entity';
import type { EntityManager } from '../ecs/EntityManager';
import type { EventListener } from '../ecs/systems/EventListener';
import type { EventManagerSystem } from '../ecs/systems/EventManagerSystem';
import { WorldStateManager } from './WorldStateManager';

export type EntityCreator = () => Entity;

type AllEventsTracker = {
  events: Set<string>;
  firedEvents: Set<string>;
  creator: EntityCreator;
  entityId: string;
}

export class EntityCreatorManager implements EventListener {
  private readonly anyEventCreators: Map<string, Array<{ creator: EntityCreator; entityId: string }>> = new Map();
  private readonly allEventsCreators: AllEventsTracker[] = [];
  private readonly firedEvents: Set<string> = new Set();

  constructor(
    private readonly entityManager: EntityManager,
    private readonly eventManager: EventManagerSystem
  ) {}

  registerAny(createOnEvent: string, creator: EntityCreator, entityId: string): void {
    if (!this.anyEventCreators.has(createOnEvent)) {
      this.anyEventCreators.set(createOnEvent, []);
      this.eventManager.register(createOnEvent, this);
    }
    this.anyEventCreators.get(createOnEvent)!.push({ creator, entityId });
  }

  registerAll(events: string[], creator: EntityCreator, entityId: string): void {
    const tracker: AllEventsTracker = {
      events: new Set(events),
      firedEvents: new Set(),
      creator,
      entityId
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
    const worldState = WorldStateManager.getInstance();
    const currentLevel = worldState.getCurrentLevelName();
    
    const anyCreators = this.anyEventCreators.get(eventName);
    if (anyCreators) {
      for (const { creator, entityId } of anyCreators) {
        const entity = creator();
        entity.levelName = currentLevel;
        this.entityManager.add(entity);
        worldState.addLiveEntity(currentLevel, entityId);
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
          entity.levelName = currentLevel;
          this.entityManager.add(entity);
          worldState.addLiveEntity(currentLevel, tracker.entityId);
          
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
