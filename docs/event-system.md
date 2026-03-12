# Event System

The event system allows components to listen for and respond to named events raised by triggers or other game systems.

## Architecture

### EventManagerSystem

Central event dispatcher that manages event listeners and raises events.

### EventListener

Interface for objects that can receive events.

### BaseEventComponent

Abstract base class for components that listen to events. Handles automatic registration and cleanup.

## Creating Event Listeners

Extend `BaseEventComponent`, call `registerEvent()` in `init()`, implement `onEvent()`.

## Raising Events

### From Triggers

Triggers automatically raise events when the player enters their cells (defined in level JSON).

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

`BaseEventComponent` automatically deregisters all events in `onDestroy()`.

### Safe Deregistration During Iteration

`EventManagerSystem.raiseEvent()` handles listeners deregistering themselves during event handling by copying the listener array before iteration.

### Multiple Listeners Per Event

Multiple components can listen to the same event.

## One-Shot vs Repeating Triggers

### One-Shot (oneShot: true)
- Fires once when player enters any trigger cell
- Destroys trigger entity after firing
- Use for: doors, cutscenes, one-time events

### Repeating (oneShot: false)
- Fires every frame while player is in any trigger cell
- Resets when player leaves all trigger cells
- Use for: damage zones, speed boosts, area effects

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
