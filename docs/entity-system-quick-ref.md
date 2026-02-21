# Entity System - Quick Reference

## Key Concepts

**All entities are in the `entities` array in level JSON.**

- **Entity ID**: Unique identifier (e.g., "skeleton0", "robot1")
- **Entity Type**: skeleton, thrower, stalking_robot, bug_base, bullet_dude, trigger, exit, eventchainer, cellmodifier
- **createOnAnyEvent**: Optional - array of events, spawns when ANY fires
- **createOnAllEvents**: Optional - array of events, spawns when ALL fire
- **Immediate spawn**: No createOnAnyEvent/createOnAllEvents = spawns on level load
- **Event-driven spawn**: Has createOnAnyEvent or createOnAllEvents = spawns when condition met

## Entity Types

- **skeleton, thrower, robot, bug_base, bullet_dude** - Enemies with col, row, difficulty
- **trigger** - Fires event when player enters cells (has eventToRaise, triggerCells, oneShot)
- **exit** - Transitions to another level (has targetLevel, targetCol, targetRow, triggerCells)
- **eventchainer** - Raises multiple events with delays (has eventsToRaise array)
- **cellmodifier** - Modifies grid cells when event fires (has cellsToModify array)

## Event Flow Example

```
Player → Trigger → EventChainer → Entities
```

1. Player walks to trigger cell
2. Trigger fires event (e.g., "spawn_wave")
3. EventChainer (createOnAnyEvent: ["spawn_wave"]) spawns
4. EventChainer raises events sequentially (sk1, sk2, sk3...)
5. Entities (createOnAnyEvent: ["sk1"], ["sk2"], ["sk3"]) spawn
6. EventChainer destroys itself

## Editor Workflow

1. **Add Entity**: Click Add → Select type → Click to place → Auto-generates ID
2. **Edit Entity**: Click entity → Shows ID in top-right → Edit panel appears
3. **Move Entity**: Click entity in edit mode → Drag to new position
4. **Save**: Click Log → Copy JSON to level file

## Important Rules

- Entity IDs must be unique (editor auto-generates)
- Multiple entities can share the same event in createOnAnyEvent (all spawn when event fires)
- createOnAnyEvent removes listener after first event fires
- createOnAllEvents waits for all events before spawning
- createOnAnyEvent and createOnAllEvents are mutually exclusive
- oneShot should be true for triggers/exits (prevents multiple firings)
- EventChainers and CellModifiers have no position (default to 0,0)
- Player is not in entities array (separate playerStart field)
- Entity destruction automatically raises `{entityId}_destroyed` event

## Files

- `src/systems/EntityCreatorManager.ts` - Event-driven creation
- `src/systems/EntityLoader.ts` - Loading from JSON
- `src/eventchainer/EventChainerEntity.ts` - EventChainer implementation
- `src/cellmodifier/CellModifierEntity.ts` - CellModifier implementation
- `src/editor/AddEntityEditorState.ts` - Unified entity placement
- `src/editor/TriggerEditorState.ts` - Trigger list/edit UI
- `src/editor/CellModifierEditorState.ts` - CellModifier list/edit UI
- `docs/entity-creation-system.md` - Full documentation
