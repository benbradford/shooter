# NPC System Implementation Guide

## For New Kiro Sessions

### Quick Start

Say: "Implement the NPC system from features/npc/"

### What's Already Done

- [x] Requirements documented
- [x] Design documented
- [x] Tasks broken down
- [ ] Core NPC entity created
- [ ] Interaction system integrated
- [ ] UI integration complete
- [ ] Testing complete

### Key Documents (Read in Order)

1. **README.md** (this file) - Start here
2. **requirements.md** - What the system does
3. **design.md** - How it works
4. **tasks.md** - Implementation breakdown

### Critical Design Decisions

1. **No collision** - NPCs are ghost-like, player walks through them
2. **Range calculation** - NPC center to player collision box center (100px)
3. **Lips icon** - Replaces punch icon on AttackButtonComponent
4. **Closest NPC** - When multiple in range, closest is selected
5. **Position override** - NPC stays visual position, override only affects range
6. **Face each other** - Player and NPC turn to face each other on interaction start
7. **Priority order** - First valid interaction used, warn if multiple valid
8. **Asset loading** - On-demand per level, same as enemies
9. **Static vs animated** - Detect frame count, animate if >1 frame
10. **No valid interactions** - NPC renders, no lips icon, console warning
11. **Centralized animations** - NPCAnimations.ts creates all animations (like SkeletonAnimations.ts)
12. **Direction updates** - NPCIdleComponent.setDirection() method for dynamic direction changes
13. **Direction enum** - Uses Direction (not Direction8) throughout
14. **NPCManager caching** - Only recalculates closest NPC when player moves to new cell
15. **dirFromDelta() utility** - Exposed to Lua as calculateDirection() for facing logic
16. **Editor integration** - Full editor support with direction cycling and interaction configuration

### Example NPC Definition

```json
{
  "id": "npc1",
  "type": "npc",
  "data": {
    "assets": "npc1",
    "col": 11,
    "row": 21,
    "direction": "south",
    "interactions": [
      {
        "name": "npc1_alt_interaction",
        "whenFlagSet": {
          "name": "npc1_condition",
          "condition": "equals",
          "value": "on"
        },
        "position": {
          "col": 5,
          "row": 8
        }
      },
      {
        "name": "npc1_default_interaction"
      }
    ]
  }
}
```

### Example Interaction Script

```lua
-- Calculate directions
local playerToNPC = calculateDirection(player.col, player.row, npc.col, npc.row)
local npcToPlayer = calculateDirection(npc.col, npc.row, player.col, player.row)

-- Face each other
player.look(playerToNPC)
npc.look(npcToPlayer)

-- Continue with interaction
say("NPC", "Hello, traveler!", 50, 2000)
```

### Implementation Order

**Phase 1: Core NPC Entity** (2 hours)
1. Add NPC entity type
2. Create NPCEntity factory
3. Create NPCIdleComponent
4. Add NPC assets to AssetRegistry
5. Update AssetLoader

**Phase 2: Interaction System Integration** (2.5 hours)
1. Create NPCInteractionComponent
2. Create NPCManager
3. Initialize NPCManager in GameScene

**Phase 3: UI Integration** (1.25 hours)
1. Create lips icon asset
2. Add lips icon to AssetRegistry
3. Update AttackButtonComponent
4. Update InputComponent

**Phase 4: Interaction Behavior** (2 hours)
1. Add NPC look command to LuaRuntime
2. Pass NPC ID to InteractionState
3. Add direction calculation helper
4. Expose direction helper to Lua

**Phase 5: Testing and Polish** (3 hours)
1. Create test NPC
2. Create test interaction scripts
3. Manual testing
4. Fix bugs and polish

### Success Criteria

- [ ] NPCs spawn at specified positions
- [ ] NPCs play idle animations (static or looping)
- [ ] NPCs don't block player movement
- [ ] Lips icon appears when NPC in range with valid interaction
- [ ] Space/attack button triggers interaction instead of punch
- [ ] Closest NPC selected when multiple in range
- [ ] Flag conditions evaluated correctly
- [ ] Position overrides work for range calculation
- [ ] Player and NPC face each other on interaction start
- [ ] Edge cases handled with appropriate warnings
- [ ] Build and lint pass with zero errors

### Files to Create

- `src/ecs/entities/npc/NPCEntity.ts`
- `src/ecs/components/npc/NPCIdleComponent.ts`
- `src/ecs/components/npc/NPCInteractionComponent.ts`
- `src/systems/NPCManager.ts`
- `src/utils/DirectionUtils.ts`
- `public/assets/ui/lips_icon.png`

### Files to Modify

- `src/systems/level/LevelLoader.ts`
- `src/systems/EntityLoader.ts`
- `src/assets/AssetRegistry.ts`
- `src/assets/AssetLoader.ts`
- `src/ecs/components/ui/AttackButtonComponent.ts`
- `src/ecs/components/input/InputComponent.ts`
- `src/scenes/GameScene.ts`
- `src/systems/LuaRuntime.ts`

### Common Pitfalls

1. **Don't add GridPositionComponent** - NPCs don't collide
2. **Don't add collision components** - NPCs are ghost-like
3. **Initialize on first update** - NPCIdleComponent needs scene reference
4. **Warn only once** - Use flags to prevent duplicate warnings
5. **Check for null** - getActiveInteraction() can return null
6. **Use position override** - For range calculation when condition is true
7. **Filter before sorting** - Only consider NPCs with valid interactions in range

### Testing Checklist

- [ ] Single NPC with no conditions
- [ ] Single NPC with flag condition (true)
- [ ] Single NPC with flag condition (false)
- [ ] Multiple NPCs in range (closest selected)
- [ ] Position override (range calculated from override)
- [ ] No valid interactions (warning logged)
- [ ] Multiple valid interactions (warning logged)
- [ ] String flag with numeric comparison (error logged)
- [ ] Missing flag (condition fails silently)
- [ ] Icon switches smoothly (no flicker)
- [ ] Space triggers interaction
- [ ] Attack button triggers interaction
- [ ] Punch works when no NPC in range
- [ ] Player and NPC face each other
- [ ] Static sprite (1 frame)
- [ ] Animated sprite (>1 frames)

Good luck! 🚀
