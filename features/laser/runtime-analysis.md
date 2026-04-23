# Runtime Analysis: Laser Enemy

**Complexity:** Medium — no scene lifecycle changes, no async loading, but involves per-frame raycast + collision + entity iteration with destroy-during-iteration risk.

**Analysis date:** 2026-04-22

---

## Execution Flows Analyzed

1. Level load → laser entity creation → first frame update
2. Per-frame update: raycast → render → collision check → damage/kill
3. World state toggle: flag changes → beam visibility → collision disabled
4. Pushable moves → beam endpoint updates dynamically
5. Entity destruction on level transition
6. Editor mode: beam preview rendering
7. Interaction pause: laser behavior during cutscenes

---

## Lifecycle Ownership Table

| Resource | Created By | Destroyed By | Lifetime | Used By |
|----------|-----------|--------------|----------|---------|
| Laser Entity | `createLaserEntity()` via EntityLoader | `EntityManager.destroyAll()` on level transition, or `EntityManager.remove()` | Level | EntityManager, CollisionSystem |
| Graphics (beam lines) | `LaserBeamComponent` constructor | `LaserBeamComponent.onDestroy()` | Entity | LaserBeamComponent.renderBeam() |
| ParticleEmitter (sparks) | `LaserBeamComponent` constructor | `LaserBeamComponent.onDestroy()` | Entity | LaserBeamComponent.update() |
| `__laser_spark` texture | `LaserBeamComponent.createImpactEmitter()` | Never (persists in TextureManager) | Global | All laser emitters |
| Grid occupant registration | `GridCollisionComponent.update()` | `GridCollisionComponent.onDestroy()` | Entity | Grid cell occupant list |
| TransformComponent | `createLaserEntity()` | `Entity.destroy()` | Entity | LaserBeamComponent, SpriteComponent |
| SpriteComponent (base) | `createLaserEntity()` | `Entity.destroy()` | Entity | Renderer |

### Ownership Verification

- ✅ Graphics created in constructor, destroyed in `onDestroy()` — clean lifecycle
- ✅ ParticleEmitter created in constructor, destroyed in `onDestroy()` — clean lifecycle
- ✅ GridCollisionComponent has `onDestroy()` that removes occupants — clean lifecycle
- ✅ SpriteComponent has `onDestroy()` that destroys the Phaser sprite — clean lifecycle (verified in codebase)
- ⚠️ `__laser_spark` texture is global and never cleaned up — acceptable, tiny (4x4px), shared across all lasers

---

## Flow 1: Level Load → Laser Entity Creation → First Frame

### Execution Trace

```
1. GameScene.initializeScene()
   1.1. Grid created and populated with cells
   1.2. BlockedAreaManager created
   1.3. EntityLoader.loadEntities() called
2. EntityLoader processes entity list
   2.1. Finds entityDef with type 'laser'
   2.2. Checks suppressOnAnyFlag / createOnAnyEvent / createOnAllEvents (standard)
   2.3. Calls createLaserEntity(props)
3. createLaserEntity()
   3.1. new Entity(entityId) — entity created
   3.2. entity.tags.add('laser')
   3.3. grid.cellToWorld(col, row) → world position
   3.4. scene.textures.get('laser_base') → texture lookup
   3.5. TransformComponent(x, y, 0, scale) — position at cell center
   3.6. SpriteComponent(scene, 'laser_base', transform) — sprite created
   3.7. GridPositionComponent(col, row, box) — grid tracking
   3.8. GridCollisionComponent(grid) — occupant registration
   3.9. GridCellBlocker() — movement blocking
   3.10. CollisionComponent({...}) — projectile absorption
   3.11. grid.getCell(col, row) → spawnCell → grid.getLayer(spawnCell) → layer
   3.12. LaserBeamComponent({scene, grid, angle, flagName, layer, ...})
         3.12.1. Compute dirX, dirY from angle
         3.12.2. scene.add.graphics() → Graphics object added to scene [SYNC]
         3.12.3. createImpactEmitter()
                 3.12.3.1. scene.textures.exists('__laser_spark') → check
                 3.12.3.2. If not exists: scene.make.graphics() → generateTexture → destroy temp graphics
                 3.12.3.3. scene.add.particles(0, 0, '__laser_spark', config) → emitter created [SYNC]
   3.13. entity.setUpdateOrder([...]) — LaserBeamComponent last
4. Entity added to EntityManager
5. First frame: EntityManager.update(delta)
   5.1. entity.update(delta)
   5.2. Components update in order: Transform → Sprite → GridPos → GridCollision → GridCellBlocker → Collision → LaserBeam
   5.3. LaserBeamComponent.update(delta)
        5.3.1. Poll WorldStateManager flag → isOn (default: true, flag undefined)
        5.3.2. entity.require(TransformComponent) → startX, startY
        5.3.3. raycast(startX, startY) → endpoint
        5.3.4. renderBeam() → graphics drawn
        5.3.5. emitter.setPosition(endX, endY), emitter.start()
        5.3.6. checkPlayerCollision() → player lookup
        5.3.7. checkEnemyCollision() → enemy iteration
```

