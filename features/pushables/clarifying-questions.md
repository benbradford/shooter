# Pushable Objects — Clarifying Questions

## Pre-Answered (resolved in spec or codebase)

### PA1: Push animations exist?
**Answer:** Yes. `push_${Direction}` animations already defined in PlayerEntity.ts for all 8 directions (frames 224–271). They are `'once'` style, 6 frames each at 0.1s/frame.

### PA2: Shadow?
**Answer:** Yes, ShadowComponent.

### PA3: Sound effects?
**Answer:** Deferred.

### PA4: Destroyable?
**Answer:** No.

### PA5: Event-driven spawn?
**Answer:** Yes, supports `createOnAnyEvent`.

### PA6: Persist position?
**Answer:** Optional via `doesPersist` field, saved to world state.

### PA7: Block enemy pathfinding?
**Answer:** Yes. Codebase has `GridCellBlocker` component used by breakables and bug bases — pushables will use the same pattern.

### PA8: Block projectiles?
**Answer:** Yes. Breakables use `CollisionComponent` with `collidesWith: ['player_projectile']` — pushables will need similar for both player and enemy projectiles.

### PA9: Push speed?
**Answer:** 100px/sec.

### PA10: Texture selection in editor?
**Answer:** Via texture picker, like cell background textures.

### PA11: HUD icon swap pattern?
**Answer:** AttackButtonComponent already swaps between `'punch'` and `'speech'` icons for NPC interaction. Push icon will follow the same pattern.

### PA12: How does player detect collision with pushable?
**Answer:** Grid occupant system. `GridCellBlocker` + `GridCollisionComponent` already blocks player movement into occupied cells. Contact detection will use this existing mechanism.

---

## Resolved Questions

### 1. Push Direction — Cardinal Only or 8-Direction?

**Answer: A) Cardinal only (4 directions).** Cleaner for grid-based puzzles. Diagonal pushes are ambiguous on a grid.

### 2. Push Animation Looping

**Answer: C) Lean loop + push action.** Use a subset of frames as a looping "lean" animation during contact, and the full animation as the "push" action.

### 3. Player Snap Position — Exact Placement

**Answer: A) Center of the adjacent cell** (one cell away from the pushable).

### 4. Contact Detection — How Does the Player "Walk Into" a Pushable?

**Answer: C) Keep GridCellBlocker but detect the "blocked" event in GridCollisionComponent and check if the blocker is a pushable.** Reuses existing systems.

### 5. Player State Architecture — New State or Component?

**Answer: A) New PlayerPushState** in the player's StateMachine. Cleanest SRP.

### 6. Pushable Blocks ALL Projectiles?

**Answer: A) Blocks both player projectiles AND enemy projectiles.** Acts as tactical cover.

### 7. What Happens When Player Takes Damage While Pushing?

**Answer: A) Player disengages from pushable, takes damage normally** (knockback etc.).

### 8. Pushable-on-Pushable — Chain Pushing?

**Answer: A) No chain pushing.** Blocked by another pushable, as spec says. V1 only.

### 9. Persistence Storage Format

**Answer: A) New `movedEntities: Array<{ id: string; col: number; row: number }>` field on LevelState.** Cleanest and extensible.

### 10. `pushEnabled` Toggle Mechanism

**Answer: D) Deferred.** Just support the JSON field for now, event toggling in a later version.

### 11. Does the Pushable Have a Layer?

**Answer: B) Inherit layer from spawn cell.** Auto-detected from the cell the pushable is placed on.

### 12. Push Icon Asset

**Answer: Asset exists at `public/assets/player/push_icon.png`.** Needs to be registered in AssetRegistry and added to the player asset group.

### 13. Interaction During Push — Can Player Be Interrupted?

**Answer: Fully locked** until joystick disengage. No NPC interaction, no pet ability, no other interruptions while in push contact.

### 14. Does Pushing Trigger Events?

**Answer: C) Deferred.** Design for it but don't implement in v1. Pushables are purely physical objects for now.
