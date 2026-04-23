# Escort Feature — Clarifying Questions

## Status Key
- ✅ **ANSWERED** — Feature file already answers this
- ❓ **OPEN** — Needs clarification

---

## 1. Entity Architecture

### Q1.1: Is `escort` the entity type, or is `knight` the entity type?
The feature describes `escort` as a general concept with `knight` as a specific subtype. Should the `EntityType` be `'escort'` with a `subtype: 'knight'` field, or should each escort variant be its own entity type (e.g., `'knight'`)?

**Why it matters:** Determines whether we add one EntityType or one per variant. Affects EntityLoader, editor palette, and factory structure. If future escort types share 90% of behavior (follow, destination, awakening), a single `'escort'` type with a `subtype` field is cleaner. If they diverge significantly, separate types are better.

**Status:** ❓ OPEN

---

### Q1.2: What is the configurable "within X tiles" distance for destination reachability?
The feature says the escort walks to its destination if "within X tiles (configurable)." What is the default value? Is this per-entity (JSON field) or a global constant?

**Why it matters:** Determines whether this is a prop on the entity data or a constant in the component.

**Status:** ❓ OPEN — Feature says "configurable" but doesn't specify default or whether it's per-entity.

---

### Q1.3: Does the escort have a collision box / block movement?
Should the knight block player movement (like a pushable/breakable with `GridCellBlocker`), or can the player walk through it (like an NPC)?

**Why it matters:** Affects component composition. NPCs are walkable-through. If the escort blocks movement, it could trap the player in corridors.

**Status:** ❓ OPEN

---

### Q1.4: Does the escort have a GridCollisionComponent for wall avoidance?
The escort follows the player using pathfinding. Should it have `GridCollisionComponent` for per-frame wall collision (like the pet), or rely purely on pathfinding (like enemies)?

**Why it matters:** Determines whether the escort can clip through walls during movement or is physically constrained.

**Status:** ❓ OPEN — Pet uses GridCollisionComponent + pathfinding. Enemies use pathfinding only with state-based movement.

---

## 2. Awakening & Lifecycle

### Q2.1: What event awakens the escort?
✅ **ANSWERED** — Feature says `awakeOnEvent` property on the entity data. This is a configurable event name per entity instance.

---

### Q2.2: What happens if the player leaves the room before awakening the escort?
If the escort hasn't been awakened yet and the player exits the level, does the escort remain dormant on re-entry? Or does something else happen?

**Status:** ❓ OPEN — Feature doesn't address this case.

---

### Q2.3: Can the escort be awakened by `createOnAnyEvent` (standard entity system) instead of a custom `awakeOnEvent`?
The existing entity system already has `createOnAnyEvent` which spawns entities when events fire. Should the escort use this existing mechanism (entity spawns dormant, then awakens on a separate event), or should it always exist in the level and transition from dormant→active on the event?

**Why it matters:** If the escort is always present (visible but sleeping), it needs to exist from level load. `createOnAnyEvent` would delay its entire existence. The feature implies the knight is visible (crouching) before awakening, so it should spawn immediately and listen for the awake event separately.

**Status:** ✅ **ANSWERED (implicitly)** — The feature says "Before awakened - plays frame 4 of their crouch animation and the knight just stays still." This means the entity exists from level load in a dormant state. `awakeOnEvent` is a separate mechanism from `createOnAnyEvent`.

---

### Q2.4: Does the `current_escort` flag get cleared when the escort reaches its destination?
Feature says `current_escort` flag is set on awakening. Is it cleared when the escort completes its journey? Or does it persist forever?

**Why it matters:** If another escort exists in a later level, we need to know if only one can be active at a time, and how the flag transitions.

**Status:** ❓ OPEN — Feature says the flag is set but doesn't say when/if it's cleared.

---

### Q2.5: Can there be multiple escorts active simultaneously?
The `current_escort` flag stores a single entity ID. Does this mean only one escort can be active at a time?

