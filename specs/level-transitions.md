# Level Transitions Specification

## Overview

Enable players to move between levels by entering designated exit cells. When a player enters an exit cell, the game transitions to a new level and spawns the player at a specified entrance position.

## Requirements

### Functional Requirements

1. **Exit Definition**
   - Exits are defined in level JSON
   - Each exit specifies target level and spawn position
   - Exits can be triggered by entering specific grid cells
   - Multiple exits can exist in a single level

2. **Transition Behavior**
   - Player enters exit cell → trigger fires
   - Current level unloads (cleanup)
   - Target level loads with required assets
   - Player spawns at specified entrance position
   - Transition should be seamless (no visible artifacts)

3. **Visual Feedback**
   - Exit cells should be visually distinct
   - Optional: Add cell property for custom rendering
   - Optional: Show direction indicator (arrow, glow)

4. **Bidirectional Travel**
   - Exits can link back to previous levels
   - Each level defines its own exits
   - No automatic "return" exits (must be explicitly defined)

### Non-Functional Requirements

1. **Performance**
   - Level transition should complete within 1 second
   - No memory leaks from previous level
   - Asset loading should be efficient

2. **Maintainability**
   - Use existing trigger system
   - Minimal new code
   - Easy to configure in level JSON

## Design

### Level JSON Schema

Add two new optional fields to level data:

```typescript
type LevelData = {
  // ... existing fields
  exits?: LevelExit[];
}

type LevelExit = {
  eventName: string;        // Links to trigger event
  targetLevel: string;      // Level filename (without .json)
  targetCol: number;        // Spawn column in target level
  targetRow: number;        // Spawn row in target level
  description?: string;     // Optional: "Exit to Dungeon Level 2"
}
```

### Example Level JSON

```json
{
  "width": 30,
  "height": 30,
  "playerStart": { "x": 5, "y": 5 },
  "triggers": [
    {
      "eventName": "exit_to_dungeon2",
      "triggerCells": [
        { "col": 28, "row": 15 }
      ],
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

### Implementation Components

#### 1. LevelLoader Updates

**File**: `src/systems/level/LevelLoader.ts`

Add `exits` field to `LevelData` type:

```typescript
export type LevelData = {
  // ... existing fields
  exits?: LevelExit[];
}

export type LevelExit = {
  eventName: string;
  targetLevel: string;
  targetCol: number;
  targetRow: number;
  description?: string;
}
```

#### 2. GameScene Updates

**File**: `src/scenes/GameScene.ts`

**A. Update loadLevel signature:**

```typescript
async loadLevel(levelName: string, spawnCol?: number, spawnRow?: number): Promise<void> {
  this.currentLevelName = levelName;
  this.levelData = await LevelLoader.load(levelName);

  // Override spawn position if provided
  if (spawnCol !== undefined && spawnRow !== undefined) {
    this.levelData.playerStart = { x: spawnCol, y: spawnRow };
  }

  // ... rest of existing load logic
}
```

**B. Register exit event listeners:**

```typescript
private registerExitListeners(): void {
  if (!this.levelData.exits) return;

  for (const exit of this.levelData.exits) {
    this.eventManager.on(exit.eventName, () => {
      void this.transitionToLevel(exit.targetLevel, exit.targetCol, exit.targetRow);
    });
  }
}

private async transitionToLevel(targetLevel: string, spawnCol: number, spawnRow: number): Promise<void> {
  // Unregister current exit listeners
  this.unregisterExitListeners();
  
  // Load new level with spawn position
  await this.loadLevel(targetLevel, spawnCol, spawnRow);
}

