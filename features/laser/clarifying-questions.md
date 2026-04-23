# Laser Enemy — Clarifying Questions

## Status Key
- ✅ = Answered in feature file
- ❓ = Needs answer before design

---

## 1. Core Behavior

### Q1.1: Stationary or moving?
✅ **Answered: Stationary.** Placed on a grid cell, does not move.

### Q1.2: Continuous or burst?
✅ **Answered: Continuous.** Always on (no charge-up, no burst, no cycling).

### Q1.3: Fixed, sweeping, or tracking?
✅ **Answered: Fixed direction**, set in the editor. Does not rotate or track the player.

### Q1.4: Beam stops at walls?
✅ **Answered: Yes.** Stops at walls, platforms, blockers, and pushable entities.

### Q1.5: Destructible?
✅ **Answered: No.** Indestructible. Toggle via world state flag.

### Q1.6: Difficulty tiers?
✅ **Answered: No.** No difficulty scaling.

### Q1.7: Warning indicator before activation?
✅ **Answered: No.** Laser is either on or off, no telegraph.

---

## 2. Damage Model

### Q2.1: Player damage amount?
✅ **Answered: 50 HP** + 20px knockback.

### Q2.2: Enemy damage?
✅ **Answered: Instant kill.** Enemies die immediately on contact.

### Q2.3: Knockback direction?
✅ **Answered:** Opposite of the player's current movement direction.

### Q2.4: Damage cooldown / invincibility frames?
❓ **NEEDS ANSWER.** The feature file says "50 damage" but doesn't specify how often. The player's `HealthComponent.takeDamage()` has NO built-in damage cooldown. The `CollisionSystem` checks every frame. If the beam deals 50 damage every frame, the player dies in ~3 frames (150 HP / 50 = 3 frames at 60fps = 50ms). 

**Options:**
- A) Damage once on contact, then immunity window (e.g., 500ms–1000ms) before next tick — like a hazard
- B) Damage per tick at a fixed rate (e.g., 50 damage every 500ms while overlapping)
- C) Damage once, then only again if player leaves and re-enters the beam
- D) Something else?

**This is the single most critical design question.**

### Q2.5: Knockback "opposite of movement direction" — what if player is stationary?
❓ **NEEDS ANSWER.** The feature says knockback is "in the opposite of the player's current movement direction." If the player is standing still (no movement direction), what happens?

**Options:**
- A) Knockback perpendicular to the beam direction (push player away from beam)
- B) Knockback along the beam direction (push player in the direction the beam travels)
- C) No knockback if stationary
- D) Knockback away from the emitter

### Q2.6: Does the beam damage the player during push state?
❓ **NEEDS ANSWER.** If the player is in `PlayerPushState` (pushing a pushable object) and the beam hits them, should they take damage and disengage? Or is the pushable blocking the beam?

**Likely answer:** If the pushable is between the emitter and the player, the beam stops at the pushable. If the player is between the emitter and the pushable, the player takes damage. But worth confirming.

### Q2.7: Does the beam interact with the player's pet?
❓ **NEEDS ANSWER.** Does the beam damage/affect the pet entity? Current pet has no health system, so likely no. But should the beam visually pass through the pet or stop at it?

---

## 3. Beam Collision / Termination

### Q3.1: What exactly stops the beam?
✅ **Partially answered:** Walls, platforms, blockers, and pushable entities.

❓ **Gaps:**
- **Breakable entities** — does the beam stop at breakables? Does it destroy them?
- **Bug bases** — these have `GridCellBlocker`. Does the beam stop at them?
- **Other enemies** — does the beam pass through enemies (killing them) and continue, or stop at the first enemy hit?
- **Blocked area polygons** — does the beam stop at `BlockedAreaManager` polygons?
- **NPC entities** — does the beam pass through NPCs?

### Q3.2: Does the beam stop at the first enemy or pass through all?
❓ **NEEDS ANSWER.** If the beam hits a skeleton, does it:
- A) Kill the skeleton and continue to the next entity/wall
- B) Kill the skeleton and stop (beam terminates at the enemy)

This significantly affects the visual rendering and collision logic.

### Q3.3: Layer behavior?
❓ **NEEDS ANSWER.** If the laser is on layer 0 and there's a platform (layer 1) cell in the beam path, the beam stops (per feature file). But what about:
- Does the laser entity itself have a layer? (Presumably inherited from its cell, like pushables)
- Does the beam only collide with entities on the same layer?

