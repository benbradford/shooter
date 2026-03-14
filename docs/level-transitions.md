# Level Transitions

Level transitions allow players to move between levels by entering designated exit cells.

## How It Works

1. **Define exit cells** in level JSON with triggers
2. **Link exits** to target levels with spawn positions
3. **Player enters exit cell** → LoadingScene handles transition
4. **Player spawns** at specified position in new level

**Implementation (March 2026):**
- WorldState persists across transitions (loads from file only once)
- URL parameter only used on first load, then WorldState
- Runtime textures (UUIDs, gradients, tilesets) filtered from unload
- Display list cleaned on scene restart
- All 8 loading tests pass

## Level JSON Configuration

### Exit Definition

```json
{
  "triggers": [
    {
      "eventName": "exit_to_dungeon2",
      "triggerCells": [{ "col": 28, "row": 15 }],
      "oneShot": false
    }
  ],
  "exits": [
    {
      "eventName": "exit_to_dungeon2",
      "targetLevel": "dungeon2",
      "targetCol": 2,
      "targetRow": 15,
      "description": "Exit to Dungeon Level 2"
    }
  ],
  "cells": [
    {
      "col": 28,
      "row": 15,
      "layer": 0,
      "properties": ["exit"],
      "backgroundTexture": "dungeon_door"
    }
  ]
}
```

### Fields

**LevelExit:**
- `eventName` (string) - Event name that triggers this exit (must match trigger)
- `targetLevel` (string) - Target level filename without `.json`
- `targetCol` (number) - Spawn column in target level
- `targetRow` (number) - Spawn row in target level
- `description` (string, optional) - Human-readable description

**Important:** Exit cells should have `"exit"` property and a `backgroundTexture` (e.g., door sprite) for visual distinction.

## Bidirectional Travel

Each level defines its own exits. To create a two-way connection:

**Level 1:**
```json
{
  "exits": [
    {
      "eventName": "exit_east",
      "targetLevel": "level2",
      "targetCol": 1,
      "targetRow": 15
    }
  ]
}
```

**Level 2:**
```json
{
  "exits": [
    {
      "eventName": "exit_west",
      "targetLevel": "level1",
      "targetCol": 28,
      "targetRow": 15
    }
  ]
}
```

## Testing

Test levels are provided:
- `test_room1.json` - Dungeon theme, exit on right side
- `test_room2.json` - Swamp theme, exit on left side

Load with: `http://localhost:5173/?level=test_room1`

## Implementation Details

- Uses existing trigger system
- LoadingScene manages asset loading/unloading
- Player never spawns on exit cells (spawn positions are separate)
- Errors logged to console if target level doesn't exist
- All previous level entities/assets cleaned up on transition
- Runtime textures (water animations, tilesets) preserved across transitions

**Key fixes (March 2026):**
- WorldState only loads from file once (not on every scene restart)
- URL parameter only used on first load
- Runtime textures filtered from unload (UUID pattern, _gradient, _tileset, _water_)
- Display list cleaned at start of GameScene.create()
- Vignette texture key corrected ('vignette' not 'vin')
- stalking_robot asset group includes floating_robot assets

## Related Files

- `src/systems/level/LevelLoader.ts` - LevelExit type definition
- `src/ecs/components/level/LevelExitComponent.ts` - Exit event listener
- `src/exit/LevelExitEntity.ts` - Exit entity factory
- `src/scenes/GameScene.ts` - Transition logic with fade effects
