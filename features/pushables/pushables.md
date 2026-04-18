# Feature: Pushable Objects

## Summary

Introduce pushable objects — single-sprite entities that the player can push across the grid. When the player walks into a pushable, they lean against it playing their push animation. Pressing the push button then moves the object one cell at a time.

## Interaction Model

### Phase 1: Contact
- Player walks into a pushable object (collision)
- Player stops moving and snaps to a cardinal position (left, right, above, below) relative to the object — whichever is closest
- Player faces the push direction and plays `push_{direction}` animation on loop
- The object does NOT move yet
- The HUD punch icon swaps to `push_icon.png`
- Movement joystick is disabled while in contact

### Phase 2: Pushing
- Player presses the push button (same as punch)
- Object moves exactly one cell (64px) in the push direction
- Player follows behind the object at the same speed
- Both arrive at the center of their destination cells
- If push is still held when the cell move completes, another cell move begins immediately
- If push is released mid-move, the current cell move completes then stops

### Phase 3: Release
- Player releases push button (or was never holding it)
- Object stays where it is
- Player walks away from the object (joystick re-enabled)
- Push animation stops, returns to idle
- HUD icon reverts to punch icon

### Disengagement
- If the player moves the joystick while in contact (Phase 1), they disengage and walk away
- Push icon reverts to punch icon

## Collision Rules
- Before each cell move, check destination cell for: wall, platform, blocked area, another pushable, water, out of bounds, any entity with collision
- If blocked: push animation plays (player strains) but object doesn't move. Player can keep holding push — if the blocker is removed (e.g., by an event), the push resumes
- Pushables stay on their current layer — cannot push onto stairs/transitions
- Pushables block enemy pathfinding
- Pushables block projectiles

## Entity Definition

```json
{
  "id": "pushable0",
  "type": "pushable",
  "data": {
    "col": 10,
    "row": 5,
    "texture": "crate",
    "pushEnabled": true,
    "doesPersist": true
  }
}
```

### Fields
- `col`, `row`: Grid position
- `texture`: Sprite texture key (selectable in editor via texture picker)
- `pushEnabled`: Whether the object can currently be pushed (default true, can be toggled by events)
- `doesPersist`: If true, pushed position persists in world state across level transitions (default false)

## Visual Details
- Pushable renders as a single sprite at the texture's natural size, scaled to fit cell
- Has a shadow (ShadowComponent)
- No highlight/outline when in range — the HUD icon change is the indicator

## Persistence
- When `doesPersist: true`, the pushed position is saved to world state (similar to modifiedCells)
- On level re-entry, pushable spawns at its persisted position instead of its JSON position
- When `doesPersist: false`, pushable resets to its JSON position on level re-entry

## Editor Integration
- New entity type `pushable` in editor dropdown
- Texture selectable via texture picker (like cell background textures)
- `pushEnabled` checkbox
- `doesPersist` checkbox
- Standard entity placement, selection, deletion, move

## Questions — Resolved

1. **Shadow?** Yes
2. **Sound effect?** Deferred to later
3. **Destroyable?** No
4. **Event-driven spawn?** Yes (supports `createOnAnyEvent`)
5. **Persist position?** Optional via `doesPersist` field
6. **Textures?** Editor texture selector — no hardcoded textures
7. **Visual indicator?** HUD icon swap only
8. **Block enemy pathfinding?** Yes
9. **Block projectiles?** Yes
10. **Push speed?** 100px/sec

## Estimated Complexity

- New entity type + factory: 1-2 hours
- PushableComponent (contact detection, cell movement, collision): 3-4 hours
- Player push state (icon swap, animation, input lock, snap): 2-3 hours
- Persistence in world state: 1 hour
- Editor integration: 1-2 hours
- Testing: 1-2 hours
- **Total: ~9-14 hours**
