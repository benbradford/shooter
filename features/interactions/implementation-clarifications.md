# Interaction System - Implementation Clarifications

## ✅ IMPLEMENTATION COMPLETE

**Status**: Fully implemented and working!

**Implementation Time**: ~3 hours (vs 26-34 hour estimate)

**Why so fast**: Complete design with zero ambiguities made implementation smooth.

---

## What Was Implemented

### Phase 1: Core Infrastructure ✅
- InteractionEntity with type 'interaction'
- InteractionTriggerComponent (loads .lua files from `public/interactions/`)
- InteractionState (pauses game, executes command queue)
- LuaRuntime with command queue approach
- EntityManager pause mechanism (checks `scene.isInInteraction`)
- Entity.getScene() method
- InputComponent.enabled property
- HudScene.setVisible() method
- GameScene.startInteraction() method

### Phase 2: Entity Commands ✅
- InteractionComponent (always on player, dormant until activated)
- player.moveTo(col, row, speed) - Pathfinding with walk/swim animations
- player.look(direction) - Changes facing direction
- WalkComponent checks InteractionComponent.isActive
- PlayerIdleState and PlayerWalkState check InteractionComponent.isActive
- coins.get(), coins.spend(), coins.obtain() with animated counting

### Phase 3: Speech Box ✅
- SpeechBoxComponent with rounded rectangle and border
- Background colors: blue, black, purple, gold
- Text colors: white (default), gold, red, green, purple, blue
- Character-by-character animation (50ms default)
- Punctuation delays (300ms for `.`, `!`, `?`)
- Color tags: `<red>`, `<green>`, `<purple>`, `<gold>`
- `<newline/>` support
- Skip functionality: First press = 10ms speed, second press = dismiss
- Continue indicator: Pulsing down arrow after text complete
- Positioned using camera dimensions (not displaySize)

---

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

**Commands** (queued during Lua phase, executed sequentially):
```lua
wait(ms)                          -- Pause for duration
say(name, text, talkSpeed, timeout) -- Show speech box
player.moveTo(col, row, speed)    -- Move with pathfinding
player.look(direction)            -- Change facing
speech.backgroundColor(color)     -- Set box color
speech.textColor(color)           -- Set default text color
coins.spend(amount)               -- Remove coins with animation (50ms per coin)
coins.obtain(amount)              -- Add coins with animation (50ms per coin)
```

**Properties** (immediate execution during Lua phase):
```lua
coins.get()      -- Returns current coin count
```

### Direction Strings
- "down", "up", "left", "right"
- "down_left", "down_right", "up_left", "up_right"

### Color Strings
- Box colors: "blue", "black" (default), "purple", "gold"
- Text colors: "white" (default), "gold", "red", "green", "purple", "blue"
- Tag colors: `<red>`, `<green>`, `<purple>`, `<gold>`

---

## Example Interaction Script

```lua
-- public/interactions/shop_example.lua

-- Check if player has enough coins
if coins.get() >= 50 then
  speech.backgroundColor("purple")
  speech.textColor("gold")
  say("Akari", "Welcome to my <red>shop</red>!<newline/>You have enough coins.", 50, 3000)
  
  player.moveTo(24, 3, 200)
  player.look("down")
  wait(500)
  
  say("Akari", "Here's your item!", 50, 2000)
  coins.spend(50)  -- Animated removal
  
  wait(1000)
  say("Akari", "Thank you!", 50, 2000)
else
  speech.backgroundColor("gold")
  say("Akari", "You need <red>50 coins</red> to shop here!", 50, 3000)
end
```

---

## Implementation Notes

### Animation Fix
- **Problem**: Calling `animationSystem.play()` every frame restarts animation
- **Solution**: Track `currentAnimKey` and only call play() when it changes
- **Pattern**: Same as PlayerWalkState

### Coin Animation
- **Problem**: coins.spend() called during Lua phase (instant)
- **Solution**: Queue coin commands, execute with animation during execution phase
- **Result**: Coins count down one-by-one (50ms each)

### Speech Box Positioning
- **Problem**: displaySize incorrect on different monitors
- **Solution**: Use `camera.width` and `camera.height` (same as HUD buttons)
- **Result**: Consistent positioning across monitors

### Color Tags vs Wrapping
- **Problem**: Multiple text objects with wrapping is very complex
- **Solution**: No automatic wrapping, use `<newline/>` in Lua scripts
- **Result**: Color tags work, manual line breaks

### HUD During Interactions
- **Problem**: Coin counter hidden during interactions
- **Solution**: Don't hide coin counter, keep it visible
- **Result**: Coin changes visible during interactions

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
✅ Scripts load from .lua files (`public/interactions/`)
✅ Lua phase builds command queue instantly
✅ Commands execute sequentially with proper async/await
✅ Game pauses (only interaction-active entities update)
✅ HUD hides (except coin counter)
✅ Player can move during interactions with pathfinding
✅ Walk/swim animations play during movement
✅ Look command changes facing direction
✅ Speech box renders with colors and border
✅ Text animates character-by-character
✅ Color tags work (`<red>`, `<green>`, `<purple>`, `<gold>`)
✅ `<newline/>` creates line breaks
✅ Skip functionality works (10ms speed)
✅ Continue indicator shows (pulsing arrow)
✅ Coins animate when spending/obtaining (50ms per coin)
✅ Coin counter stays visible and updates during interactions
✅ All errors crash game with clear messages
✅ Build and lint pass

---

## Files Created

1. ✅ `src/systems/LuaRuntime.ts` - Command queue and Lua execution
2. ✅ `src/scenes/states/InteractionState.ts` - Game state during interactions
3. ✅ `src/interaction/InteractionEntity.ts` - Entity factory
4. ✅ `src/ecs/components/interaction/InteractionTriggerComponent.ts` - Loads script
5. ✅ `src/ecs/components/interaction/InteractionComponent.ts` - Player movement/looking
6. ✅ `src/ecs/components/ui/SpeechBoxComponent.ts` - Speech box rendering
7. ✅ `src/types/wasmoon.d.ts` - Type declarations
8. ✅ `public/interactions/test_shop.lua` - Example script

## Files Modified

1. ✅ `src/systems/level/LevelLoader.ts` - Added 'interaction' to EntityType
2. ✅ `src/systems/EntityLoader.ts` - Added case for 'interaction'
3. ✅ `src/ecs/EntityManager.ts` - Added pause mechanism
4. ✅ `src/ecs/Entity.ts` - Added getScene() method
5. ✅ `src/ecs/components/input/InputComponent.ts` - Added enabled checks
6. ✅ `src/ecs/components/movement/WalkComponent.ts` - Check InteractionComponent.isActive
7. ✅ `src/ecs/components/ui/CoinCounterComponent.ts` - Added animated methods
8. ✅ `src/ecs/entities/player/PlayerEntity.ts` - Added InteractionComponent
9. ✅ `src/ecs/entities/player/PlayerIdleState.ts` - Check InteractionComponent.isActive
10. ✅ `src/ecs/entities/player/PlayerWalkState.ts` - Check InteractionComponent.isActive
11. ✅ `src/scenes/HudScene.ts` - Added setVisible(), keep coin counter visible
12. ✅ `src/scenes/GameScene.ts` - Added isInInteraction flag, startInteraction(), InteractionState
13. ✅ `src/systems/WorldStateManager.ts` - Added setPlayerCoins()
14. ✅ `public/states/empty.json` - Added 100 starting coins

---

This document captures the complete implementation. The interaction system is ready for use!
