# Blocked Areas — Clarifying Questions

These questions must be answered before writing requirements or design docs.

---

## 1. Collision Integration

### Q1.1: Which collision box does the player use for polygon push-out?
The player has TWO collision boxes:
- **Grid collision box** (GridPositionComponent): `{ offsetX: 0, offsetY: 24, width: 34, height: 16 }` — used for wall/cell collision
- **Entity collision box** (CollisionComponent): used for entity-to-entity collision (projectiles, enemies)

Which box should be tested against blocked area polygons?
- A) Grid collision box (consistent with wall collision — player "feet" area)
- B) Entity collision box (consistent with damage hitbox)
- C) A new, separate collision box for polygon collision

**Why it matters:** The grid collision box is small and offset to the feet. The entity collision box is larger and centered. Using the wrong one will feel inconsistent with how the player interacts with walls.

### Q1.2: Update order — where does polygon collision run?
Currently the player update order is:
```
WalkComponent → GridCollisionComponent → [rest]
```
GridCollisionComponent snaps the player back to `previousX/previousY` when blocked. The spec says polygon collision runs "after grid collision, before final position commit."

Should polygon collision:
- A) Run as a separate component after GridCollisionComponent in the update order
- B) Be integrated into GridCollisionComponent itself
- C) Run as a post-processing step in GridCollisionComponent

**Why it matters:** Option A is cleanest (SRP) but means the player position is committed by GridCollisionComponent, then potentially modified again by the polygon component. Option B keeps all collision in one place but makes GridCollisionComponent even more complex.

### Q1.3: Interaction with knockback
When the player is knocked back (KnockbackComponent), they slide along the ground. Should knockback movement also be blocked by polygon areas?
- A) Yes — knockback respects polygon collision (player slides along polygon edges)
- B) No — knockback ignores polygons (simpler, knockback is brief)

**Why it matters:** If yes, the polygon collision component needs to handle knockback velocity, not just walk velocity.

### Q1.4: Interaction with sliding collision
GridCollisionComponent already implements sliding: if diagonal movement is blocked, it tries X-only and Y-only. The spec says polygon push-out uses MTV (minimum translation vector). How should these two sliding systems interact?

- A) Grid collision slides first, then polygon push-out applies MTV on the result
- B) Both systems run independently and the final position is the intersection of both constraints
- C) Polygon push-out replaces grid sliding for cells that contain blocked areas

**Why it matters:** Two independent sliding systems could fight each other or produce jittery movement. Need a clear resolution order.

---

## 2. Polygon Geometry

### Q2.1: Minimum vertex count
What's the minimum number of vertices for a blocked area?
- A) 3 (triangle — minimum convex polygon)
- B) 4 (quad — more practical minimum)

**Why it matters:** Triangles are valid convex polygons but might be too small to be useful. Affects editor validation.

### Q2.2: Maximum vertex count
Should there be a maximum vertex count per polygon?
- A) No limit
- B) Reasonable limit (e.g., 16 vertices)
- C) Limit based on performance (e.g., 8 vertices)

**Why it matters:** More vertices = more SAT axes to check per frame. Also affects editor UX.

### Q2.3: Convexity validation
When should convexity be validated?
- A) In the editor only (prevent saving concave polygons)
- B) At level load time (reject or warn)
- C) Both editor and load time

**Why it matters:** If a level JSON is hand-edited with a concave polygon, the SAT algorithm will produce incorrect results silently.

### Q2.4: Polygon size constraints
Should there be minimum/maximum size constraints?
- A) No constraints — any size polygon is valid
- B) Minimum area (e.g., 16 sq px) to prevent degenerate polygons
- C) Maximum size (e.g., can't span more than N cells)

**Why it matters:** Very thin or very small polygons can cause numerical instability in SAT. Very large polygons spanning many cells affect the spatial index efficiency.

---

## 3. Layer Behavior

### Q3.1: Layer interaction with stairs/transitions
The spec says each blocked area has a `layer` property. When the player is on stairs (transition cells), their layer is changing. Should blocked areas on the transition layer affect the player during stair traversal?
- A) Yes — blocked areas on the stair's layer block during traversal
- B) No — ignore blocked areas while on transition cells
- C) Only block if the player's current layer matches exactly

**Why it matters:** Stairs are special cells where the player's layer is in flux. Need clear rules.

### Q3.2: Multi-layer blocked areas
Can a single blocked area span multiple layers?
- A) No — one layer per blocked area (draw multiple for multi-layer)
- B) Yes — add a `layers` array instead of single `layer`

