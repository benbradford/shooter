# World State System Specification

## Goal

Maintain game state across level transitions so that:
- Destroyed enemies stay destroyed when re-entering levels
- Spawned enemies (from events) persist if not killed
- Cell modifications persist (doors opened, walls removed, etc.)
- Player health carries between levels
- Exit triggers don't cause infinite loops

## World State Structure

```typescript
interface WorldState {
  player: {
    health: number;
    currentLevel: string;
    spawnCol: number;
    spawnRow: number;
    entryCell: { col: number; row: number };  // For future death/respawn
  };
  levels: {
    [levelName: string]: {
      liveEntities: string[];        // Spawned entities still alive
      destroyedEntities: string[];   // Entities that were destroyed
      firedTriggers: string[];       // One-shot triggers that fired (prevents re-firing)
      modifiedCells: Array<{         // Cells modified by cellModifiers
        col: number;
        row: number;
        properties?: string[];
        backgroundTexture?: string;
        layer?: number;
      }>;
    };
  };
}
```

## Entity Spawning Logic

### Immediate Spawn Entities (no createOnAnyEvent)
```
if (entity.id in destroyedEntities) → don't spawn
else → spawn
```

### Event-Driven Entities (has createOnAnyEvent)
```
if (entity.id in liveEntities) → spawn
else if (entity.id in destroyedEntities) → don't spawn
else → don't spawn (event hasn't fired yet)
```

### Special Cases
- **EventChainers**: Ignore (transient, not tracked)
- **CellModifiers**: Ignore (track cell state, not modifier entities)
- **Triggers**: Track in `firedTriggers`, don't create if already fired
- **Exits**: Track in `firedTriggers`, never in `destroyedEntities`

## Trigger Handling

### Exit Triggers
- Event name matches an exit's `eventName`
- Added to `firedTriggers` when fired
- **Never** added to `destroyedEntities`
- **Not created** on level re-entry if in `firedTriggers`
- Prevents infinite level hopping

### Regular One-Shot Triggers
- Added to `firedTriggers` when fired
- **Not created** on level re-entry if in `firedTriggers`
- Prevents re-spawning enemies

### Repeating Triggers (oneShot: false)
- Not tracked (can fire multiple times)

## Player Spawn Priority

```
1. world_state.player.spawnCol/spawnRow (from exit transition)
2. level.playerStart (first time entering level)
```

**Note:** `playerStart` in level JSON is now only used for first-time entry. After that, `spawnCol/spawnRow` takes precedence.

## World State Updates

