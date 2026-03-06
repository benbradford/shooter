# Interaction System Implementation Guide

## ✅ IMPLEMENTATION COMPLETE!

The interaction system is fully implemented and working. This document is now a reference for understanding and using the system.

---

## Quick Usage

### Creating an Interaction

1. **Create Lua script** in `public/interactions/my_interaction.lua`:
```lua
speech.backgroundColor("purple")
speech.textColor("gold")
say("Akari", "Hello <red>world</red>!", 50, 3000)
player.moveTo(10, 5, 200)
coins.spend(50)
```

2. **Add to level JSON**:
```json
{
  "entities": [
    {
      "id": "interaction0",
      "type": "interaction",
      "createOnAnyEvent": ["my_event"],
      "data": {
        "filename": "my_interaction"
      }
    }
  ]
}
```

3. **Trigger with event** (e.g., from a trigger entity)

---

## For New Kiro Sessions

If you need to modify or extend this system:

### Quick Start

**Say this to Kiro:**
> "Implement the interaction system. Read `features/interactions/README.md`, then `implementation-clarifications.md` for critical design decisions, then proceed with requirements and tasks."

### What's Already Done

✅ **Complete implementation** - All phases finished
✅ **Wasmoon integrated** - Command queue approach working
✅ **Entity system integration** - Uses existing event system
✅ **Player movement** - Pathfinding with animations
✅ **Speech box** - Colors, tags, animations, skip
✅ **Coin animations** - Count up/down one-by-one
✅ **Tested and working** - Ready for production use

### Key Documents (Read in Order)

1. **`README.md`** (this file) - Overview

2. **`implementation-clarifications.md`** ⭐ **START HERE**
   - All critical design decisions
   - Command queue approach
   - Pause mechanism
   - InteractionComponent lifecycle
   - Error handling patterns
   - Success criteria

3. **`interaction-system-requirements.md`** - Technical spec
   - All API definitions with code
   - Acceptance criteria
   - Implementation examples

4. **`interaction-system-design.md`** - Architecture
   - Component diagrams
   - Data flow
   - Wasmoon usage guide

5. **`interaction-system-tasks.md`** - Task breakdown
   - 4 phases
   - 24 tasks
   - Dependencies
   - Estimates

### How Interactions Work

**Level JSON**:
```json
{
  "entities": [
    {
      "id": "interaction0",
      "type": "interaction",
      "createOnAnyEvent": ["enterShop"],
      "data": {
        "filename": "shopInteraction0"
      }
    }
  ]
}
```

**Flow**:
1. Event fires ("enterShop")
2. EntityCreatorManager spawns interaction entity
3. InteractionTriggerComponent loads `shopInteraction0.lua`
4. Triggers InteractionState with script content
5. Entity destroys itself
6. InteractionState executes script
7. Returns to InGameState when complete

**No separate InteractionEventManager needed** - uses existing entity system!

### Implementation Order

**Phase 1: Core Infrastructure** (9-12 hours)
1. LuaRuntime wrapper (wasmoon)
2. InteractionAPI (stub methods)
3. InteractionEventManager
4. InteractionState
5. GameScene integration

**Phase 2: Entity Commands** (7-8 hours)
1. InteractionComponent (moveTo, look)
2. WalkComponent integration
3. Coin properties

**Phase 3: Scene Commands** (9-12 hours)
1. wait() command
2. SpeechBoxComponent (complex - HUD graphics, color tags, gradient)
3. speech.setColor() command

**Phase 4: Conditionals** (1 hour)
- Test Lua conditionals (already supported)

**Phase 5: Build Validation** (3-4 hours)
- Interaction validator script
- Package.json integration

**Phase 6: Testing** (6-9 hours)
- Test interactions
- Integration testing
- Polish

### Critical Design Decisions

1. **Using wasmoon** (not fengari-web)
   - Lua 5.4 via WebAssembly
   - 112KB bundle size
   - Clean API: `lua.global.set()`
   - Parameters work correctly

2. **Flat API structure**
   - `coins.get()` not `player.coins.get()`
   - `player.moveTo()` not nested
   - Wasmoon handles this better

3. **Speech box uses HUD graphics**
   - No PNG asset needed
   - Rounded rectangle (10px corners)
   - 80% alpha
   - Gradient blend mode
   - Centered bottom (55%-95% height, 60% width)
   - Color tags: `<red>`, `<green>`, `<purple>`, `<gold>`

4. **Blocking commands**
   - Each command returns Promise
   - Script execution is sequential
   - Intentional design for cutscenes

5. **Error handling**
   - Build-time validation (syntax + API)
   - Runtime: log and crash (fail fast)

### Example Interaction Script

```lua
-- public/assets/interactions/test_shop.lua
if coins.get() >= 50 then
  player.moveTo(10, 5, 200)
  player.look("down_left")
  wait(500)
  speech.setColor("purple")
  say("Akari", "I'll <gold>buy</gold> this!", 50, 3000)
  coins.spend(50)
else
  speech.setColor("gold")
  say("Akari", "Need <red>50 coins</red>!", 50, 3000)
end
```

### Testing the Implementation

After each phase:
```bash
npm run build                # Must pass
npx eslint src --ext .ts     # Must pass
```

Create test interactions and trigger them via events to verify functionality.

### Common Pitfalls to Avoid

1. **Don't use nested object methods** - Wasmoon has issues with `player.coins.spend()`
2. **Always use Promises** - Commands must block until complete
3. **Don't forget to pause game state** - Enemies, projectiles, timers must pause
4. **Test color tags early** - Parsing `<red>text</red>` is tricky
5. **Gradient blend mode** - May need experimentation to look good

### Questions?

If anything is unclear:
1. Check the requirements doc first
2. Check the design doc for architecture
3. Check the tasks doc for implementation order
4. Ask clarifying questions before implementing

### Success Criteria

The system is complete when:
- ✅ Can trigger interactions via events
- ✅ Game pauses correctly (enemies, projectiles, HUD)
- ✅ Player can move and look during interactions
- ✅ Speech box renders with gradient and color tags
- ✅ Conditionals work (if/then/else)
- ✅ Build-time validation catches errors
- ✅ All test interactions work
- ✅ Build and lint pass with zero errors

Good luck! 🚀