### Q3.4: Does the beam update dynamically when blockers move?
❓ **NEEDS ANSWER.** If a pushable is pushed into the beam path, does the beam immediately shorten? If pushed out, does it immediately extend? (Presumably yes — the beam recalculates each frame. But worth confirming since this affects performance.)

---

## 4. Visual Design

### Q4.1: Beam color?
✅ **Answered: Red** (with white/yellow inner core).

### Q4.2: Beam rendering approach?
✅ **Answered:** 3-layer approach — inner core (white, 2–4px), outer glow (red, 6–10px, alpha 0.3–0.6), pulsing energy overlay.

### Q4.3: Impact/end point effect?
✅ **Answered:** Small burning spark / energy splash with animated particles at the collision point.

### Q4.4: Base sprite?
✅ **Answered:** `laser_base.png` in `public/assets/generic/` (confirmed: file exists).

### Q4.5: Beam rendering technology?
❓ **NEEDS ANSWER.** Should the beam be rendered using:
- A) Phaser Graphics (lines/rectangles drawn each frame) — simplest, most flexible for arbitrary angles
- B) A tiled/stretched sprite — better visual quality but harder for arbitrary angles
- C) A shader — best visual quality but most complex

**Recommendation:** Phaser Graphics for v1. The 3-layer approach (core line + glow line + animated overlay) maps naturally to Graphics drawing.

### Q4.6: Beam width — is it a visual-only width or does it define the collision hitbox?
❓ **NEEDS ANSWER.** The outer glow is 6–10px wide. Is the collision hitbox:
- A) The full visual width (6–10px)
- B) The inner core width (2–4px)
- C) A separate configurable collision width (e.g., 8px)

### Q4.7: Does the base sprite rotate to face the beam direction?
❓ **NEEDS ANSWER.** The feature mentions a "small directional nozzle." Should the base sprite rotate to match the beam angle, or is it always the same orientation?

---

## 5. Toggle / World State Integration

### Q5.1: Toggle mechanism?
✅ **Answered:** World state flag `{entity_id}_laser_on`. `"true"` = on, `"false"` = off. Defaults to ON if flag not set.

### Q5.2: Flag name configurable?
✅ **Answered:** Yes, configurable in editor. Defaults to `{entity_id}_laser_on`.

### Q5.3: How is the flag changed at runtime?
❓ **NEEDS ANSWER.** The feature says the flag controls on/off, but doesn't specify what changes the flag. Options:
- A) Lua interaction scripts (`setFlag(...)`)
- B) Lever entities (lever raises event → eventchainer → sets flag)
- C) Trigger entities
- D) All of the above (any system that sets world state flags)

**Likely answer:** D — the laser just reads the flag, it doesn't care who sets it. But worth confirming there's no special "laser switch" entity needed.

### Q5.4: Visual transition when toggling?
❓ **NEEDS ANSWER.** When the flag changes from off→on or on→off, should the beam:
- A) Instantly appear/disappear (simplest)
- B) Fade in/out over ~200ms
- C) Extend from emitter / retract to emitter (like powering up)

### Q5.5: How often should the flag be polled?
❓ **NEEDS ANSWER.** Should the laser check the flag:
- A) Every frame (simplest, negligible cost)
- B) On event (subscribe to flag changes)
- C) On a timer (e.g., every 500ms)

**Recommendation:** Every frame — it's a single string comparison, negligible cost, and ensures instant response to flag changes.

---

## 6. Editor Integration

### Q6.1: Direction input method?
✅ **Partially answered:** "Arbitrary angle (degrees or radial selector)."

❓ **Preference:** Should the editor use:
- A) A numeric degrees input (0–360)
- B) A visual radial/dial selector
- C) Both (numeric input + visual preview on canvas)

### Q6.2: Beam preview in editor?
❓ **NEEDS ANSWER.** Should the editor show a preview of the beam direction and length (raycast to nearest wall)? This would be very helpful for level design.

### Q6.3: What properties are editable?
✅ **Partially answered:** Direction and flag name.

❓ **Full list needed.** Confirm the complete set:
- Direction (angle in degrees)
- Flag name (string, defaults to `{entity_id}_laser_on`)
- Anything else? (e.g., beam color override, damage amount, beam width?)

