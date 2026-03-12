# Spawner Entities Guide

## Overview

Two types of spawner systems:
1. **Proximity spawners** - Spawn when player is nearby (bug bases)
2. **Event-driven spawners** - Spawn when an event is triggered (enemy spawner system)

## Common Pitfalls

### ❌ Spawned Entities Don't Move

**Root Cause:** Missing `GridPositionComponent` or not in update order.

**Solution:** Ensure spawned entities have:
- `GridPositionComponent` added to entity
- `GridPositionComponent` in `setUpdateOrder()`
- State machine with movement logic
- Transform AND grid position both update

### ❌ Editor Ghost Sprite Wrong Size

**Cause:** Using `setScale()` instead of `setDisplaySize()`.

**Solution:**
```typescript
this.ghostSprite.setDisplaySize(grid.cellSize, grid.cellSize);
```

### ❌ Can't Drag Entity in Edit Mode

**Cause:** `pointerdown` event not registered in edit state.

**Solution:** Register in `onEnter()`, unregister in `onExit()`.

### ❌ Particles Don't Fade

**Cause:** Using `quantity` instead of `frequency`.

**Solution:**
```typescript
const emitter = scene.add.particles(x, y, 'texture', {
  frequency: 10,  // Not quantity
  alpha: { start: 1, end: 0 },
  lifespan: 500
});

scene.time.delayedCall(200, () => emitter.stop());
scene.time.delayedCall(700, () => emitter.destroy());
```

## Difficulty System

Use difficulty presets instead of individual parameters. Define presets as const objects, store difficulty on entity with DifficultyComponent.

## Editor Integration

### Critical: Editor Mode vs Game Mode

**Problem:** Enemies with IDs need to be visible in editor but not spawn at game start.

**Solution:** Use `isEditorMode` flag:
- Editor mode: All enemies spawn (including ID'd ones)
- Game mode: Only enemies without IDs spawn at start
- ID'd enemies spawn when spawner triggers them

### Storing IDs on Entities

Store the ID on the entity so it can be extracted when saving:
```typescript
if (enemyData.id) {
  (enemy as any).enemyId = enemyData.id;
}
```

Then extract in `EditorScene.extractEntities()`.

## Checklist for New Spawner Entity

- [ ] Create spawner component with max count tracking
- [ ] Create spawned entity with `GridPositionComponent`
- [ ] Include `GridPositionComponent` in update order
- [ ] Register spawned entities with entity manager
- [ ] Track spawned entities in Set and clean up on destroy
- [ ] Define difficulty presets
- [ ] Create difficulty component
- [ ] Create add entity editor state with ghost sprite
- [ ] Create edit entity editor state with difficulty buttons
- [ ] Register `pointerdown` event in edit state for drag-to-move
- [ ] Add click detection in default editor state
- [ ] Add to level data structure (interface in LevelLoader.ts)
- [ ] Add extraction method in EditorScene.ts
- [ ] Call extraction method in getCurrentLevelData()
- [ ] Load from level JSON in GameScene
- [ ] Test spawning, movement, difficulty, and editor
- [ ] Test save/load cycle