**Why it matters:** A tall pillar might need to block on layers 0 and 1. Multiple polygons with identical vertices but different layers is verbose.

---

## 4. Projectile Behavior

### Q4.1: Projectile collision precision
The spec says "check projectile position against polygon interior each frame." Projectiles are fast-moving points. Should we:
- A) Point-in-polygon test only (simple, may tunnel through thin polygons)
- B) Ray-segment intersection (line from previous to current position — prevents tunneling)
- C) Point-in-polygon is fine for now, optimize later if needed

**Why it matters:** Fast projectiles can skip over thin polygon edges between frames. Ray intersection is more expensive but prevents tunneling.

### Q4.2: Projectile wall-hit callback
When a projectile hits a blocked area polygon, should it:
- A) Call the existing `onWallHit` callback (same as hitting a wall cell)
- B) Call a new `onBlockedAreaHit` callback (different behavior possible)
- C) Just destroy the projectile (no callback)

**Why it matters:** Some projectiles create visual effects on wall hit (sparks, etc.). Should blocked areas trigger the same effects?

### Q4.3: Projectile layer check
Should projectile-vs-polygon collision also respect the `layer` property?
- A) Yes — only block projectiles on the same layer as the polygon
- B) No — blocked areas block all projectiles regardless of layer
- C) Follow the same layer rules as projectile-vs-cell collision

**Why it matters:** A projectile fired from layer 0 shouldn't be blocked by a polygon on layer 1.

---

## 5. Pathfinding Integration

### Q5.1: Cell marking strategy
The spec says "any cell that overlaps a blocked area polygon is marked as blocked for pathfinding." How should this marking work?
- A) Add `'blocked'` property to overlapping cells at level load (modifies grid state)
- B) Maintain a separate `blockedAreaCells: Set<string>` that Pathfinder checks
- C) Pathfinder queries a BlockedAreaManager for each cell

**Why it matters:** Option A is simplest but conflates two different blocking concepts (cell-level blocked vs polygon-blocked). A cell might be walkable for the player (polygon only partially covers it) but blocked for pathfinding. Option B/C keeps the concepts separate.

### Q5.2: Partial cell overlap
If a polygon covers only 10% of a cell, should that cell still be blocked for pathfinding?
- A) Yes — any overlap blocks the cell (conservative, as spec says)
- B) Only if polygon covers >50% of the cell
- C) Configurable threshold

**Why it matters:** Very conservative blocking could create unnecessarily long paths for enemies around small obstacles.

---

## 6. Pet Collision

### Q6.1: Do pets get polygon collision?
The spec says "only the player (and potentially pets) get sub-cell polygon collision." Should pets get polygon collision in v1?
- A) Yes — pets also collide with polygons
- B) No — pets ignore polygons in v1, add later
- C) Pets use cell-level avoidance only (same as enemies)

**Why it matters:** Pets use PetFollowComponent with direct world-space movement (no GridCollisionComponent). Adding polygon collision to pets requires a different integration point.

---

## 7. Editor Tool

### Q7.1: Polygon closing snap distance
The spec says "clicking near the first vertex closes the polygon." What's the snap distance?
- A) Fixed pixel distance (e.g., 10px screen space)
- B) Proportional to zoom level
- C) Fixed world-space distance (e.g., 16px world)

**Why it matters:** At high zoom, a fixed screen-space distance covers very little world space. At low zoom, it covers a lot.

### Q7.2: Visual feedback during drawing
While drawing vertices, what visual feedback should be shown?
- A) Dots at placed vertices + lines between them + preview line to cursor
- B) Same as A, plus semi-transparent fill of the polygon-so-far
- C) Same as A, plus cell overlay showing which cells would be blocked for pathfinding

**Why it matters:** Option C gives the most useful feedback but is more complex to implement.

### Q7.3: Undo during drawing
If the user places a wrong vertex while drawing, can they undo the last vertex?
- A) No — must delete and redraw (consistent with "delete-and-redraw" decision)
- B) Yes — right-click or Escape removes last vertex during drawing mode only
- C) Yes — Ctrl+Z removes last vertex during drawing

**Why it matters:** Drawing complex polygons without undo is frustrating. But the spec says "no vertex editing after placement" — does that extend to during-drawing?

### Q7.4: Blocked area selection hit testing
The spec says "click inside an existing blocked area to select it." What if blocked areas overlap?
- A) Select the topmost (last in array)
- B) Select the smallest area
- C) Cycle through overlapping areas on repeated clicks

