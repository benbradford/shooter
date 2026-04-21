# World State System

## Overview

The world state system maintains game progress across level transitions, ensuring that:
- Destroyed enemies stay destroyed when re-entering levels
- Spawned enemies (from events) persist if not killed
- Cell modifications persist (doors opened, walls removed)
- Player health, overheal, and coins carry between levels
- Exit triggers don't cause infinite loops
- Global flags persist for quest/story tracking

## Usage

### Saving World State

Press **Y** during gameplay to:
- Copy world state JSON to clipboard
- Log world state to console
- Manually paste into `public/states/default.json` to persist

**Auto-save**: State auto-saves on level transition and player death to the active profile file.

### Loading World State

The game automatically loads the active profile's state file on startup. When using `?level=` param, loads `default.json`. When using the profile select screen, loads `ProfileX.json`.

### Platform-Specific Storage

**Dev server (localhost:5173):**
- Save/load uses Vite dev server API (`/api/save-state`, `/api/profiles`)
- Writes directly to `public/states/{profile}.json`
- Editor changes to state files are picked up on game refresh

**Android / Production (Capacitor):**
- Save/load uses `localStorage` (keys: `state_{profileName}`)
- Detected automatically by probing `/api/profiles` on first save/load
- First launch with no localStorage falls back to bundled `states/empty.json` template
- Profile listing, creation, and deletion all use localStorage

**Detection logic:** `WorldStateManager.shouldUseLocalStorage()` probes `/api/profiles` once — if it returns a JSON array, dev server is available; otherwise localStorage is used.

### Time Played

The `timePlayed` field tracks real elapsed seconds. Updated on level transitions, player death, and manual save (Y key).

## Global Flags

Flags allow storing arbitrary key-value pairs for quest tracking, story progression, etc.

### In Lua Scripts

```lua
-- Set flags (accepts strings or numbers, stored as strings)
setFlag("questStage", 1)
setFlag("hasKey", "true")
setFlag("enemiesDefeated", 5)

-- Check conditions
if isFlagCondition("questStage", "gte", 2) then
  say("NPC", "You've made progress!", 50, 2000)
end

if isFlagCondition("hasKey", "eq", "true") then
  -- Unlock door
end
```

### API

**setFlag(name, value)**
- Sets or updates a flag
- Value can be string or number (converted to string)

**isFlagCondition(name, condition, value)**
- Compares flag value with condition
- Conditions: `"eq"`, `"neq"`, `"gt"`, `"lt"`, `"gte"`, `"lte"`
- Returns `false` if flag doesn't exist
- Returns `false` and logs error if using gt/lt/gte/lte with non-numeric values

### Persistence

- Flags persist across level transitions (in memory)
- Flags persist across game sessions when saved (Y key)
- Flags reset on new game start (same as other world state)

### Known Gameplay Flags

| Flag | Values | Effect |
|------|--------|--------|
| `canPunch` | `"true"` | Enables punch ability |
| `canSwim` | `"true"` | Enables swimming (70% speed in water) |
| `hasSuperPunch` | `"true"` | Enables super punch on 1s+ charge hold |
| `hasCompanion` | `"true"` | Spawns companion (Narry) |
| `pet_rock_collected` | `"true"` | Rock pet available |
| `pet_dog_collected` | `"true"` | Dog pet available |
| `pet_selected` | `"rock"` / `"dog"` | Active pet |

## How It Works

### Entity Spawning Logic

**Immediate spawn entities** (no `createOnAnyEvent`):
```
if entity.respawnable → always spawn (even if destroyed)
else if entity.id in destroyedEntities → don't spawn
else → spawn normally
```

**Event-driven entities** (has `createOnAnyEvent`):
```
if entity.id in liveEntities → spawn (was spawned and still alive)
else if entity.id in destroyedEntities → don't spawn (was killed)
else → don't spawn (event hasn't fired yet)
```

### Respawnable Entities

Entities can be marked as `respawnable` in the editor:
- **Default**: `respawnable = false` (destroyed entities stay destroyed)
- **When `respawnable = true`**: Entity respawns every time you re-enter the level, even if destroyed
- **Use cases**: Breakable objects (vases, crates), training dummies, resource nodes
- **Editor**: Click entity → Check "Respawnable" checkbox → Click Log to save