private unregisterExitListeners(): void {
  if (!this.levelData.exits) return;

  for (const exit of this.levelData.exits) {
    this.eventManager.off(exit.eventName);
  }
}
```

**C. Call registerExitListeners in initializeScene:**

```typescript
private initializeScene(): void {
  // ... existing initialization code
  
  this.spawnEntities();
  
  // Register exit listeners after entities are spawned
  this.registerExitListeners();
  
  // ... rest of initialization
}
```

#### 3. Visual Feedback (Optional)

**File**: `src/systems/grid/Grid.ts` or renderer

Add special rendering for cells with `"exit"` property:
- Render with different tint/glow
- Add pulsing animation
- Show directional arrow

#### 4. Asset Registry Updates

**File**: `src/assets/AssetRegistry.ts`

Add exit-related assets if using custom visuals:

```typescript
dungeon_door: {
  key: 'dungeon_door',
  path: 'assets/cell_drawables/dungeon_door.png',
  type: 'image'
}
```

## Usage Examples

### Example 1: Simple Exit

**dungeon1.json:**
```json
{
  "triggers": [
    {
      "eventName": "exit_east",
      "triggerCells": [{ "col": 29, "row": 15 }],
      "oneShot": false
    }
  ],
  "exits": [
    {
      "eventName": "exit_east",
      "targetLevel": "dungeon2",
      "targetCol": 1,
      "targetRow": 15
    }
  ]
}
```

**dungeon2.json:**
```json
{
  "triggers": [
    {
      "eventName": "exit_west",
      "triggerCells": [{ "col": 0, "row": 15 }],
      "oneShot": false
    }
  ],
  "exits": [
    {
      "eventName": "exit_west",
      "targetLevel": "dungeon1",
      "targetCol": 28,
      "targetRow": 15
    }
  ]
}
```

### Example 2: Multiple Exits

**hub.json:**
```json
{
  "triggers": [
    {
      "eventName": "exit_to_dungeon",
      "triggerCells": [{ "col": 10, "row": 5 }],
      "oneShot": false
    },
    {
      "eventName": "exit_to_swamp",
      "triggerCells": [{ "col": 20, "row": 5 }],
      "oneShot": false
    }
  ],
  "exits": [
    {
      "eventName": "exit_to_dungeon",
      "targetLevel": "dungeon1",
      "targetCol": 15,
      "targetRow": 28,
      "description": "Enter the Dungeon"
    },
    {
      "eventName": "exit_to_swamp",
      "targetLevel": "swamp1",
      "targetCol": 15,
      "targetRow": 28,
      "description": "Enter the Swamp"
    }
  ]
}
```

### Example 3: Stairs Between Floors

**dungeon1.json:**
```json
{
  "triggers": [
    {
      "eventName": "stairs_down",
      "triggerCells": [{ "col": 15, "row": 15 }],
      "oneShot": false
    }
  ],
  "exits": [
    {
      "eventName": "stairs_down",
      "targetLevel": "dungeon_basement",
      "targetCol": 15,
      "targetRow": 15,
      "description": "Stairs to Basement"
    }
  ],
  "cells": [
    {
      "col": 15,
      "row": 15,
      "layer": 0,
      "properties": ["exit", "stairs"],
      "backgroundTexture": "stone_stairs"
    }
  ]
}
```

## Testing Checklist

### Manual Testing

- [ ] Player enters exit cell → level transition occurs
- [ ] Player spawns at correct position in new level
- [ ] Previous level is fully cleaned up (no artifacts)
- [ ] Assets for new level are loaded
- [ ] Can transition back to previous level
- [ ] Multiple exits in same level work independently
- [ ] Exit triggers can be re-entered (oneShot: false)
- [ ] Exit cells have visual distinction (if implemented)

### Edge Cases

- [ ] Exit to non-existent level → handle gracefully (error message)
- [ ] Exit with invalid spawn position → clamp to valid grid
- [ ] Rapid re-entry of exit cell → debounce or ignore
- [ ] Exit during combat/animation → ensure clean transition
- [ ] Memory usage stable after multiple transitions

### Performance Testing

- [ ] Transition completes within 1 second
- [ ] No memory leaks after 10+ transitions
- [ ] Asset loading doesn't block game loop
- [ ] Previous level assets are unloaded (if implemented)

## Future Enhancements

### Phase 2 (Optional)

1. **Transition Effects**
   - Fade to black
   - Screen wipe
   - Loading indicator

2. **Conditional Exits**
   - Locked doors (require key)
   - Level-based unlocking
   - Quest-gated exits

3. **Exit Animations**
   - Door opening animation
   - Portal swirl effect
   - Player walk-in animation

4. **Level History**
   - Track visited levels
   - Remember previous spawn points
   - Quick travel system

5. **Exit Entities**
   - Replace trigger-based with entity-based
   - Visual door/portal sprites
   - Interaction prompt ("Press E to enter")

## Implementation Priority

1. **Phase 1 (MVP)**: Core trigger-based system
   - Update LevelData type
   - Implement loadLevel with spawn override
   - Add exit event listeners
   - Test with 2 connected levels

2. **Phase 2**: Visual feedback
   - Add "exit" cell property rendering
   - Add door/portal textures
   - Test with multiple exits

3. **Phase 3**: Polish
   - Transition effects
   - Loading indicators
   - Error handling

## Dependencies

- Existing trigger system (`TriggerEntity`, `TriggerComponent`)
- Event manager system (`EventManagerSystem`)
- Level loading system (`LevelLoader`)
- Asset loading system (`AssetLoader`)

## Breaking Changes

None. This is purely additive:
- New optional fields in level JSON
- New optional parameters in `loadLevel()`
- Backward compatible with existing levels

## Documentation Updates

After implementation, update:
- `docs/level-system.md` - Add exit configuration
- `docs/level-loading.md` - Document spawn override
- `README.md` - Add example of connected levels
