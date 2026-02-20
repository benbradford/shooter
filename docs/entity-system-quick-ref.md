# Entity System - Quick Reference

## Key Concepts

**All entities are in the `entities` array in level JSON.**

- **Entity ID**: Unique identifier (e.g., "skeleton0", "robot1")
- **Entity Type**: skeleton, thrower, stalking_robot, bug_base, bullet_dude, trigger, exit, eventchainer
- **createOnEvent**: Optional - entity spawns when this event fires
- **Immediate spawn**: No createOnEvent = spawns on level load
- **Event-driven spawn**: Has createOnEvent = spawns when event fires

## Entity Types

- **skeleton, thrower, robot, bug_base, bullet_dude** - Enemies with col, row, difficulty
- **trigger** - Fires event when player enters cells (has eventToRaise, triggerCells, oneShot)
- **exit** - Transitions to another level (has targetLevel, targetCol, targetRow, triggerCells)
- **eventchainer** - Raises multiple events with delays (has eventsToRaise array)

## Event Flow Example

```
Player → Trigger → EventChainer → Entities
```

1. Player walks to trigger cell
2. Trigger fires event (e.g., "spawn_wave")
3. EventChainer (createOnEvent: "spawn_wave") spawns
4. EventChainer raises events sequentially (sk1, sk2, sk3...)
5. Entities (createOnEvent: "sk1", "sk2", "sk3") spawn
6. EventChainer destroys itself

## Editor Workflow

1. **Add Entity**: Click Add → Select type → Click to place → Auto-generates ID
2. **Edit Entity**: Click entity → Shows ID in top-right → Edit panel appears
3. **Move Entity**: Click entity in edit mode → Drag to new position
4. **Save**: Click Log → Copy JSON to level file

## Important Rules

- Entity IDs must be unique (editor auto-generates)
- Multiple entities can share the same createOnEvent (all spawn when event fires)
- createOnEvent can only fire once (EntityCreatorManager prevents duplicates)
- oneShot should be true for triggers/exits (prevents multiple firings)
- EventChainers start immediately when created (don't need another event)
- Player is not in entities array (separate playerStart field)

## Files

- `src/systems/EntityCreatorManager.ts` - Event-driven creation
- `src/systems/EntityLoader.ts` - Loading from JSON
- `src/eventchainer/EventChainerEntity.ts` - EventChainer implementation
- `src/editor/AddEntityEditorState.ts` - Unified entity placement
- `docs/entity-creation-system.md` - Full documentation