### On Level Transition (Exit Trigger Fires)
1. Update `player.health` (current health)
2. Update `player.currentLevel` (target level name)
3. Update `player.spawnCol/spawnRow` (exit's targetCol/targetRow)
4. Update `player.entryCell` (same as spawnCol/spawnRow for now)
5. Scan grid, compare to original level JSON → update `modifiedCells`
6. Save world state to memory

### On Entity Spawn (via event)
1. Add entity.id to `levels[currentLevel].liveEntities`

### On Entity Destruction
1. Remove entity.id from `levels[currentLevel].liveEntities` (if present)
2. Add entity.id to `levels[currentLevel].destroyedEntities`

### On Trigger Fire
1. Add trigger's eventName to `levels[currentLevel].firedTriggers`

### On Y Key Press
1. Serialize world state to JSON
2. Copy to clipboard
3. Log to console
4. Optionally write to `public/states/default.json`

## Level Loading with World State

### 1. Load Level JSON
```typescript
const levelData = await LevelLoader.load(levelName);
```

### 2. Apply Modified Cells
```typescript
const levelState = worldState.levels[levelName];
if (levelState?.modifiedCells) {
  for (const modCell of levelState.modifiedCells) {
    // Override level JSON cell data
    grid.setCell(modCell.col, modCell.row, {
      layer: modCell.layer,
      properties: new Set(modCell.properties || []),
      backgroundTexture: modCell.backgroundTexture
    });
  }
}
```

### 3. Spawn Entities
```typescript
for (const entityDef of levelData.entities) {
  const entityId = entityDef.id;
  
  // Check if should spawn
  if (entityDef.createOnAnyEvent) {
    // Event-driven entity
    if (levelState?.liveEntities.includes(entityId)) {
      // Spawn it (was spawned and still alive)
      spawnEntity(entityDef);
    }
    // else: don't spawn (not triggered yet, or destroyed)
  } else {
    // Immediate spawn entity
    if (!levelState?.destroyedEntities.includes(entityId)) {
      spawnEntity(entityDef);
    }
    // else: don't spawn (was destroyed)
  }
  
  // Special: Don't create triggers if already fired
  if (entityDef.type === 'trigger') {
    const triggerData = entityDef.data as { eventToRaise: string };
    if (levelState?.firedTriggers.includes(triggerData.eventToRaise)) {
      continue; // Skip creating this trigger
    }
  }
}
```

### 4. Spawn Player
```typescript
const spawnCol = worldState.player.spawnCol ?? levelData.playerStart.x;
const spawnRow = worldState.player.spawnRow ?? levelData.playerStart.y;
const health = worldState.player.health ?? 100;

const player = createPlayerEntity({
  scene,
  col: spawnCol,
  row: spawnRow,
  grid,
  initialHealth: health,
  // ...
});
```

## File Storage

- **Location**: `public/states/default.json`
- **Format**: JSON matching `WorldState` interface
- **Loading**: On game start, try to load, fallback to empty state
- **Saving**: On level transition + Y key press

## Default World State (No File)

```typescript
{
  player: {
    health: 100,
    currentLevel: "dungeon1",  // Hardcoded starting level
    spawnCol: undefined,
    spawnRow: undefined,
    entryCell: { col: 0, row: 0 }
  },
  levels: {}
}
```

## Implementation Files

### New Files
- `src/systems/WorldStateManager.ts` - Singleton manager
- `src/systems/WorldState.ts` - Type definitions
- `public/states/default.json` - Saved state (created by user)

### Modified Files
- `src/systems/EntityLoader.ts` - Check world state before spawning
- `src/systems/EntityCreatorManager.ts` - Track liveEntities on spawn
- `src/scenes/GameScene.ts` - Load world state, handle transitions, Y key
- `src/ecs/Entity.ts` - Ensure id is accessible (already is)
- `src/ecs/components/level/LevelExitComponent.ts` - Update world state on transition

## Testing Checklist

- [ ] Kill enemy in level1, exit, re-enter → enemy stays dead
- [ ] Trigger spawns 5 enemies, kill 1, exit, re-enter → 4 enemies present
- [ ] Exit to level2, exit back to level1 → spawn at exit position
- [ ] Open door (cellModifier), exit, re-enter → door stays open
- [ ] Use exit trigger, re-enter level → exit doesn't fire again
- [ ] Press Y → world state in clipboard + console
- [ ] Reload with world state file → game resumes from saved state
- [ ] First-time play (no world state) → starts at level.playerStart with 100 health

## Open Questions

**Q1: Event Tracking**
Do we need to track raised events at all? With `liveEntities`, we know what's spawned. Events are just the mechanism.

**My answer:** No, we don't need `raisedEvents`. Remove it from world state.

**Q2: Non-Repeatable Events**
Should we have a concept of events that don't fire on level re-entry?

**My answer:** No. Triggers handle this via `firedTriggers`. If trigger doesn't exist, event doesn't fire.

**Q3: Player Start Position**
Should we remove `playerStart` from level JSON entirely?

**My answer:** Keep it for now (backward compatibility, editor uses it). Just deprioritize it in spawn logic.

## Revised World State Structure

```typescript
interface WorldState {
  player: {
    health: number;
    currentLevel: string;
    spawnCol?: number;      // undefined = use level.playerStart
    spawnRow?: number;
    entryCell: { col: number; row: number };
  };
  levels: {
    [levelName: string]: {
      liveEntities: string[];
      destroyedEntities: string[];
      firedTriggers: string[];
      modifiedCells: Array<{
        col: number;
        row: number;
        properties?: string[];
        backgroundTexture?: string;
        layer?: number;
      }>;
    };
  };
}
```

Does this revised plan address everything? Ready to implement?
