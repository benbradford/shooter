# Blocked Areas — Answers to Clarifying Questions

## 1. Collision Integration
- **Q1.1**: A — Grid collision box (feet area). Consistent with wall collision.
- **Q1.2**: A — Separate component after GridCollisionComponent in update order.
- **Q1.3**: A — Knockback respects polygon collision.
- **Q1.4**: A — Grid collision slides first, then polygon push-out applies MTV on the result.

## 2. Polygon Geometry
- **Q2.1**: A — Minimum 3 vertices (triangle).
- **Q2.2**: A — No vertex limit.
- **Q2.3**: C — Validate convexity in both editor and at load time.
- **Q2.4**: A — No size constraints.

## 3. Layer Behavior
- **Q3.1**: C — Only block if player's current layer matches exactly.
- **Q3.2**: A — One layer per blocked area. Draw multiple for multi-layer.

## 4. Projectile Behavior
- **Q4.1**: C — Point-in-polygon for now, optimize later if tunneling is an issue.
- **Q4.2**: A — Reuse existing onWallHit callback.
- **Q4.3**: C — Follow same layer rules as projectile-vs-cell collision.

## 5. Pathfinding Integration
- **Q5.1**: B — Separate `blockedAreaCells` set. Keeps concepts separate.
- **Q5.2**: A — Any overlap blocks the cell (conservative).

## 6. Pet Collision
- **Q6.1**: B — No pet polygon collision in v1. Separate feature later.

## 7. Editor Tool
- **Q7.1**: C — Fixed world-space snap distance (16px).
- **Q7.2**: A — Dots + lines + preview line to cursor.
- **Q7.3**: B — Right-click removes last vertex during drawing.
- **Q7.4**: C — Cycle through overlapping areas on repeated clicks.
- **Q7.5**: A — Color-coded by layer.
- **Q7.6**: C — Default true, editable in context panel after placement.
- **Q7.7**: B — Auto-detect layer from first vertex's cell.

## 8. Performance
- **Q8.1**: B — Rebuild at load and on editor changes.
- **Q8.2**: A — Few (fewer than 10 per level). Brute-force checking is fine, no spatial index needed.

## 9. Debug Visualization
- **Q9.1**: C — Show when grid debug (G) is enabled.
- **Q9.2**: B — Polygon outlines + filled interior.

## 10. Edge Cases
- **Q10.1**: C — Push out on first frame + log warning.
- **Q10.2**: B — Enemies don't collide with polygons, so it doesn't matter.
- **Q10.3**: A — Always static. Defined in level JSON, never change at runtime.