### Verification

- ✅ Grid exists before entity creation (step 1.1 before 1.3)
- ✅ BlockedAreaManager exists before entity creation (step 1.2 before 1.3)
- ✅ `laser_base` texture loaded via AssetRegistry before scene init (R8 requirement)
- ✅ TransformComponent exists before LaserBeamComponent reads it (step 3.5 before 5.3.2)
- ✅ GridCollisionComponent registers occupant before LaserBeamComponent raycast checks occupants (update order: GridCollision before LaserBeam)
- ✅ `__laser_spark` texture created before emitter uses it (step 3.12.3.2 before 3.12.3.3)
- ✅ No async boundaries in entity creation — all synchronous

### Violations Detected

None.

---

## Flow 2: Per-Frame Update — Raycast → Render → Collision → Damage/Kill

### Execution Trace

```
1. EntityManager.update(delta)
   1.1. Iterates all entities, calls entity.update(delta)
2. Laser entity.update(delta)
   2.1. [Components 1-6 update: Transform, Sprite, GridPos, GridCollision, GridCellBlocker, Collision]
   2.2. LaserBeamComponent.update(delta)
        2.2.1. pulseTimeMs += delta
        2.2.2. Read flag → isOn = true
        2.2.3. entity.require(TransformComponent) → startX, startY
        2.2.4. raycast(startX, startY)
               2.2.4.1. Step along direction in 4px increments
               2.2.4.2. For each new cell: check grid boundary, wall, platform, blocked area, occupants
               2.2.4.3. Occupant check: iterate cell.occupants, skip self, check GridCellBlocker
               2.2.4.4. Return first blocker position
        2.2.5. renderBeam(startX, startY, endX, endY)
               2.2.5.1. graphics.clear()
               2.2.5.2. Draw 3 layers with lineBetween()
        2.2.6. emitter.setPosition(endX, endY)
        2.2.7. checkPlayerCollision(startX, startY, endX, endY)
               2.2.7.1. entityManager.getFirst('player') → player entity
               2.2.7.2. Check player.isDestroyed → skip if true
               2.2.7.3. player.require(TransformComponent) → position
               2.2.7.4. player.require(GridPositionComponent) → layer check
               2.2.7.5. pointToSegmentDist() → distance
               2.2.7.6. If overlap: health.takeDamage(50), flash.flash(300), knockback.applyKnockback()
        2.2.8. checkEnemyCollision(startX, startY, endX, endY)
               2.2.8.1. entityManager.getAll() → copy of entity array [IMPORTANT: getAll() returns spread copy]
               2.2.8.2. For each entity: skip destroyed, skip non-enemy, skip laser-tagged
               2.2.8.3. entity.get(TransformComponent) → position
               2.2.8.4. pointToSegmentDist() → distance
               2.2.8.5. If overlap: entity.destroy() [IMMEDIATE]
```

### Critical Analysis: Enemy Destroy During Iteration

**Step 2.2.8.5** calls `entity.destroy()` immediately during iteration over `entityManager.getAll()`.

**Is this safe?** YES.

- `entityManager.getAll()` returns `[...this.entities]` — a **spread copy** of the array (verified in EntityManager.ts line 75)
- Calling `entity.destroy()` sets `entity.isDestroyed = true` and clears components
- The iteration continues over the copy; destroyed entities are skipped by the `entity.isDestroyed` check at step 2.2.8.2
- EntityManager's own `update()` method cleans up destroyed entities AFTER all entity updates complete (lines 55-58)

