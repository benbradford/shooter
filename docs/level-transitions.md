# Level Transitions

Level transitions allow players to move between levels by entering designated exit cells.

## How It Works

1. **Define exit entities** in level JSON `entities` array
2. **Link exits** to target levels with spawn positions
3. **Player enters exit cell** → LoadingScene handles transition
4. **Player spawns** at specified position in new level

**Implementation (March 2026):**
- WorldState persists across transitions (loads from file only once)
- URL parameter only used on first load, then WorldState
- Runtime textures (UUIDs, gradients, tilesets) filtered from unload
- Enemy textures never unloaded (have global animations, small size)
- Entities destroyed in LoadingScene.init() before scene.stop()
- Fade uses timeout (500ms) instead of camera callback (more reliable)
- All loading tests pass including round trips

## Exit Entity Format

Exits are defined as entities in the unified `entities` array. See `entity-creation-system.md` for full entity documentation.

**Key fields:** `targetLevel`, `targetCol`, `targetRow`, `triggerCells`

## Bidirectional Travel

Each level defines its own exits. To create a two-way connection, each level has an exit entity pointing to the other with appropriate spawn positions.

## Implementation Details

- Uses existing trigger/entity system
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

## Testing

Test levels are provided:
- `test_room1.json` - Dungeon theme, exit on right side
- `test_room2.json` - Swamp theme, exit on left side

Load with: `http://localhost:5173/?level=test_room1`

## Related Files

- `src/systems/LevelTransitionManager.ts` - Owns the transition flow (`start()` saves state + fades + hands off to LoadingScene; `reload()` restores the level-entry snapshot then transitions). GameScene's `startLevelTransition()` and `reloadCurrentLevel()` are 1-line delegators.
- `src/systems/level/LevelLoader.ts` - LevelExit type definition
- `src/ecs/components/level/LevelExitComponent.ts` - Exit event listener
- `src/exit/LevelExitEntity.ts` - Exit entity factory
- `src/scenes/GameScene.ts` - Transition logic with fade effects
