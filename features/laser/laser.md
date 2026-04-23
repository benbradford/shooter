# Laser Enemy Type

## Overview

A stationary laser emitter that fires a continuous beam in a fixed direction. The beam is a visual and gameplay hazard that damages the player and instantly kills enemies.

## Behavior

- **Stationary** — does not move, placed on a grid cell
- **Continuous beam** — always on (no charge-up, no burst)
- **Fixed direction** — direction set in the editor, supports arbitrary angles (not just 8 directions)
- **Beam stops at walls, platforms, blockers, and pushable entities**
- **Indestructible** — cannot be destroyed by the player
- **Toggle via world state flag** — `{entity_id}_laser_on` flag controls visibility
  - If flag is `"true"` → laser is visible and active
  - If flag is `"false"` → laser is hidden and inactive
  - Flag name configurable in editor (defaults to `{entity_id}_laser_on`)
  - If flag is not set at all, laser defaults to ON

## Damage

- **Player hit**: **Instant kill** — laser is a hard barrier, touching the beam kills the player immediately
- **Enemy hit**: Instant kill (enemies die immediately on contact with beam)

## Visual Design

### Laser Base (Emitter)
- Small circular/hex base sprite: `laser_base.png` in `public/assets/generic/`
- Size: ~16–24px
- Dark metal base with glowing red center
- Small directional nozzle

### Beam (3 layers)
1. **Inner Core** — bright white/light yellow line, 2–4px wide
2. **Outer Glow** — red, 6–10px wide, alpha 0.3–0.6
3. **Pulsing Energy Overlay** — animated flicker / sine-wave width change for life

### Impact / End Point Effect
- Small burning spark / energy splash at collision point
- Animated particles:
  - Flickering, short-lived, slight outward motion
  - Tiny sparks (2–4px)
  - Bright yellow core, orange/red fade
  - Optional subtle smoke puffs

### Diagonal Support
- Keep beam crisp (no blur)
- Snap to grid increments if possible

## Editor Integration

- Place laser entity on grid cell
- Set direction as arbitrary angle (degrees or radial selector)
- Set the world state flag name that controls on/off
- No difficulty tiers

## Additional Clarifications (Round 2)

- Q: Damage cooldown? → **No cooldown — instant kill on contact. Laser is a hard barrier for level design.**
- Q: Knockback when stationary? → **N/A — player dies instantly on contact**
- Q: Full blocker list? → **Anything that blocks player movement blocks the laser** (walls, platforms, blockers, pushables, breakables, blocked areas)
- Q: Beam pass-through? → **Beam passes through enemies (kills all in path), only stops at terrain/blockers**
- Q: Beam collision width? → **Same as visual glow (6–10px)**

## Pre-Answered Clarifications

- Q: Stationary or moving? → **Stationary**
- Q: Continuous or burst? → **Continuous**
- Q: Fixed, sweeping, or tracking? → **Fixed direction, set in editor**
- Q: Beam stops at walls? → **Yes, stops at walls/platforms/blockers/pushables**
- Q: Damage model? → **50 HP to player + 20px knockback; instant kill to enemies**
- Q: Destructible? → **No, toggle via world state flag**
- Q: Difficulty tiers? → **No**
- Q: Beam color? → **Red**
- Q: Warning indicator? → **No, laser is either on or off**
- Q: Direction count? → **Arbitrary angles**
