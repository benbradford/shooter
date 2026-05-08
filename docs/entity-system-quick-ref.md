# Entity System - Quick Reference

## Key Concepts

**All entities are in the `entities` array in level JSON.**

- **Entity ID**: Unique identifier (e.g., "skeleton0", "robot1")
- **Entity Type**: skeleton, thrower, stalking_robot, bug_base, bullet_dude, puma, trigger, exit, eventchainer, cellmodifier, lever
- **createOnAnyEvent**: Optional - array of events, spawns when ANY fires
- **createOnAllEvents**: Optional - array of events, spawns when ALL fire
- **Immediate spawn**: No createOnAnyEvent/createOnAllEvents = spawns on level load
- **Event-driven spawn**: Has createOnAnyEvent or createOnAllEvents = spawns when condition met

## Entity Types

- **skeleton, thrower, robot, bug_base, bullet_dude, puma** - Enemies with col, row, difficulty
- **trigger** - Fires event when player enters cells (has eventToRaise, triggerCells, oneShot)
- **exit** - Transitions to another level (has targetLevel, targetCol, targetRow, triggerCells)
- **eventchainer** - Raises multiple events with delays (has eventsToRaise array)
- **cellmodifier** - Modifies grid cells when event fires (has cellsToModify array)
- **lever** - Punchable toggle switch (has eventToRaise, startState, oneShot)
- **root_chest** - Punchable root chest (has specialItem), spawns item pickup on death

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

1. **Add Entity**: Entity tool → Select type → Click to place → Auto-generates ID
2. **Edit Entity**: Select tool → Click entity → Edit panel appears
3. **Move Entity**: Select tool → Click and drag entity to new position
4. **Save**: Ctrl+S or Save button → Writes directly to disk

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
- `src/systems/EntityRegistry.ts` - Factory registry pattern (registerEntityFactory, getEntityFactory)
- `src/systems/entityFactories.ts` - All entity factory registrations (side-effect import, delegates to subdirectory)
- `src/systems/EntityLoader.ts` - Loading orchestrator (delegates to registry)
- `src/eventchainer/EventChainerEntity.ts` - EventChainer implementation
- `src/cellmodifier/CellModifierEntity.ts` - CellModifier implementation
- `editor/CanvasInteraction.ts` - Entity placement and selection
- `editor/EditorBridge.ts` - Entity extraction, mutations
- `editor/panels/ContextPanel.ts` - Trigger/CellModifier/Entity editing UI
- `docs/entity-creation-system.md` - Full documentation
