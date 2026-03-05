# Interaction System - Implementation Clarifications

## Critical Design Decisions (Finalized)

### 1. Command Queue Approach ✓
- **Lua Phase**: Script executes instantly, builds command queue
- **Execution Phase**: Commands execute sequentially with await
- **Why**: Wasmoon cannot await JS Promises directly
- **Benefit**: Game continues updating (water effects, animations visible)

### 2. Entity System Integration ✓
- Interactions are entities with type `'interaction'`
- Use existing `EntityCreatorManager` and `createOnAnyEvent`
- No separate InteractionEventManager needed
- Follows same pattern as triggers, exits, eventchainers

### 3. Pause Mechanism ✓
- **Flag**: `GameScene.isInInteraction = true/false`
- **EntityManager**: Only updates entities tagged `'interaction_active'`
- **What pauses**: All entities except interaction-active ones
- **What continues**: Rendering, camera, interaction entities

### 4. InteractionComponent Lifecycle ✓
- **Always present** on player (added in PlayerEntity factory)
- **Dormant** until activated (`isActive = false`)
- **Activated** when moveTo() or look() called
- **Tags player** as `'interaction_active'` when active
- **No add/remove** - just activate/deactivate

### 5. Async Component Init Pattern ✓
- **Don't use init()** - it's not async in our ECS
- **Use update()** - trigger on first frame with `hasTriggered` flag
- **Pattern**: Standard for async initialization in our codebase

### 6. Scene Access for EntityManager ✓
- **Add Entity.getScene()** - returns scene from sprite components
- **EntityManager** gets scene from first entity
- **Simple and clean** - no breaking changes

### 7. Speech Box Design ✓
- **No gradient** - use border instead (simpler)
- **Border**: Darker color than fill
- **Fill**: Lighter color based on speech.setColor()
- **Example**: Green = light green fill + dark green border

### 8. Color Tag Limitations ✓
- **No nested tags** - throw error
- **No spanning line breaks** - keep colored text on same line
- **Multiple text objects** - positioned side-by-side
- **Simple parsing** - regex or state machine

### 9. Error Handling ✓
- **All errors**: console.error() and crash game
- **No recovery** - fail fast during development
- **Build validation**: Deferred to future enhancement

### 10. Input During Interaction ✓
- **Only space/touch** - to skip/dismiss speech
- **No other input** - ESC, editor, etc. disabled
- **InputComponent.enabled = false** - blocks all game input

---

## API Summary

### Lua API (Exposed via lua.global.set())

**Commands** (queued during Lua phase):
```lua
wait(ms)
say(name, text, talkSpeed, timeout)
player.moveTo(col, row, speed)
player.look(direction)
speech.setColor(color)
```

**Properties** (immediate execution during Lua phase):
```lua
coins.get()      -- Returns number
coins.spend(amount)  -- Modifies state immediately
coins.obtain(amount) -- Modifies state immediately
```

### Direction Strings
- "down", "up", "left", "right"
- "down_left", "down_right", "up_left", "up_right"

### Color Strings
- Box colors: "blue", "black" (default), "purple", "gold"
- Text colors: "red", "green", "purple", "gold"

---

## Implementation Order (Revised)

### Phase 1: Core Infrastructure (8-10 hours)
1. Add interaction entity type (15min)
2. Create LuaRuntime with command queue (3-4h)
3. Create InteractionTriggerComponent (1h)
4. Create InteractionState (2-3h)
5. Add Entity.getScene() (15min)
6. Add EntityManager pause (30min)
7. Add InputComponent.enabled (15min)
8. Add HudScene.setVisible() (30min)
9. Integrate with GameScene (30min)

### Phase 2: Entity Commands (6-8 hours)
1. Create InteractionComponent (dormant, always on player) (4-5h)
2. Add to PlayerEntity factory (15min)
3. Update WalkComponent (check isActive) (15min)
4. Add CoinCounterComponent methods (30min)
5. Test moveTo and look commands (1-2h)

### Phase 3: Speech Box (8-10 hours)
1. Create SpeechBoxComponent (6-8h)
   - Rounded rectangle with border
   - Text animation
   - Color tag parsing
   - Skip functionality
2. Integrate with LuaRuntime (1h)
3. Test speech.setColor() (1h)

### Phase 4: Testing (4-6 hours)
1. Create test interactions (2h)
2. Integration testing (2-3h)
3. Bug fixes and polish (1h)

**Total**: 26-34 hours (reduced from 35-48 by removing build validation)

---

## Key Patterns to Follow

### 1. Error Handling
```typescript
try {
  // ... operation
} catch (error) {
  console.error('[Interaction] Error:', error);
  throw error; // Crash game
}
```

### 2. Promise Resolution
```typescript
return new Promise<void>(resolve => {
  // ... do work
  resolve(); // When complete
});
```

### 3. Entity Tagging
```typescript
// Activate
this.entity.tags.add('interaction_active');
this.isActive = true;

// Deactivate
this.entity.tags.delete('interaction_active');
this.isActive = false;
```

### 4. Component Check Pattern
```typescript
const comp = this.entity.get(SomeComponent);
if (comp?.isActive) return; // Skip if active
```

---

## Testing Strategy

### Manual Testing
1. Create test interaction in level JSON
2. Trigger via event
3. Verify game pauses correctly
4. Verify HUD hides
5. Verify commands execute sequentially
6. Verify errors crash game with clear messages

### Test Interactions
- `test_shop.lua` - Conditionals and coins
- `test_movement.lua` - moveTo and look
- `test_speech.lua` - Speech box with color tags
- `test_complex.lua` - Nested conditionals

---

## Success Criteria

✅ Interaction entities spawn on events
✅ Scripts load from .lua files
✅ Lua phase builds command queue instantly
✅ Commands execute sequentially
✅ Game pauses (only interaction-active entities update)
✅ HUD hides
✅ Player can move during interactions
✅ Speech box renders with colors and tags
✅ All errors crash game with clear messages
✅ Build and lint pass

---

This document captures all clarifications from the scrutiny session. Use this alongside the requirements, design, and tasks documents.
