# Laser Enemy — Implementation Guide

## Quick Start

**Say this to Kiro:**
> "Implement the laser enemy. Read `features/laser/README.md` for overview, then follow `features/laser/tasks.md` phase by phase."

## What's Already Done

✅ **Feature spec** (`laser.md`) — Behavior, visual design, clarifications
✅ **Requirements** (`requirements.md`) — R1–R8 with acceptance criteria
✅ **Design** (`design.md`) — Full architecture, code snippets, component design
✅ **Runtime analysis** (in context) — All flows verified, no violations
✅ **Failure analysis** (in context) — Edge cases tested, mitigations defined
✅ **Task breakdown** (`tasks.md`) — 3 phases, ~6 hours total

## Key Documents (Read in Order)

1. **`README.md`** (this file) — Overview and critical decisions
2. **`tasks.md`** — Implementation tasks, phase by phase
3. **`design.md`** — Architecture, code patterns, component design
4. **`requirements.md`** — Acceptance criteria for each requirement

## ⚠️ CRITICAL: Damage Model Change

**The requirements.md and design.md still reference the OLD damage model** (50 HP + knockback per frame). The actual implementation uses:

- **Player contact = INSTANT KILL.** No cooldown, no knockback, no hit flash. Player touches beam → `health.takeDamage(9999)` → death.
- **Enemy contact = instant kill** (unchanged from design).

This simplifies `checkPlayerCollision()` significantly — no knockback direction logic, no `KnockbackComponent`, no `HitFlashComponent`, no `WalkComponent` velocity check. Just detect overlap → kill.

## Critical Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Single monolithic component | `LaserBeamComponent` handles raycast + render + collision + particles + toggle | Follows `BreakableComponent`/`PushableComponent` pattern. Beam raycast result consumed by render, collision, AND particles in same frame. |
| 4px step raycast | Step along ray in 4px increments | Simpler than DDA for arbitrary angles. ~320 checks/frame/laser — negligible. |
| Graphics for beam | `Phaser.GameObjects.Graphics` with `lineBetween()` | Handles arbitrary angles natively. No rotation/tiling needed. |
| Generated spark texture | `__laser_spark` 4×4px white circle, generated at runtime | Avoids adding a new asset file. Shared across all laser instances. |
| Player damage = instant kill | `takeDamage(9999)` | Laser is a hard barrier for level design. Simplifies collision — no knockback/cooldown logic. |
| Flag defaults to ON | `isOn = flagValue !== 'false'` | Undefined flag = laser active. Only explicit `"false"` disables. |
| Angle validation | `Number.isFinite(rawAngle) ? rawAngle : 0` | Prevents NaN propagation from bad level data. |
| Tag = `'laser'`, NOT `'enemy'` | Indestructible, not an auto-aim target | Prevents player auto-aim from targeting laser bases. |

## Architecture

```
createLaserEntity()
  ├── TransformComponent (cell center)
  ├── SpriteComponent (laser_base.png, rotated)
  ├── GridPositionComponent (full cell collision box)
  ├── GridCollisionComponent (occupant registration)
  ├── GridCellBlocker (blocks movement)
  ├── CollisionComponent (absorbs projectiles)
  └── LaserBeamComponent
        ├── Owns: Graphics (beam lines) — destroyed in onDestroy()
        ├── Owns: ParticleEmitter (sparks) — destroyed in onDestroy()
        ├── Reads: WorldStateManager flag each frame
        ├── Reads: Grid + BlockedAreaManager for raycast
        └── Reads: EntityManager for player/enemy collision
```

## Files to Create

| File | Purpose |
|------|---------|
| `src/ecs/entities/laser/LaserEntity.ts` | Entity factory |
| `src/ecs/components/laser/LaserBeamComponent.ts` | All beam logic |

## Files to Modify

| File | Change |
|------|--------|
| `src/systems/level/LevelLoader.ts` | Add `'laser'` to `EntityType` |
| `src/systems/EntityLoader.ts` | Add `case 'laser'` |
| `src/assets/AssetRegistry.ts` | Register `laser_base`, add `laser` group |
| `src/assets/AssetLoader.ts` | Add laser to `getRequiredAssetGroups()` |
| `editor/panels/Toolbar.ts` | Add `'laser'` to `ENTITY_TYPES` |
| `editor/CanvasInteraction.ts` | Add `laser: 'LA'` label, beam preview |
| `editor/EditorBridge.ts` | Add defaults + extraction logic |
| `editor/panels/ContextPanel.ts` | Add angle + flagName fields |

## Success Criteria

- [ ] Laser entity placeable in editor with angle and flag name
- [ ] Beam renders as 3-layer visual from emitter to first terrain blocker
- [ ] Beam updates every frame (handles moving pushables, destroyed breakables)
- [ ] **Player dies instantly on beam contact**
- [ ] All enemies in beam path killed instantly
- [ ] Beam passes through all entities (only terrain stops it)
- [ ] Laser toggled on/off via world state flag (works with levers, triggers, Lua)
- [ ] Laser defaults to ON if flag not set
- [ ] Impact particles at beam endpoint
- [ ] Laser base blocks movement, pathfinding, and projectiles
- [ ] Editor shows beam preview when laser is selected
- [ ] Editor round-trip: place → save → reload → data preserved
- [ ] Build and lint pass with zero errors

## Known Limitations (Not Bugs)

- **Editor preview is approximate** — checks terrain only, not entity occupants (entities paused in editor)
- **Particle emitter continues during interaction pause** — cosmetic only, no gameplay impact
- **One-frame delay for pushable position** — if laser updates before pushable, beam endpoint is one frame stale (imperceptible at 60fps)
- **`__laser_spark` texture persists globally** — tiny (4×4px), shared, never cleaned up. Acceptable.