**Status:** ❓ OPEN — The single-value flag implies one at a time, but this should be confirmed.

---

## 3. Following Behavior

### Q3.1: What is the escort's follow speed?
The pet has defined speeds (300px/s follow, 500px/s catchup, 60px/s wander). What speed should the escort use?

**Status:** ❓ OPEN

---

### Q3.2: What is the follow distance (how close does the escort stay)?
Feature says "follows the player until it is within 1 cell of the player." Does "1 cell" mean the escort stops when it's in an adjacent cell (64px away), or when it's within 1 cell distance (anywhere within 64px)?

**Status:** ✅ **ANSWERED** — "within 1 cell of the player, if it is then close to the player, it stops moving." This means adjacent cell — stop when within ~1 cell distance.

---

### Q3.3: Does the escort teleport if too far away (like the pet at 800px)?
The pet teleports to the player if >800px away. Should the escort have similar behavior, or always pathfind?

**Status:** ❓ OPEN

---

### Q3.4: What pathfinding parameters should the escort use?
- 4-direction or 8-direction movement? (Knight has 4 walk directions)
- Allow layer changes?
- What layer does it pathfind on?

**Status:** ✅ **PARTIALLY ANSWERED** — Knight has 4 movement directions (east/north/south/west walk anims). Layer behavior not specified.

**Remaining:** ❓ Does the escort handle stairs/layer transitions, or is it always on layer 0?

---

### Q3.5: Does the escort path around enemies, or just through them?
The knight crouches when enemies are within 2 cells. But when following with no enemies nearby, does the pathfinder avoid cells occupied by enemies?

**Status:** ❓ OPEN

---

## 4. Cross-Level Behavior

### Q4.1: How does the escort appear in the new room after a level transition?
Feature says: "If the player exits the current room, when they appear in the new room, the escort will be there also, as soon as the player moves off of the cell they spawn on, the escort will appear there."

Does this mean:
- (A) The escort spawns on the player's spawn cell, invisible, and becomes visible when the player steps off?
- (B) The escort is not in the new level's JSON — it's dynamically created based on the `current_escort` flag?

**Why it matters:** This is a major architectural question. Option B means the escort entity must be synthesized from flag data during level load, not from level JSON. This is a new pattern not used by any existing entity.

**Status:** ✅ **ANSWERED (implicitly)** — The escort follows across rooms that don't have it in their JSON. It must be dynamically spawned based on the `current_escort` flag. The escort's type, spritesheet, destination, etc. must be stored in world state.

**Remaining:** ❓ What data needs to be persisted in world state for cross-level spawning? Just the entity type/subtype + destination? Or the full entity definition?

---

### Q4.2: Does the escort appear in EVERY level the player visits, or only levels on the path to the destination?
If the destination is in level "dungeon3" and the player goes to "grass_overworld1" (completely unrelated), does the escort still follow?

**Status:** ❓ OPEN — Feature says "if the player exits the current room, when they appear in the new room, the escort will be there also." This implies every room, but confirmation needed.

---

### Q4.3: What happens if the player returns to the escort's origin level after awakening?
The escort was originally in "dungeon1." Player awakens it, goes to "dungeon2," then returns to "dungeon1." Does the escort appear in dungeon1 again (following), or is it only in the forward direction?

**Status:** ❓ OPEN — Feature implies the escort follows everywhere until destination reached.

---

### Q4.4: What animation does the escort play when spawning in a new room?
Does it just appear standing? Play the stand-up animation? Fade in?

**Status:** ❓ OPEN

---

## 5. Enemy Interaction (Knight-Specific)

### Q5.1: How is "within 2 cells" measured for enemy detection?
Grid distance (Manhattan/Chebyshev)? Pixel distance? Path distance?

**Why it matters:** Per the pets-quick-ref, pixel distance can be misleading (enemy through a wall reads as close). Path distance is more accurate but expensive.

**Status:** ❓ OPEN

---