**However:** When `entity.destroy()` is called, it calls `onDestroy()` on all components, which includes `GridCollisionComponent.onDestroy()` removing the entity from grid occupants. This means:

- If Laser A destroys Enemy X at step 2.2.8.5
- Enemy X is removed from grid occupants immediately
- If Laser B (updating later in the same frame) raycasts through the cell where Enemy X was, it will NOT see Enemy X as an occupant
- This is **correct behavior** — the enemy is dead, the beam should pass through

### Critical Analysis: Player Damage Per Frame

**Step 2.2.7.6** applies 50 damage per frame with no cooldown. At 60fps, this is 3000 HP/sec. The design explicitly states knockback is the mitigation — the player is pushed out within 1-2 frames.

**Potential issue:** If knockback fails (e.g., player is against a wall and knockback direction pushes into the wall), the player takes 50 damage every frame indefinitely. The `KnockbackComponent.applyKnockback()` checks if the target cell is valid — if not, it applies a small nudge toward cell center instead. This means the player could be stuck in the beam taking continuous damage.

**Severity:** Low — this is a gameplay design decision, not a runtime bug. The requirements explicitly state "no damage cooldown or invincibility window — the knockback IS the mitigation." If the player is cornered against a wall with a laser, rapid death is the intended consequence.

### Critical Analysis: Multiple Lasers Damaging Player Same Frame

If multiple lasers overlap the player in the same frame, each laser's `checkPlayerCollision()` runs independently. The player takes 50 × N damage per frame. This is explicitly documented as intended behavior in requirements ("player can take damage from multiple beams simultaneously").

### Violations Detected

None.

---

## Flow 3: World State Toggle — Flag Changes → Beam Visibility → Collision Disabled

### Execution Trace

```
1. External system sets flag:
   WorldStateManager.getInstance().setFlag('laser0_laser_on', 'false')
   [SYNC — immediate state change]

2. Same frame or next frame: LaserBeamComponent.update(delta)
   2.1. Read flag: WorldStateManager.getInstance().getState().flags['laser0_laser_on']
   2.2. flagValue === 'false' → isOn = false
   2.3. graphics.setVisible(false) [SYNC]
   2.4. emitter.stop() [SYNC — stops emitting new particles, existing particles fade]
   2.5. return early — NO raycast, NO collision checks

3. External system sets flag back:
   WorldStateManager.getInstance().setFlag('laser0_laser_on', 'true')

4. Next frame: LaserBeamComponent.update(delta)
   4.1. flagValue === 'true' → isOn = true
   4.2. raycast() → new endpoint
   4.3. renderBeam() → graphics.setVisible(true) implicitly via graphics.clear() + redraw
   4.4. emitter.setPosition(endX, endY)
   4.5. emitter.start() [if not active]
   4.6. checkPlayerCollision() — damage resumes
   4.7. checkEnemyCollision() — kills resume
```

### Verification

- ✅ Flag read is synchronous — no async boundary between flag set and flag read
- ✅ When OFF: graphics hidden, emitter stopped, no collision — all in same frame
- ✅ When toggled ON: beam recalculates from scratch — no stale endpoint data
- ✅ No temporal coupling — flag is polled every frame, not event-driven

### Potential Issue: Flag Set Mid-Frame

If a lever sets the flag during the same frame's entity update loop, and the laser entity updates AFTER the lever entity, the laser will see the new flag value in the same frame. If the laser updates BEFORE the lever, it sees the old value and reacts next frame.

**Severity:** Negligible — one frame delay (16ms at 60fps) is imperceptible. The design explicitly states "poll frequency: every frame" which accepts this behavior.

### Violations Detected

None.

---

## Flow 4: Pushable Moves → Beam Endpoint Updates Dynamically

### Execution Trace

