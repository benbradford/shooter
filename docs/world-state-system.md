# World State System

## Overview

The world state system maintains game progress across level transitions, ensuring that:
- Destroyed enemies stay destroyed when re-entering levels
- Spawned enemies (from events) persist if not killed
- Cell modifications persist (doors opened, walls removed)
- Player health and overheal carry between levels
- Exit triggers don't cause infinite loops

## Usage

### Saving World State

Press **Y** during gameplay to:
- Copy world state JSON to clipboard
- Log world state to console
- Manually paste into `public/states/default.json` to persist

### Loading World State

The game automatically loads `public/states/default.json` on startup if it exists.

## How It Works

### Entity Spawning Logic

**Immediate spawn entities** (no `createOnAnyEvent`):
```
if entity.id in destroyedEntities → don't spawn
else → spawn normally
```

**Event-driven entities** (has `createOnAnyEvent`):
```
if entity.id in liveEntities → spawn (was spawned and still alive)
else if entity.id in destroyedEntities → don't spawn (was killed)
else → don't spawn (event hasn't fired yet)
```

### Entity Tracking

Only entities from level JSON are tracked (ID pattern: `{type}{number}` like "skeleton0", "bug_base1"):
- Each entity has a `levelName` property set when spawned
- Temporary entities (bullets, coins, particles) are not tracked
- Entities are only added to `destroyedEntities` for their own level

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

Modified cells are tracked in two ways:
1. **cellModifierCells** - Tracks which cells were touched by cellModifiers (always saved)
2. **modifiedCells** - Stores final cell state (properties, texture, layer)

When loading, modified cells override level JSON and renderer cache is invalidated.

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

**On cellModifier execution:**
- Add modified cells to `cellModifierCells`
- Ensures cells are saved even if they look the same as original

**On level transition:**
- Update player health and overheal
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
- `src/ecs/components/core/CellModifierComponent.ts` - Track cellModifierCells
- `src/scenes/GameScene.ts` - Load/save world state, apply to level
- `public/states/default.json` - Saved state file (gitignored)

## Testing

1. Start game (loads dungeon1 with 100 health)
2. Kill an enemy (e.g., skeleton0)
3. Exit to another level
4. Return to dungeon1
5. Verify skeleton0 is still dead
6. Press Y to save state
7. Refresh browser
8. Verify game loads with saved state (skeleton0 still dead, same health)

## Known Limitations

- Pickups (coins, medipacks) are not tracked - they respawn on re-entry
- Player death/respawn not yet implemented (uses `entryCell` for future feature)
- World state only persists via manual save (Y key) until mobile deployment
