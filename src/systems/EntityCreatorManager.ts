import type { Entity } from '../ecs/Entity';
import type { EntityManager } from '../ecs/EntityManager';
import type { EventListener } from '../ecs/systems/EventListener';
import type { EventManagerSystem } from '../ecs/systems/EventManagerSystem';
import { WorldStateManager } from './WorldStateManager';

export type EntityCreator = () => Entity;

type FlagCondition = {
  name: string;
  condition: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte';
  value: string | number;
};

type AllEventsTracker = {
  events: Set<string>;
  firedEvents: Set<string>;
  creator: EntityCreator;
  entityId: string;
  suppressOnAnyFlag?: FlagCondition[];
}

export class EntityCreatorManager implements EventListener {
  private readonly anyEventCreators: Map<string, Array<{ creator: EntityCreator; entityId: string; suppressOnAnyFlag?: FlagCondition[]; isInteraction: boolean }>> = new Map();
  private readonly allEventsCreators: AllEventsTracker[] = [];
  private readonly firedEvents: Set<string> = new Set();

  constructor(
    private readonly entityManager: EntityManager,
    private readonly eventManager: EventManagerSystem
  ) {}

  registerAny(createOnEvent: string, creator: EntityCreator, entityId: string, suppressOnAnyFlag?: FlagCondition[], isInteraction: boolean = false): void {
    if (!this.anyEventCreators.has(createOnEvent)) {
      this.anyEventCreators.set(createOnEvent, []);
      this.eventManager.register(createOnEvent, this);
    }
    this.anyEventCreators.get(createOnEvent)!.push({ creator, entityId, suppressOnAnyFlag, isInteraction });
  }

  registerAll(events: string[], creator: EntityCreator, entityId: string, suppressOnAnyFlag?: FlagCondition[]): void {
    const tracker: AllEventsTracker = {
      events: new Set(events),
      firedEvents: new Set(),
      creator,
      entityId,
      suppressOnAnyFlag
    };
    this.allEventsCreators.push(tracker);

    for (const event of events) {
      if (!this.anyEventCreators.has(event) && !this.allEventsCreators.some(t => t !== tracker && t.events.has(event))) {
        this.eventManager.register(event, this);
      }
    }
  }

  onEvent(eventName: string): void {

    const worldState = WorldStateManager.getInstance();
    const currentLevel = worldState.getCurrentLevelName();

    const anyCreators = this.anyEventCreators.get(eventName);
    if (anyCreators) {
      const allAreInteractions = anyCreators.every(c => c.isInteraction);

      // Only block repeated events if not all interactions
      if (!allAreInteractions && this.firedEvents.has(eventName)) {
        console.log(`[EntityCreatorManager] Blocking repeated event: ${eventName}`);
        return;
      }

      if (!allAreInteractions) {
        this.firedEvents.add(eventName);
      }

      for (const { creator, entityId, suppressOnAnyFlag } of anyCreators) {
        // Check if entity should be suppressed by flags
        if (suppressOnAnyFlag) {
          let shouldSuppress = false;
          for (const flagCondition of suppressOnAnyFlag) {
            if (worldState.isFlagCondition(flagCondition.name, flagCondition.condition, flagCondition.value)) {
              shouldSuppress = true;
              break;
            }
          }
          if (shouldSuppress) {
            continue;
          }
        }

        const entity = creator();
        entity.levelName = currentLevel;
        this.entityManager.add(entity);

        // Don't track interaction entities in liveEntities
        if (!entity.tags.has('interaction')) {
          worldState.addLiveEntity(currentLevel, entityId);
        }
      }

      // Don't delete creators for interaction entities (they can be created repeatedly)
      const allAreInteractions2 = anyCreators.every(c => c.isInteraction);
      if (!allAreInteractions2) {
        this.anyEventCreators.delete(eventName);

        if (!this.allEventsCreators.some(t => t.events.has(eventName))) {
          this.eventManager.deregister(eventName, this);
        }
      }
    }

    for (const tracker of this.allEventsCreators) {
      if (tracker.events.has(eventName)) {
        tracker.firedEvents.add(eventName);

        if (tracker.firedEvents.size === tracker.events.size) {
          // Check if entity should be suppressed by flags
          if (tracker.suppressOnAnyFlag) {
            let shouldSuppress = false;
            for (const flagCondition of tracker.suppressOnAnyFlag) {
              if (worldState.isFlagCondition(flagCondition.name, flagCondition.condition, flagCondition.value)) {
                shouldSuppress = true;
                break;
              }
            }
            if (shouldSuppress) {
              continue;
            }
          }

          const entity = tracker.creator();
          entity.levelName = currentLevel;
          this.entityManager.add(entity);

          // Don't track interaction entities in liveEntities
          if (!entity.tags.has('interaction')) {
            worldState.addLiveEntity(currentLevel, tracker.entityId);
          }

          const index = this.allEventsCreators.indexOf(tracker);
          if (index >= 0) {
            this.allEventsCreators.splice(index, 1);
          }

          for (const event of tracker.events) {
            if (!this.anyEventCreators.has(event) && !this.allEventsCreators.some(t => t.events.has(event))) {
              this.eventManager.deregister(event, this);
            }
          }
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
