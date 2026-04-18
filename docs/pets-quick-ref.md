# Pet System - Quick Reference

## Enabling Pets

Set WorldState flags in `public/states/default.json`:

```json
{
  "flags": {
    "pet_dog_collected": "true",
    "pet_selected": "dog"
  }
}
```

Available pets: `"rock"` (4-dir, 48x48) or `"dog"` (8-dir, 32x32)

## Controls

- **H key** or tap pet action button — Trigger pet ability
- Pet follows automatically using pathfinding

## Dog Bark Ability

**Activation:** H key or tap pet action button (works with or without enemies nearby)

**Flow with enemy:** Dog pathfinds to nearest enemy → barks → bark effect + sound → enemies within 400px enter fear state for 4 seconds

**Flow without enemy:** Dog barks on the spot in its current facing direction → bark effect + sound (no fear applied)

**Bark effect:** Cyan expanding ring (15→156px, 300ms, Cubic.Out), inner pulse, echo ring (80ms delay), particle burst (15 cyan particles)

**Sound:** `bark.mp3` plays on every bark

**Fear Effects:**
- Enemies flee at 0.6× speed with zig-zag movement (direction changes every 300ms)
- Blue tint pulses between `0x8888ff` and white
- Fear icon particles emit around enemy (small, fading, floating upward)

**Fear Immunity:** BugBase (stationary, can't flee)

**Post-Fear Behavior:**
- Enemies return to chase/idle state (never attack/jumping/recover)
- Bugs have 1.5s attack cooldown after fear ends
- Active hops cancelled when fear applied

**HUD:** Bark icon shown when dog selected, only dims during cooldown or swimming

## Following Behavior

**States:** `idle` → `following` → `wandering_move` / `wandering_pause`

- **Following** (>192px): Runs toward player using pathfinding, run animation
- **Wandering** (<128px): Alternates between slow walks to random nearby points (0.6-1.5s) and pauses (0.8-2s), walk animation
- **Speed transition:** 500ms lerp between run speed (300px/s) and wander speed (60px/s)
- **Teleport:** If >800px away, teleports to player
- **Water:** Pet rides on player's back when swimming, matches player direction, resumes follow on exit

## ⚠️ Pathfinding Pitfalls (Critical)

### Always Use Pathfinding for Movement

**Never fall back to direct movement (`moveToward` toward player/target) when pathfinding returns null.** The dog will run straight through walls. If no path found, wait and retry.

### Always Pathfind on Layer 0

**Hardcode layer 0** in `findPath()` calls. If the dog reads the layer from its current cell and happens to be near a wall (layer 1), the pathfinder starts from layer 1 and can't find a path to the player on layer 0. Use `allowLayerChanges: false`.

```typescript
// ✅ CORRECT
pathfinder.findPath(startCol, startRow, goalCol, goalRow, 0, false, true);

// ❌ WRONG - reads layer from cell, may be layer 1 near walls
const layer = grid.getCell(col, row)?.layer ?? 0;
pathfinder.findPath(startCol, startRow, goalCol, goalRow, layer, true, true);
```

### GridCollisionComponent + Pathfinding Interaction

The pet has `GridCollisionComponent` for wall collision. This works correctly as long as:
- Pathfinding avoids walls (it does)
- No direct movement fallback bypasses the pathfinder

### Target Selection by Path Distance, Not Pixel Distance

For bark targeting, use **path length** (cells) not **pixel distance**. An enemy 100px away through a wall is unreachable, but an enemy 300px away around a corner is reachable.

```typescript
// ✅ CORRECT - checks actual reachability
const path = pathfinder.findPath(dogCell, enemyCell, 0, false, true);
if (path && path.length <= MAX_CELLS) { /* targetable */ }

// ❌ WRONG - ignores walls and layers
if (Math.hypot(dx, dy) < RANGE_PX) { /* targetable */ }
```

### Non-Resumable States After Fear

When applying fear, never return to aggressive/transitional states. These cause enemies to resume mid-attack (e.g., puma completes a jump from far away):

```typescript
const NON_RESUMABLE_STATES = new Set(['attack', 'jumping', 'recover', 'standup', 'threatening']);
```

## Architecture

- **PetManager** — Singleton, spawns pets based on WorldState
- **PetFollowComponent** — Pathfinding follow, wander state machine, speed lerp
- **PetAbilityComponent** — Routes ability activation to pet-specific component
- **DogBarkAbility** — Bark state machine (idle → approaching → barking), fear application
- **FearComponent** — Dynamic component added/removed from enemies, manages tint + particles
- **EnemyFearState** — Shared IState for all enemy types, zig-zag flee movement
- **PetActionButtonComponent** — HUD button, swaps icon per pet type

## Key Files

- `src/systems/PetManager.ts` — Pet lifecycle
- `src/ecs/entities/pet/PetEntity.ts` — Entity factory
- `src/ecs/entities/pet/PetConfig.ts` — Pet registry (rock, dog)
- `src/ecs/entities/pet/PetAnimations.ts` — Animation map creation (idle, walk, run, bark)
- `src/ecs/components/pet/PetFollowComponent.ts` — Following + wander logic
- `src/ecs/components/pet/PetAbilityComponent.ts` — Ability routing
- `src/ecs/components/pet/DogBarkAbility.ts` — Bark ability + fear application
- `src/ecs/components/combat/FearComponent.ts` — Fear visual effects + timer
- `src/ecs/entities/common/EnemyFearState.ts` — Shared flee state
- `features/pets/dog/bark/` — Design docs and tasks
