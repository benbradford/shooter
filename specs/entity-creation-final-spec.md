# Entity Creation System Refactor - Final Spec

original draft in ./entity-creation-refactor.md - familiarise yourself with that

## All Decisions

1. ✅ **Entity IDs** - Manual in JSON, editor auto-generates, throw error on duplicates
2. ✅ **Spawner → EventChainer** - Raises events sequentially with per-event delays
3. ✅ **Event Names** - At entity level: `{id, type, eventName, data}`
4. ✅ **Player** - Keep separate with fixed ID "player"
5. ✅ **Migration** - Convert all levels, remove entities (re-add manually)
6. ✅ **Editor** - Single "Add Entity" button with dropdown
7. ✅ **Event Lifecycle** - Create immediately, error on duplicate, oneShot default true
8. ✅ **All Entities Have Position** - Including EventChainers
9. ✅ **Triggers** - Move to entities array as type "trigger"
10. ✅ **Exits** - Move to entities array as type "exit"
11. ✅ **EventChainer Behavior** - Optional eventName to start, raises eventsToRaise with delays
12. ✅ **EventChainer Without eventName** - Can spawn immediately on level load
13. ✅ **Entity Type Names** - Keep current (stalking_robot, bug_base, etc.)
14. ✅ **BugBase** - Keep current spawning logic, treat as normal entity
15. ✅ **Entity Destruction** - Just destroy, no special handling
16. ✅ **Editor ID Generation** - Auto-generate: `{type}{lowestAvailableNumber}`

## Final Clarifying Question

### EventChainer Data Structure

You showed:
```json
{
  "id": "spawner1",
  "type": "spawner",
  "eventName": "sp1",
  "data": {
    "eventsToRaise": ["sk1"],
    "spawnDelayMs": 0
  }
}
```

But with per-event delays (decision #2), should it be:
```json
{
  "id": "eventchainer1",
  "type": "eventchainer",
  "eventName": "sp1",
  "data": {
    "col": 10,
    "row": 5,
    "eventsToRaise": [
      {"event": "sk1", "delayMs": 0},
      {"event": "sk2", "delayMs": 1000},
      {"event": "sk3", "delayMs": 500}
    ]
  }
}
```

**Q:** Is this the correct structure? And should the type be "spawner" or "eventchainer"?

---

Once you confirm this, I can start implementation.
