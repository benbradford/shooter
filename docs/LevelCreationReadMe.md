# Level Creation Guide

This document helps create better level designs for Dodging Bullets.

## Quick Reference

**Map dimensions:** 70 columns × 49 rows (each cell is 64×64 pixels)

**Symbols for ASCII maps:**
- `W` = Wall (layer 1)
- `.` = Floor (layer 0)
- `S` = Stairs (transition between layers)
- `P` = Player start
- `E` = Easy enemy
- `M` = Medium enemy
- `H` = Hard enemy
- `B` = Bug base (spawner)
- `T` = Thrower enemy

## Core Principles

### 1. Never Trap the Player
- Always provide an escape route from any area
- If using walls to enclose a space, include gaps or stairs
- Test: Can the player reach every part of the map?

### 2. Use Walls to Control Pacing
- Walls create corridors that limit enemy rush
- Open areas = all enemies attack at once (overwhelming)
- Narrow corridors = fight 1-2 enemies at a time (manageable)

### 3. Layer 1 Puzzles
- Force vertical gameplay: "Go up stairs, walk across platform, come back down"
- Stairs must come in pairs: one UP, one DOWN
- Example: Wall blocks path on layer 0, must use layer 1 to bypass

### 4. Progressive Difficulty
- **Easy (bottom):** 1-2 enemies per section, wide corridors
- **Medium (middle):** 2-3 enemies per section, narrower spaces
- **Hard (top):** 3-4 enemies per section, tight corridors, complex layouts

## Level Flow Template

```
1. Safe Start Area
   - Player spawns here
   - No enemies immediately visible
   - Clear path forward

2. First Encounter (Easy)
   - 1-2 easy enemies
   - Wide corridor or small room
   - Teaches basic combat

3. Corridor Section
   - Walls on both sides
   - 2-3 enemies spread out
   - Forces sequential combat

4. Layer 1 Puzzle
   - Wall blocks direct path
   - Stairs up to layer 1
   - Walk across platform
   - Stairs down to continue

5. Mid-Boss Area (Medium)
   - Slightly larger space
   - 2-3 medium enemies
   - Maybe a bug base

6. Repeat pattern with increasing difficulty

7. Final Area (Hard)
   - Largest space
   - 3-4 hard enemies
   - Multiple threats
```

## ASCII Map Example (10×10 section)

```
  0 1 2 3 4 5 6 7 8 9
0 W W W W W W W W W W
1 W W W W W W W W W W
2 W W S W W W W S . .
3 W . . . W W . . E .
4 W . . . W W . . . .
5 W . P . W W . . . .
6 W . . . W W . . M .
7 W . . . W W . . . .
8 W W W W W W . . . .
9 . . . . . . . . . .

Flow:
- Player starts at (2, 5)
- Blocked by walls at cols 4-5
- Must go up stairs at (2, 2)
- Walk across layer 1 (cols 2-7)
- Down stairs at (7, 2)
- Fight easy enemy at (8, 3)
- Continue to medium enemy at (8, 6)
- Exit south
```

## Common Mistakes

### ❌ Too Open
```
. . . . . . . .
. E . . . M . .
. . . . . . . .
. . P . . . H .
. . . . . . . .
```
All enemies rush at once - overwhelming.

### ✅ Controlled with Walls
```
W W W W W W W W
W . . . W . E W
W . P . W . . W
W . . . W . M W
W W . W W W W W
```
Walls create path - fight enemies one at a time.

### ❌ Trapped Player
```
W W W W W W
W . . . . W
W . P . . W
W W W W W W
```
No exit - player stuck forever.

### ✅ Always Provide Exit
```
W W W W W W
W . . . . W
W . P . . .  ← Gap in wall
W W W W W W
```

## Enemy Placement Guidelines

**Easy enemies:**
- Place in open areas
- Give player space to dodge
- 1-2 per section

**Medium enemies:**
- Place in corridors
- Limit escape routes
- 2-3 per section

**Hard enemies:**
- Place in tight spaces
- Combine with other enemies
- 3-4 per section

**Bug bases (spawners):**
- Place in corners or alcoves
- Give player room to fight spawned bugs
- 1 per large section

**Throwers:**
- Place at end of long corridors
- Force player to dodge while advancing
- Combine with walls for cover

## Stairs Placement Rules

1. **Always in pairs:** One up, one down
2. **In bottom row of wall block:** Stairs must be in the last row of layer 1 cells
3. **Accessible from layer 0:** Player must be able to reach stairs without already being on layer 1
4. **Clear path on layer 1:** Ensure player can walk from up-stairs to down-stairs

**Example:**
```
Row 10: W W W W W W W W  ← Layer 1 wall block
Row 11: W W W W W W W W  ← Layer 1 wall block
Row 12: W W S W W W S W  ← Stairs in bottom row
Row 13: . . . . . . . .  ← Layer 0 (player can reach stairs)
```

## How to Communicate Level Design

### Option 1: ASCII Map
Provide a full ASCII map with symbols showing layout.

### Option 2: Describe Flow
"Start bottom-left, corridor north with 2 easy enemies, turn right at wall, go up stairs, walk across platform, down stairs, fight medium enemy in room, continue north..."

### Option 3: Reference Style
"Like Hotline Miami - tight corridors, one room at a time"
"Like Zelda dungeon - puzzle rooms connected by hallways"

### Option 4: Iterate
"The level you created is too open in the middle section - add walls at cols 20-25 to create a corridor"

## Testing Checklist

- [ ] Can player reach every area?
- [ ] Are there any enclosed spaces with no exit?
- [ ] Does each stairs-up have a corresponding stairs-down?
- [ ] Are enemies spread out (not all in one cluster)?
- [ ] Is difficulty progressive (easy → medium → hard)?
- [ ] Are corridors narrow enough to prevent enemy rush?
- [ ] Are there safe zones between hard encounters?

## Future Improvements

Add your notes here as you discover what works:

- 
- 
- 