### Q5.2: Does the knight detect ALL enemy types, or specific ones?
Should it react to skeletons, throwers, robots, pumas, bullet_dudes, bug_bases, bugs? What about lasers?

**Status:** ❓ OPEN — Feature says "enemies" generically.

---

### Q5.3: When the knight crouches due to enemies, does it play the crouch animation or snap to the crouched frame?
Feature says "goes back into their sleeping state where they crouch down and hold the last frame." Does "crouch down" mean play the full crouch animation forward, or just snap to the crouched pose?

**Status:** ✅ **ANSWERED** — "goes back into their sleeping state where they crouch down and hold the last frame of the animation." This implies playing the crouch animation forward (not reversed) and holding the last frame.

---

### Q5.4: After enemies leave, does the knight play the stand-up animation again?
Feature says "the knight stays crouched until the enemies are gone." After enemies leave the 2-cell radius, does the knight play the crouch animation in reverse (stand up) before resuming follow?

**Status:** ❓ OPEN — Feature describes the initial awakening stand-up but doesn't explicitly say what happens after a crouch-due-to-enemies ends.

---

### Q5.5: Can the knight be damaged or killed?
✅ **ANSWERED** — "the knight can never be hurt."

---

### Q5.6: Does the knight block projectiles?
If the knight can't be hurt, do projectiles pass through it, or does it absorb them (like a pushable)?

**Status:** ❓ OPEN

---

## 6. Destination Behavior

### Q6.1: Is the destination always in a different level from the escort's origin?
Or can the destination be in the same level where the escort spawns?

**Status:** ❓ OPEN — Feature says destination is "a combination of a level and a cell," which implies it could be same or different level.

---

### Q6.2: What does "reachable" mean for the destination check?
Feature says escort walks to destination if it "can reach the destination (i.e. it is in the current room and the cell is reachable and within X tiles)." Does "reachable" mean pathfinder returns a non-null path?

**Status:** ✅ **ANSWERED (implicitly)** — "the cell is reachable" + "within X tiles" means: (1) current level matches destination level, (2) pathfinder finds a path, (3) path length ≤ X tiles.

---

### Q6.3: What happens if the destination cell is blocked (e.g., wall, pushable on it)?
Does the escort wait nearby? Path to the nearest open cell? Fail silently?

**Status:** ❓ OPEN

---

### Q6.4: After reaching the destination and playing Arms_stretched, does the knight entity persist in world state?
Feature says "whenever I leave or re-enter the room, the knight will just be stood there in that last pose." This means the knight's completed state must persist. How?

- (A) The knight is in the level JSON and a flag marks it as "completed" — on load, it spawns in the final pose
- (B) The knight is dynamically spawned in the destination level based on world state

**Status:** ✅ **ANSWERED (implicitly)** — If the destination is in a different level than the origin, the knight must be dynamically spawned there. A world state flag like `escort_{id}_completed` with the destination level/cell would allow spawning it in the completed pose on re-entry.

**Remaining:** ❓ If the destination is in the SAME level as the origin, is the original entity reused, or is a new one created?

---

## 7. Persistence & World State

### Q7.1: What world state data is needed for the escort?
Based on the feature, I believe we need:
- `current_escort`: entity ID of the active escort (or empty if none)
- `escort_{id}_completed`: "true" when escort reached destination
- `escort_{id}_destination_level`: target level name
- `escort_{id}_destination_col`: target cell column
- `escort_{id}_destination_row`: target cell row
- `escort_{id}_type`: escort subtype (e.g., "knight") for cross-level spawning

Is this the right set? Is anything missing?

**Status:** ❓ OPEN — Needs confirmation on what to persist.

---

### Q7.2: Does the escort survive player death?
If the player dies after awakening the escort, does the escort reset to dormant? Stay awakened? Depend on the death-rollback system (which restores level-entry snapshot)?

**Status:** ❓ OPEN — The death system restores `levelEntrySnapshot`. If the escort was awakened before the snapshot, it stays awakened. If awakened after entering the level, it would revert. Is this the intended behavior?