**Why it matters:** Overlapping polygons are valid. Need a deterministic selection strategy.

### Q7.5: Editor visual for layer
How should the editor indicate which layer a blocked area belongs to?
- A) Color-coded by layer (e.g., layer 0 = red, layer 1 = blue)
- B) Label text showing layer number
- C) Only show blocked areas for the currently selected/viewed layer

**Why it matters:** Multiple layers of blocked areas could be visually confusing without clear differentiation.

### Q7.6: blocksProjectiles toggle in editor
How should the `blocksProjectiles` property be configured?
- A) Checkbox in context panel when a blocked area is selected
- B) Toggle button during drawing mode
- C) Default to true, editable in context panel after placement

**Why it matters:** Most blocked areas will block projectiles. Need a simple way to toggle the exception cases.

### Q7.7: Layer selection in editor
How does the user set the layer for a new blocked area?
- A) Dropdown/input in toolbar before drawing
- B) Automatically use the layer of the cell where the first vertex is placed
- C) Editable in context panel after placement

**Why it matters:** Layer 0 is the most common case. Auto-detection from cell layer is convenient but could be wrong for elevated areas.

---

## 8. Performance & Spatial Index

### Q8.1: Spatial index rebuild
The spec says "at level load, build a map of cell → [polygon indices]." Should this index be rebuilt when:
- A) Only at level load (blocked areas are static)
- B) Also when editor adds/removes blocked areas
- C) Lazily on first query after modification

**Why it matters:** If blocked areas are always static at runtime, the index only needs building once. Editor needs rebuilding on every change.

### Q8.2: Expected polygon count
Roughly how many blocked areas per level?
- A) Few (1-10) — small rocks, furniture
- B) Moderate (10-50) — detailed environments
- C) Many (50-200) — heavily decorated levels

**Why it matters:** Affects whether the spatial index is necessary or overkill. For <10 polygons, brute-force checking all of them is fine.

---

## 9. Debug Visualization

### Q9.1: Debug rendering
Should blocked areas have debug visualization in-game (not just editor)?
- A) Yes — toggle with a key (like G for grid debug)
- B) No — only visible in editor
- C) Yes — shown when grid debug (G) is enabled

**Why it matters:** Debugging polygon collision issues requires seeing the polygons at runtime.

### Q9.2: Debug info
What should debug visualization show?
- A) Polygon outlines only
- B) Polygon outlines + filled interior
- C) Polygon outlines + filled interior + normals + cell overlap indicators

**Why it matters:** More info helps debugging but clutters the screen.

---

## 10. Edge Cases

### Q10.1: Player spawns inside polygon
The spec mentions this. What's the exact behavior?
- A) Push out on first frame using MTV (same as normal collision)
- B) Teleport to nearest valid position
- C) Log a warning and push out (design error, shouldn't happen)

**Why it matters:** If the level designer accidentally places the player start inside a polygon, the game shouldn't softlock.

### Q10.2: Entity spawns inside polygon
What about enemies/NPCs that spawn inside a blocked area?
- A) Same as player — push out
- B) Enemies don't collide with polygons, so it doesn't matter
- C) Log a warning (design error)

**Why it matters:** Enemies use cell-level pathfinding, so they shouldn't be in blocked cells. But if a polygon partially covers a cell that an enemy spawns in, the enemy's sprite might visually overlap the blocked area.

### Q10.3: Moving blocked areas
Are blocked areas always static, or could they move at runtime (e.g., a sliding door)?
- A) Always static — defined in level JSON, never change
- B) Could be dynamic in the future (design for extensibility)
- C) Static for now, but don't make assumptions that prevent future dynamism

**Why it matters:** Dynamic blocked areas would require rebuilding the spatial index and pathfinding grid at runtime. Affects architecture significantly.

---

## Priority Questions (Answer These First)

The following have the biggest impact on architecture:

1. **Q1.1** — Which collision box? (Determines collision math)
2. **Q1.2** — Update order? (Determines component architecture)
3. **Q1.4** — Sliding interaction? (Determines collision resolution strategy)
4. **Q5.1** — Cell marking strategy? (Determines pathfinding integration)
5. **Q6.1** — Pet collision? (Determines scope)
6. **Q7.3** — Undo during drawing? (Determines editor UX complexity)
7. **Q8.2** — Expected polygon count? (Determines performance strategy)
8. **Q10.3** — Static or dynamic? (Determines architecture flexibility)