```
1. Player pushes a pushable entity into the beam path
   1.1. PushableComponent moves entity to new cell
   1.2. GridCollisionComponent.update() registers entity as occupant in new cell
   1.3. GridCollisionComponent.update() removes entity from old cell

2. Same frame: LaserBeamComponent.update(delta)
   2.1. raycast() steps along beam direction
   2.2. Reaches the cell where pushable now occupies
   2.3. cell.occupants includes pushable entity
   2.4. pushable.get(GridCellBlocker) → truthy
   2.5. Return this cell position as endpoint → beam terminates at pushable

3. Player pushes pushable OUT of beam path
   3.1. PushableComponent moves entity to new cell
   3.2. GridCollisionComponent removes from old cell, adds to new cell

4. Same frame: LaserBeamComponent.update(delta)
   4.1. raycast() steps through the now-empty cell
   4.2. No occupant with GridCellBlocker → beam passes through
   4.3. Beam extends further until next blocker
```

### Critical Analysis: Update Order Between Pushable and Laser

The pushable entity and laser entity are separate entities in the EntityManager. Their relative update order depends on their position in the `entities` array (insertion order).

**Scenario A:** Pushable updates BEFORE laser in the same frame
- Pushable moves to new cell, GridCollisionComponent registers occupant
- Laser raycast sees the pushable in its new position
- ✅ Correct — beam terminates at pushable's new position

**Scenario B:** Laser updates BEFORE pushable in the same frame
- Laser raycast uses pushable's OLD position (occupant still in old cell)
- Pushable then moves to new cell
- Beam endpoint is one frame stale
- ✅ Acceptable — one frame delay (16ms) is imperceptible for a moving pushable

### Verification

- ✅ Raycast checks `cell.occupants` which is updated by GridCollisionComponent — no stale data beyond one frame
- ✅ Beam endpoint recalculated every frame — no cached/stale endpoint
- ✅ No async boundaries — all synchronous within the frame

### Violations Detected

None.

---

## Flow 5: Entity Destruction on Level Transition

### Execution Trace

```
1. Player touches level exit → GameScene transition
2. GameScene stores current entityManager as previousEntityManager
3. New GameScene instance created
4. GameScene.create():
   4.1. GameScene.previousEntityManager.destroyAll() [SYNC]
        4.1.1. For each entity: entity.destroy()
        4.1.2. Laser entity.destroy():
               4.1.2.1. entity.isDestroyed = true
               4.1.2.2. WorldStateManager tracks destruction (if applicable)
               4.1.2.3. For each component: component.onDestroy()
                        - TransformComponent: no onDestroy
                        - SpriteComponent.onDestroy(): sprite.destroy() [Phaser sprite removed]
                        - GridPositionComponent: no onDestroy
                        - GridCollisionComponent.onDestroy(): removes occupants from grid cells
                        - GridCellBlocker: no onDestroy
                        - CollisionComponent: no onDestroy
                        - LaserBeamComponent.onDestroy():
                          → this.graphics.destroy() [Phaser Graphics removed from scene]
                          → this.emitter.destroy() [Phaser ParticleEmitter removed from scene]
               4.1.2.4. components.clear(), updateOrder = []
   4.2. previousEntityManager = undefined
5. New scene initializes with fresh grid, entities, etc.
```

### Verification

- ✅ `LaserBeamComponent.onDestroy()` destroys both Graphics and ParticleEmitter — no orphaned display objects
- ✅ `GridCollisionComponent.onDestroy()` removes occupants from grid — no stale occupant references
- ✅ `SpriteComponent.onDestroy()` destroys the Phaser sprite — no orphaned sprites
- ✅ Entity.destroy() calls onDestroy() on ALL components via `this.components.forEach()` — nothing skipped
- ✅ The old scene's display list is destroyed when the scene shuts down — any missed display objects would be cleaned up by Phaser

### Potential Issue: `__laser_spark` Texture Persistence

The `__laser_spark` generated texture persists in `scene.textures` (which is actually `game.textures` — global). On level transition, the texture remains. When a new laser is created in the next level, `scene.textures.exists('__laser_spark')` returns true, and the texture is reused.

**Severity:** None — this is correct behavior. The texture is tiny (4x4px) and shared.

### Potential Issue: `scene.time.delayedCall(0, () => other.destroy())` in CollisionComponent

