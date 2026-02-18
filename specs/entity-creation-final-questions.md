# Entity Creation System Refactor - Final Questions

## Decisions Made

1. ✅ **Entity IDs** - Manual in JSON, editor assists, throw error on duplicates
2. ✅ **Spawner Delays** - Per-event: `[{event: "sk1", delayMs: 0}, {event: "sk2", delayMs: 1000}]`
3. ✅ **Event Names** - Move to entity level: `{id, type, eventName, data}`
4. ✅ **Player** - Keep separate with fixed ID "player"
5. ✅ **Migration** - Convert all levels, remove entities (re-add manually)
6. ✅ **Editor** - Single "Add Entity" button with dropdown
7. ✅ **Event Lifecycle** - Create immediately, error on duplicate, oneShot default true
8. ✅ **Spawner Position** - Yes, all entities have position

## Remaining Questions

### 9. Triggers in Entities Array?
Your example shows triggers separate:
```json
{
  "entities": [{...}],
  "triggers": [{...}]
}
```

But triggers could also be entities with eventName. Should they:
- **Option A:** Stay separate (current structure)
- **Option B:** Move to entities array as type "trigger"

### 10. Exits in Entities Array?
Same question for exits - keep separate or move to entities?

### 11. eventName vs eventsToRaise
For spawners:
- `eventName` = event that triggers the spawner to start spawning?
- `eventsToRaise` = events the spawner fires to create entities?

Example flow:
1. Trigger fires "spawn_wave"
2. Spawner (eventName: "spawn_wave") receives event
3. Spawner raises events ["sk1", "sk2"] with delays
4. Skeleton entities (eventName: "sk1", "sk2") receive events and spawn

Is this correct?

### 12. Spawner Without eventName?
Can a spawner exist without eventName (spawns immediately on level load)?
Or do spawners always need to be triggered by events?

### 13. Entity Type Names
Should entity types match current names or be simplified?
- Current: `stalking_robot`, `bug_base`, `bullet_dude`
- Simplified: `robot`, `bugbase`, `bulletdude`

### 14. BugBase Special Case
BugBases currently spawn bugs continuously (not event-driven). Should they:
- **Option A:** Keep current behavior (spawn bugs on proximity)
- **Option B:** Convert to event-driven (trigger fires event, bugbase spawns bugs)
- **Option C:** BugBase raises events that bug entities listen for

### 15. Entity Destruction
When an entity with eventName is destroyed (e.g., killed), should:
- Unregister from EntityCreatorManager?
- Allow re-creation if event fires again?
- Or prevent duplicate creation permanently?

### 16. Editor Workflow
When user clicks "Add Entity" → selects "skeleton" from dropdown → clicks cell:
- Auto-generate ID (skeleton0, skeleton1, ...)?
- Show dialog to enter ID manually?
- Show dialog with auto-generated ID that user can edit?

---

Please answer 9-16 to finalize the spec.
