# Event System

The event system allows components to listen for and respond to named events raised by triggers or other game systems.

## Architecture

### EventManagerSystem

Central event dispatcher that manages event listeners and raises events.

```typescript
class EventManagerSystem {
  register(eventName: string, listener: EventListener): void
  deregister(eventName: string, listener: EventListener): void
  raiseEvent(eventName: string): void
}
```

### EventListener

Interface for objects that can receive events:

```typescript
type EventListener = {
  onEvent(eventName: string): void;
}
```

### BaseEventComponent

Abstract base class for components that listen to events. Handles automatic registration and cleanup.

```typescript
abstract class BaseEventComponent implements Component, EventListener {
  protected registerEvent(eventName: string): void
  abstract onEvent(eventName: string): void
  onDestroy(): void // Automatically deregisters all events
}
```

## Creating Event Listeners

### 1. Extend BaseEventComponent

```typescript
export class MyEventComponent extends BaseEventComponent {
  init(): void {
    this.registerEvent('door_open');
    this.registerEvent('enemy_defeated');
  }

  onEvent(eventName: string): void {
    if (eventName === 'door_open') {
      console.log('Door opened!');
      // Handle door opening logic
    } else if (eventName === 'enemy_defeated') {
      console.log('Enemy defeated!');
      // Handle enemy defeat logic
    }
  }
}
```

### 2. Add to Entity

```typescript
const myEvent = entity.add(new MyEventComponent(eventManager));
myEvent.init();

entity.setUpdateOrder([
  // ... other components
  MyEventComponent,
]);
```

## Raising Events

### From Triggers

Triggers automatically raise events when the player enters their cells:

```json
{
  "triggers": [
    {
      "eventName": "door_open",
      "triggerCells": [{"col": 10, "row": 5}],
      "oneShot": true
    }
  ]
}
```

### From Code

```typescript
this.eventManager.raiseEvent('custom_event');
```

## Event Flow

1. **Trigger activated** → `TriggerComponent.update()` detects player in cell
2. **Event raised** → `EventManagerSystem.raiseEvent('eventName')`
3. **Listeners notified** → All registered listeners receive `onEvent('eventName')`
4. **Cleanup** → One-shot triggers destroy themselves

## Key Features

### Automatic Cleanup

`BaseEventComponent` automatically deregisters all events in `onDestroy()`:

```typescript
onDestroy(): void {
  for (const eventName of this.registeredEvents) {
    this.eventManager.deregister(eventName, this);
  }
}
```

### Safe Deregistration During Iteration

`EventManagerSystem.raiseEvent()` handles listeners deregistering themselves during event handling:

```typescript
raiseEvent(eventName: string): void {
  const list = this.listeners.get(eventName);
  if (!list) return;
  
  // Copy array to handle deregistration during iteration
  const copy = [...list];
  for (const listener of copy) {
    if (list.includes(listener)) {
      listener.onEvent(eventName);
    }
  }
}
```

### Multiple Listeners Per Event

Multiple components can listen to the same event:

```typescript
// Component A
this.registerEvent('door_open');

// Component B
this.registerEvent('door_open');

// Both receive the event when raised
```

## One-Shot vs Repeating Triggers

### One-Shot (oneShot: true)
- Fires once when player enters any trigger cell
- Destroys trigger entity after firing
- Use for: doors, cutscenes, one-time events

### Repeating (oneShot: false)
- Fires every frame while player is in any trigger cell
- Resets when player leaves all trigger cells
- Use for: damage zones, speed boosts, area effects

## Example: Door System

```typescript
// 1. Create door event component
export class DoorEventComponent extends BaseEventComponent {
  constructor(
    eventManager: EventManagerSystem,
    private readonly doorSprite: Phaser.GameObjects.Sprite
  ) {
    super(eventManager);
  }

  init(): void {
    this.registerEvent('door_open');
  }

  onEvent(eventName: string): void {
    if (eventName === 'door_open') {
      this.doorSprite.setTexture('door_open');
      console.log('Door opened!');
    }
  }
}

// 2. Add to entity
const doorEvent = entity.add(new DoorEventComponent(eventManager, doorSprite));
doorEvent.init();

// 3. Create trigger in level JSON
{
  "triggers": [
    {
      "eventName": "door_open",
      "triggerCells": [{"col": 10, "row": 5}],
      "oneShot": true
    }
  ]
}
```

## Testing Events

Create event listener components that extend `BaseEventComponent` and register for specific events. The event system will automatically notify listeners when triggers fire.

## Best Practices

1. **Use descriptive event names**: `door_open`, `boss_defeated`, not `event1`, `trigger2`
2. **Register in init()**: Always call `registerEvent()` in the `init()` method
3. **No defaults**: Always specify `oneShot` explicitly in level JSON
4. **Clean up**: Let `BaseEventComponent` handle deregistration automatically
5. **Test in editor**: Use trigger editor to create and test triggers visually

## Related Files

- `src/ecs/systems/EventManagerSystem.ts` - Event dispatcher
- `src/ecs/systems/EventListener.ts` - Listener interface
- `src/ecs/components/core/BaseEventComponent.ts` - Base class for event components
- `src/ecs/components/core/TriggerComponent.ts` - Trigger implementation
- `src/trigger/TriggerEntity.ts` - Trigger entity factory
- `src/editor/TriggerEditorState.ts` - Trigger editor UI