---

## 7. Entity System Integration

### Q7.1: Does the laser entity need `GridCellBlocker`?
❓ **NEEDS ANSWER.** Should the laser base block player/enemy movement into its cell (like breakables/pushables), or can entities walk through the base?

### Q7.2: Does the laser entity block projectiles?
❓ **NEEDS ANSWER.** Should player/enemy projectiles be blocked by the laser base? Or do projectiles pass through it?

### Q7.3: Does the laser entity block pathfinding?
❓ **NEEDS ANSWER.** Should enemies pathfind around the laser base cell? If the base has `GridCellBlocker`, this happens automatically.

### Q7.4: Entity tags?
❓ **NEEDS ANSWER.** What tags should the laser entity have? Presumably `'laser'` and possibly `'enemy'` (for the beam's enemy-killing behavior to exclude the emitter itself). But the emitter is indestructible, so `'enemy'` tag would make it a target for auto-aim — probably wrong.

### Q7.5: Does the laser support `createOnAnyEvent` / `suppressOnAnyFlag`?
❓ **NEEDS ANSWER.** Should the laser entity support the standard entity lifecycle flags (event-based spawning, flag-based suppression)? Presumably yes — it's a standard entity type. But the toggle flag is a separate mechanism from `suppressOnAnyFlag`.

---

## 8. Performance

### Q8.1: Maximum lasers per level?
❓ **NEEDS ANSWER.** How many laser entities might exist in a single level? This affects whether we need to optimize the beam raycast (e.g., cache results, only recalculate when blockers change).

**Likely answer:** <10 per level. If so, per-frame raycast for each is fine.

### Q8.2: Beam raycast frequency?
❓ **NEEDS ANSWER.** Should the beam endpoint be recalculated:
- A) Every frame (handles pushable movement, enemy movement)
- B) Only when the level changes (static optimization)

**Recommendation:** Every frame — pushables can move, enemies can die, so the beam length can change dynamically.

---

## 9. Edge Cases

### Q9.1: Laser aimed at level boundary?
❓ **NEEDS ANSWER.** If the beam direction points toward the edge of the grid (out of bounds), does the beam:
- A) Stop at the grid boundary
- B) Extend infinitely (clipped by camera)

### Q9.2: Laser on a transition/stair cell?
❓ **NEEDS ANSWER.** Can a laser be placed on a stair/transition cell? If so, what layer does it use?

### Q9.3: Multiple beams crossing the same point?
❓ **NEEDS ANSWER.** If two laser beams cross at the same point and the player stands there, do they take damage from both? (Presumably yes — each laser is independent.)

### Q9.4: Beam hitting another laser emitter?
❓ **NEEDS ANSWER.** If one laser's beam hits another laser's base, does the beam stop? (The base is a physical object on the grid.)

---

## Summary: Questions Needing Answers

### Critical (blocks design):
1. **Q2.4** — Damage cooldown / tick rate for continuous beam
2. **Q2.5** — Knockback direction when player is stationary
3. **Q3.1** — Full list of what stops the beam (breakables, enemies, blocked areas, etc.)
4. **Q3.2** — Does beam pass through enemies or stop at first hit?
5. **Q4.6** — Beam collision hitbox width

### Important (affects design):
6. **Q2.6** — Beam + push state interaction
7. **Q2.7** — Beam + pet interaction
8. **Q3.3** — Layer behavior
9. **Q3.4** — Dynamic beam update when blockers move
10. **Q5.4** — Visual transition on toggle
11. **Q7.1** — Does laser base block movement?
12. **Q7.2** — Does laser base block projectiles?

### Nice to know (can decide during design):
13. **Q4.5** — Rendering technology (recommend Graphics)
14. **Q4.7** — Base sprite rotation
15. **Q5.3** — What changes the flag (likely: anything)
16. **Q5.5** — Flag poll frequency (recommend: every frame)
17. **Q6.1** — Editor direction input method
18. **Q6.2** — Editor beam preview
19. **Q6.3** — Full editable property list
20. **Q7.3** — Pathfinding blocking
21. **Q7.4** — Entity tags
22. **Q7.5** — Standard entity lifecycle support
23. **Q8.1** — Max lasers per level
24. **Q8.2** — Raycast frequency
25. **Q9.1–Q9.4** — Edge cases