The laser's `CollisionComponent.onHit` uses `scene.time.delayedCall(0, () => other.destroy())` to destroy absorbed projectiles. If the laser entity is destroyed (level transition) while a delayed call is pending:

- The delayed call fires on the next frame
- `other` (the projectile) may already be destroyed by `destroyAll()`
- `other.destroy()` on an already-destroyed entity: sets `isDestroyed = true` (already true), calls `onDestroy()` on components (already cleared → `components.forEach` on empty map → no-op)

**Severity:** None — double-destroy is safe due to Entity.destroy() implementation. The `components` map is cleared after first destroy, so the second destroy is a no-op.

### Violations Detected

None.

---

## Flow 6: Editor Mode — Beam Preview Rendering

### Execution Trace

```
1. Editor loads level data
2. User places laser entity via palette
   2.1. EditorBridge.addEntity() creates entity definition with defaults: { col, row, angle: 0, flagName: '...' }
3. User selects laser entity
4. Editor overlay rendering:
   4.1. renderLaserPreview(entityDef)
   4.2. Read col, row, angle from entity data
   4.3. Compute startX, startY from grid cell center
   4.4. Compute direction from angle
   4.5. Simplified raycast: step in cellSize/2 increments
        4.5.1. Check grid boundary
        4.5.2. Check wall / platform / blocker
        4.5.3. NO occupant check (entities paused in editor)
   4.6. Draw dashed preview line on overlayGraphics
```

### Verification

- ✅ Editor raycast is simplified — only checks terrain, not occupants. This is correct because entities are not active in editor mode.
- ✅ Preview uses editor's overlay graphics (not a new Graphics object) — no resource leak
- ✅ Preview only shown when laser is selected — no per-frame cost for unselected lasers

### Potential Issue: Editor Preview vs Runtime Discrepancy

The editor preview does NOT check:
- Blocked area polygons (`blockedAreaManager`)
- Entity occupants (pushables, breakables, other lasers)

This means the preview line may extend further than the actual runtime beam. This is documented in the design as intentional ("simplified — no occupant check needed in editor since entities are paused").

**Severity:** Low — this is a known limitation, not a bug. Level designers should understand the preview is approximate.

### Violations Detected

None.

---

## Flow 7: Interaction Pause — Laser During Cutscenes

### Execution Trace

```
1. Player triggers interaction (NPC dialogue, Lua cutscene)
2. InteractionState.enter():
   2.1. scene.isInInteraction = true
3. EntityManager.update(delta):
   3.1. scene.isInInteraction === true
   3.2. Only updates entities with 'interaction_active' tag or HudScene entities
   3.3. Laser entity does NOT have 'interaction_active' tag
   3.4. LaserBeamComponent.update() is NOT called
4. Result: Beam rendering freezes (last drawn state persists), no collision checks, no damage
5. InteractionState.exit():
   5.1. scene.isInInteraction = false
6. Next frame: LaserBeamComponent.update() resumes normally
   6.1. Raycast recalculates endpoint
   6.2. Beam rendering resumes
   6.3. Collision checks resume
```

### Verification

- ✅ Laser pauses during interactions — no damage during cutscenes
- ✅ Graphics object remains visible but frozen — visually the beam stays where it was (acceptable)
- ✅ On resume, beam recalculates from scratch — no stale state
- ✅ Particle emitter continues its existing particles (Phaser manages particle lifecycle independently of update calls) — particles fade naturally during pause

### Potential Issue: Particle Emitter During Pause

The particle emitter is managed by Phaser's scene update loop, not by the entity update. During interaction pause, Phaser still updates the scene, so existing particles continue their lifecycle (fade, move). However, no NEW particles are emitted because `emitter.setPosition()` and `emitter.start()` are not called.

Actually, the emitter was started in a previous frame and Phaser's particle system continues to emit based on `frequency: 40`. This means **particles continue to emit at the beam endpoint during interaction pause**, even though the beam component isn't updating.

**Severity:** Very low — cosmetic only. Particles continue at the last known endpoint. No gameplay impact since collision is paused.

### Violations Detected

None (cosmetic issue only).

---

## Async Boundary Analysis

