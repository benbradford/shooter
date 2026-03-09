# Repeatable Interactions System

## Overview

Interactions can be triggered multiple times by using repeating triggers (`oneShot: false`). The system automatically prevents duplicate interactions from running simultaneously using flags.

## How It Works

### Automatic Flag Management

When an interaction entity is created:
1. **On start**: Sets flag `<filename>_live = "true"`
2. **On complete**: Sets flag `<filename>_live = "false"` (in InteractionState.onExit)
3. **Auto-suppression**: EntityLoader automatically adds `suppressOnAnyFlag` checking `<filename>_live = "true"`

This prevents the interaction from being created again while it's already running.

### Entity Lifecycle

**Interaction entities are special:**
- Never added to `liveEntities` (EntityCreatorManager checks `entity.tags.has('interaction')`)
- Never added to `destroyedEntities` (Entity.destroy() checks tag)
- Creators not deleted from `anyEventCreators` after firing (allows repeated creation)
- Event not added to `firedEvents` if all creators are interactions (allows repeated firing)

### Example Setup

```json
{
  "id": "triggertest",
  "type": "trigger",
  "data": {
    "eventToRaise": "shop_interaction",
    "triggerCells": [{"col": 18, "row": 3}],
    "oneShot": false
  }
},
{
  "id": "interaction0",
  "type": "interaction",
  "data": {
    "filename": "shop"
  },
  "createOnAnyEvent": ["shop_interaction"]
}
```

**What happens:**
1. Player steps on trigger → raises `shop_interaction` event
2. EntityCreatorManager creates interaction entity
3. InteractionTriggerComponent sets `shop_live = "true"`
4. Interaction script runs
5. Player steps on trigger again → event raised but suppressed (flag is true)
6. Interaction completes → InteractionState.onExit sets `shop_live = "false"`
7. Player steps on trigger again → interaction can run again

## Implementation Details

### Files Modified

**EntityCreatorManager.ts:**
- Added `isInteraction: boolean` to creator registration
- Skip adding event to `firedEvents` if all creators are interactions
- Skip deleting creators if all are interactions
- Skip adding to `liveEntities` if entity has 'interaction' tag

**Entity.ts:**
- Skip tracking in `destroyedEntities` if entity has 'interaction' tag

**InteractionTriggerComponent.ts:**
- Sets `<filename>_live = "true"` when interaction starts
- Passes filename to GameScene.startInteraction()

**InteractionState.ts:**
- Receives filename in state data
- Clears `<filename>_live = "false"` in onExit()

**EntityLoader.ts:**
- Auto-adds `suppressOnAnyFlag` for interaction entities checking `<filename>_live = "true"`

### Manual suppressOnAnyFlag

You can still manually add `suppressOnAnyFlag` to any entity:

```json
{
  "id": "skeleton0",
  "type": "skeleton",
  "createOnAnyEvent": ["spawn_wave"],
  "suppressOnAnyFlag": [
    {"name": "bossDefeated", "condition": "eq", "value": "true"}
  ],
  "data": {"col": 10, "row": 5, "difficulty": "easy"}
}
```

The skeleton won't spawn if `bossDefeated = "true"`.

## Known Brittleness

### Tag-Based Logic
The system relies on checking `entity.tags.has('interaction')` in multiple places. If an interaction entity doesn't have the tag, it will be tracked incorrectly.

### Scattered Logic
Interaction-specific behavior is spread across:
- EntityCreatorManager (don't delete creators)
- Entity.destroy() (don't track)
- EntityLoader (auto-add suppression)
- InteractionTriggerComponent (set flag)
- InteractionState (clear flag)

### Implicit Flag Naming
The `<filename>_live` convention is implicit. If the filename changes, the flag name changes, breaking existing saves.

## Potential Improvements

### 1. Entity Metadata Approach
Add `isRepeatable: boolean` to LevelEntity instead of checking tags:
```typescript
type LevelEntity = {
  isRepeatable?: boolean; // Don't track in liveEntities, allow repeated creation
}
```

### 2. InteractionManager
Centralize interaction lifecycle:
```typescript
class InteractionManager {
  startInteraction(filename: string): void
  endInteraction(filename: string): void
  isInteractionActive(filename: string): boolean
}
```

### 3. Explicit Flag Contracts
Document or make configurable:
```typescript
type InteractionConfig = {
  filename: string;
  lockFlagName?: string; // Default: `${filename}_live`
}
```

### 4. Type-Safe Entity Types
Use discriminated unions:
```typescript
type LevelEntity = 
  | { type: 'interaction'; isRepeatable: true; ... }
  | { type: 'skeleton'; isRepeatable: false; ... }
```

## Testing

Test with a repeating trigger:
1. Step on trigger → interaction starts
2. Step on trigger again while in interaction → nothing happens (suppressed)
3. Complete interaction → flag cleared
4. Step on trigger again → interaction starts again
5. Press Y → verify `<filename>_live = "false"` in saved state
