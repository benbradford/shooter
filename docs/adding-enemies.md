# Adding Enemies

## Overview

Enemies use ECS architecture with state machines, grid-based positioning, difficulty presets, and optional event-driven spawning.

## AI Distance Management

Use both pathfinding distance (cells) and pixel distance with hysteresis:
- **MAX_CHASE_DISTANCE_CELLS**: Path length limit (typically 16)
- **MAX_CHASE_DISTANCE_PX**: Straight-line distance limit (typically 800)
- **CHASE_STOP_MULTIPLIER**: 1.5× for hysteresis

**Why both?** Path distance accounts for walls/stairs, pixel distance prevents chasing through walls, hysteresis prevents flickering.

**Critical:** Use `getPlayerFeetCell()` from `PlayerPositionHelper` for pathfinding - player sprite overlaps walls above them.

## Step-by-Step Process

1. **Prepare Assets** - Create sprite sheet, document layout, add to AssetRegistry
2. **Create Components** - Movement, detection, combat, physics
3. **Create State Classes** - Patrol, alert, chase, attack, hit, death
4. **Create Entity Factory** - Assemble components, set update order
5. **Add to EntityLoader** - Add case in switch statement
6. **Use Editor** - Press E → Add → Place → Log to save

## Editor Integration

1. Add entity type to `ENTITY_TYPES` in `editor/panels/Toolbar.ts`
2. Add default data in `EditorBridge.addEntity()`
3. Add label in `CanvasInteraction.ts` labelMap
4. Add extraction logic in `EditorBridge.extractEntities()`
5. Add form fields in `editor/panels/ContextPanel.ts`

## Common Pitfalls

### ❌ Animations Not Playing
**Solution:** Track current animation key, only call play() when it changes.

### ❌ Rotating Projectiles Don't Rotate
**Solution:** Update TransformComponent.rotation, not sprite.angle. Order: RotatingProjectileComponent → TransformComponent → SpriteComponent.

### ❌ Entity Not Updating
**Solution:** Add component to `setUpdateOrder()` and EntityManager.

### ❌ Level Data Not Persisting
**Solution:** Modify GameScene's level data directly via `getLevelData()`.

### ❌ Entity Vanishes on Save
**Solution:** Add extraction logic in `EditorBridge.extractEntities()` — most commonly forgotten step.

## Testing Checklist

- [ ] Spawns, animates, transitions states correctly
- [ ] Collision works (walls, player, projectiles)
- [ ] Takes damage and dies properly
- [ ] No performance issues with multiple instances
- [ ] Works after save/load
- [ ] Editor integration works
- [ ] Debug logs removed