| Operation | Type | Risk |
|-----------|------|------|
| Entity creation | Synchronous | None |
| `scene.add.graphics()` | Synchronous | None |
| `scene.add.particles()` | Synchronous | None |
| `scene.make.graphics()` + `generateTexture()` | Synchronous | None |
| `WorldStateManager.getState().flags[...]` | Synchronous read | None |
| `scene.time.delayedCall(0, ...)` for projectile destroy | Deferred (next frame) | Safe — double-destroy is no-op |
| `entityManager.getAll()` | Synchronous (returns copy) | None |
| `entity.destroy()` during enemy iteration | Synchronous | Safe — iterating over copy |

**No async boundaries detected in the laser system.** All operations are synchronous within a single frame. The only deferred operation is the `delayedCall(0, ...)` for projectile destruction, which is safe.

---

## Race Condition Analysis

### Scenario 1: Two Lasers Killing Same Enemy

```
Frame N:
  Laser A.update() → checkEnemyCollision() → enemy in path → enemy.destroy()
  Laser B.update() → checkEnemyCollision() → same enemy → entity.isDestroyed === true → skip
```

**Safe.** The `isDestroyed` check at step 2.2.8.2 prevents double-destroy.

### Scenario 2: Laser Kills Enemy While Enemy Is Updating

Not possible. EntityManager iterates entities sequentially. If the laser updates before the enemy, the enemy is destroyed and skipped. If the enemy updates before the laser, the enemy completes its update, then the laser destroys it.

**Safe.** No concurrent updates.

### Scenario 3: Player Dies From Laser While Another System Reads Player

If `health.takeDamage(50)` reduces health to 0, the player enters death state. Other systems that read the player entity in the same frame (after the laser) will see the player with 0 health. This is standard behavior — the player death state handles the transition.

**Safe.** Sequential updates prevent race conditions.

### Scenario 4: Lever Toggles Laser While Laser Is Mid-Update

Not possible. Entity updates are sequential. The lever either updates before or after the laser in the same frame. The flag change is atomic (simple property assignment).

**Safe.**

---

## Temporal Coupling Analysis

| Coupling | Risk | Assessment |
|----------|------|------------|
| Grid must exist before laser creation | None | Grid created in `initializeScene()` before `loadEntities()` |
| `laser_base` texture must be loaded | None | AssetRegistry loads it during boot/preload |
| TransformComponent must exist before LaserBeamComponent reads it | None | Component added before LaserBeamComponent in factory; update order enforced |
| GridCollisionComponent must register occupant before raycast checks occupants | None | Update order: GridCollision before LaserBeam |
| Player entity must exist for damage check | None | `getFirst('player')` returns undefined if no player → early return |
| WorldStateManager must be initialized | None | Singleton, initialized at app start |

**No temporal coupling violations detected.**

---

## Summary

| Criterion | Status |
|-----------|--------|
| No resource destroyed while referenced | ✅ PASS |
| No async race conditions | ✅ PASS |
| Lifecycle ownership clearly defined | ✅ PASS |
| All execution flows trace correctly | ✅ PASS |
| No temporal coupling violations | ✅ PASS |

### Overall: ✅ PASS

The laser design is runtime-correct. All execution flows trace cleanly with no violations. Key strengths:

1. **Monolithic component** — LaserBeamComponent owns all its resources (Graphics, ParticleEmitter) and cleans them up in `onDestroy()`. No cross-component resource dependencies.
2. **Synchronous design** — No async operations, no event listeners, no deferred state changes. Everything happens within a single frame update.
3. **Safe iteration** — `entityManager.getAll()` returns a copy, so destroying enemies during iteration is safe.
4. **Stateless raycast** — Beam endpoint is recalculated from scratch every frame. No cached state that could become stale.
5. **Standard patterns** — Follows established codebase patterns (BreakableEntity, PushableEntity) for entity creation, component lifecycle, and resource cleanup.

### Minor Notes (Not Violations)

1. **Particle emitter continues during interaction pause** — Cosmetic only, no gameplay impact.
2. **Editor preview is approximate** — Does not check occupants or blocked areas. Documented as intentional.
3. **One-frame delay for pushable position** — If laser updates before pushable, beam endpoint is one frame stale. Imperceptible at 60fps.
4. **Player cornered against wall + laser** — Rapid death if knockback can't push player out. Intended by design.
