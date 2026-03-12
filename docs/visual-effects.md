# Visual Effects Guide

## Hit Flash System

`HitFlashComponent` provides standardized red flash when entities take damage.

- Flash color: Light red (`0xff8888`)
- Flash interval: 100ms
- Duration: Configurable (typically 300ms)
- Auto-stop after duration

**Integration:** Add component, call `flash()` on damage. Or call in state `onEnter()`, `stop()` in `onExit()`.

## Particle Effects

### Key Concepts

**Callback-based:** Use ProjectileComponent callbacks (`onWallHit`, `onMaxDistance`) or CollisionComponent `onHit`.

**Smooth fade-out:**
1. Use `frequency` (not `quantity`) for continuous emission
2. Emit for short duration (100-200ms)
3. Stop emission but let particles fade
4. Each particle has its own lifespan with alpha fade

**Cleanup:** Particles created in callbacks are owned by scene. Use `scene.time.delayedCall()` to stop/destroy.

### Common Properties

- `speed`, `angle`, `scale`, `alpha`, `lifespan`
- `frequency` (continuous) vs `quantity` (one-shot)
- `tint`: Array of hex colors for variety
- `blendMode`: 'ADD' for glow, 'NORMAL' for standard
- `emitZone`: Circle or rectangle for spread

### Depth Management

- `-1` - Behind player (upward-facing effects)
- `1000+` - In front of player (other directions)

## Shadows

`ShadowComponent` handles shadows. Uses `shadow` texture, follows entity, renders at depth -1.

## Rotating Projectiles

`RotatingProjectileComponent` for spinning projectiles (bones, shurikens).

- Constructor takes `dirX` for rotation direction
- Rotates at 720°/sec
- Updates `TransformComponent.rotation` (not sprite.angle)
- Must update BEFORE TransformComponent

## Troubleshooting

**Flash not visible:** Check component in update order, verify `flash()` called.

**Particles don't follow:** Add to update order, ensure transform updates first.

**Particles don't fade:** Use `frequency` not `quantity`, set alpha fade.