---

## 8. Editor Integration

### Q8.1: What fields should be editable in the editor?
Based on the feature, I expect:
- `col`, `row` (position)
- `escortType`: "knight" (dropdown for future types)
- `destinationLevel`: string (level name)
- `destinationCol`, `destinationRow`: numbers
- `awakeOnEvent`: string (event name)
- `reachDistance`: number (the configurable X tiles)

Is this complete?

**Status:** ❓ OPEN — Needs confirmation.

---

### Q8.2: What label should the escort show in the editor canvas?
Existing labels: S (skeleton), T (thrower), BB (bug base), P (puma), NPC, E (event-driven). What letter/abbreviation for escort?

**Status:** ❓ OPEN

---

## 9. Visual & Animation

### Q9.1: What scale should the knight be rendered at?
The knight spritesheet is 68×68 pixels. The grid cell size is 64×64. Should the knight be scaled to fit the cell (scale ≈ 0.94), or rendered at native size (slightly larger than a cell)?

**Status:** ❓ OPEN

---

### Q9.2: What depth should the knight render at?
Same depth as enemies? NPCs? Player? Breakables?

**Status:** ❓ OPEN

---

### Q9.3: Does the knight have a shadow?
Most entities have a `ShadowComponent`. Should the knight?

**Status:** ❓ OPEN

---

### Q9.4: What is the frame rate for knight animations?
The spritesheet has 8 frames for Scary_Walk, 5 for Arms_stretched, 5 for Crouching. What frame duration? (Player uses 0.1s/frame for most animations.)

**Status:** ❓ OPEN

---

### Q9.5: The crouch animation has 5 frames. "Before awakened, plays frame 4" — is this 0-indexed or 1-indexed?
Frame 4 of a 5-frame animation is either the 5th frame (0-indexed, last frame) or the 4th frame (1-indexed, second-to-last).

**Status:** ❓ OPEN — Likely means the last frame (0-indexed frame 4 = 5th frame), since the feature says "hold the last frame" elsewhere for the same animation.

---

## 10. Edge Cases

### Q10.1: What if the player is standing on the escort's spawn cell when entering a new room?
Feature says escort appears on the player's spawn cell after the player moves off. But the player starts ON that cell. Does the escort appear instantly behind the player as they take their first step? Or is there a delay/animation?

**Status:** ❓ OPEN

---

### Q10.2: What if the destination level is the SAME as the current level?
The escort checks "is in the current room and the cell is reachable and within X tiles." If the escort awakens in the same room as its destination, does it immediately walk to the destination without any following phase?

**Status:** ✅ **ANSWERED (implicitly)** — Yes. The feature says "If an escort can reach the destination... then the escort will walk over to the destination cell." If it's in the same room and within range, it goes straight there.

---

### Q10.3: What if the escort is mid-follow and the player enters a room where the destination is reachable?
Does the escort immediately switch from follow mode to destination-seeking mode?

**Status:** ✅ **ANSWERED (implicitly)** — Yes. Each frame/update, the escort should check: "Am I in the destination level AND can I reach the destination within X tiles?" If yes, walk to destination. Otherwise, follow player.

---

### Q10.4: What happens during interactions (Lua cutscenes) while the escort is following?
The interaction system pauses all entities without the `interaction_active` tag. Should the escort pause during interactions?

**Status:** ❓ OPEN — Likely yes (pause like all other entities), but should confirm.

---

## Summary

| Category | Answered | Open |
|----------|----------|------|
| Entity Architecture | 1 | 3 |
| Awakening & Lifecycle | 2 | 3 |
| Following Behavior | 2 | 3 |
| Cross-Level Behavior | 1 | 3 |
| Enemy Interaction | 2 | 4 |
| Destination Behavior | 2 | 2 |
| Persistence & World State | 0 | 2 |
| Editor Integration | 0 | 2 |
| Visual & Animation | 0 | 5 |
| Edge Cases | 2 | 2 |
| **Total** | **12** | **29** |