**Example in level JSON:**
```json
{
  "id": "breakable0",
  "type": "breakable",
  "respawnable": true,
  "data": {
    "col": 10,
    "row": 5,
    "texture": "dungeon_vase",
    "health": 1
  }
}
```

### Entity Tracking

Only entities from level JSON are tracked (ID pattern: `{type}{number}` like "skeleton0", "bug_base1"):
- Each entity has a `levelName` property set when spawned
- Temporary entities (bullets, coins, particles) are not tracked
- Interaction and cell_modifier entities are excluded from tracking (they self-destruct after executing)
- Entities are only added to `destroyedEntities` for their own level
- Lever state persists via flags: `lever_{entityId}` (on/off) and `lever_{entityId}_locked` (one-shot)

### Trigger Handling

**Exit triggers:**
- Tracked in `firedTriggers` when fired
- Not created on level re-entry if already fired
- Prevents infinite level hopping

**Regular one-shot triggers:**
- Tracked in `firedTriggers` when fired
- Not created on level re-entry if already fired
- Prevents re-spawning enemies

### Player Spawn Priority

```
1. world_state.player.spawnCol/spawnRow (from exit transition)
2. level.playerStart (first time entering level)
```

### Cell Modifications

Modified cells are tracked in `modifiedCells` — stores final cell state (properties, texture, layer). When loading, modified cells override level JSON and affected cell sprites are destroyed and recreated.

### Coin Collection

Coins collected are tracked globally:
- Coins fly to HUD counter when collected
- Count persists across level transitions
- Displayed in top-left corner with coin icon

### Exhausted Bug Bases

When bug bases are destroyed:
- Bug base entity destroyed and tracked in `destroyedEntities`
- Exhausted entity (`bug_base1_exhausted`) created showing destroyed sprite
- Exhausted entity added to `liveEntities`
- On level re-entry, exhausted entity spawns instead of bug base

## State Updates

**On entity spawn (via event):**
- Set `entity.levelName` to current level
- Add to `liveEntities`

**On entity destruction:**
- Check if entity has `levelName` and matches pattern `{type}{number}`
- Remove from `liveEntities` (if present)
- Add to `destroyedEntities` for that level
- **Not tracked during `resetScene()`** (level transitions)

**On trigger fire:**
- Add to `firedTriggers`

**On coin collection:**
- Coin flies to HUD counter
- Adds 1 to player coins when reaching HUD

**On level transition:**
- Update player health, overheal, and coins
- Update current level
- Update spawn position
- Scan and save modified cells

**On Y key press:**
- Serialize world state to JSON
- Copy to clipboard
- Log to console

## Files

- `src/systems/WorldState.ts` - Type definitions
- `src/systems/WorldStateManager.ts` - Singleton manager
- `src/systems/EntityLoader.ts` - Check world state before spawning
- `src/systems/EntityCreatorManager.ts` - Track liveEntities on spawn
- `src/ecs/Entity.ts` - Track destroyedEntities on destroy
- `src/ecs/components/core/TriggerComponent.ts` - Track firedTriggers
- `src/ecs/components/core/CellModifierComponent.ts` - Track modifiedCells
- `src/ecs/components/pickup/CoinComponent.ts` - Add coins when collected
- `src/ecs/components/ui/CoinCounterComponent.ts` - Display coin count
- `src/ecs/components/visual/BaseExplosionComponent.ts` - Create exhausted entities
- `src/ecs/entities/bug/ExhaustedBugBaseEntity.ts` - Exhausted bug base factory
- `src/scenes/GameScene.ts` - Load/save world state, apply to level
- `public/states/default.json` - Saved state file (gitignored)

## Testing

1. Start game (loads dungeon1 with 100 health, 0 coins)
2. Kill an enemy (e.g., skeleton0)
3. Collect coins from breakables
4. Exit to another level
5. Return to dungeon1
6. Verify skeleton0 is still dead and coin count persists
7. Press Y to save state
8. Refresh browser
9. Verify game loads with saved state (skeleton0 still dead, same health, same coins)

## Known Limitations

- Pickups (medipacks) are not tracked - they respawn on re-entry
- Player death/respawn not yet implemented (uses `entryCell` for future feature)
