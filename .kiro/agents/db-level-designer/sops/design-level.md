# SOP: Design Level Layout

## Purpose

Create or iterate on a level JSON file with prop placement, enemy positioning, and spatial gameplay design.

## Process

### Step 1: Understand the Brief

Read the user's request. Identify:
- Which level file to modify
- Theme (wilds, dungeon, grass)
- Specific requests (more rocks, move pumas, add ambush zones)
- Constraints (preserve exits, keep certain entities)

### Step 2: Read Current State

```
1. Read public/levels/{level}.json
2. Read src/editor/SpritesheetTextures.ts for available sprites
3. Note: dimensions, player start, exits, existing entities
```

### Step 3: Plan Zones

Divide the map into horizontal bands:

```
Entry zone (rows 0-N): Sparse, player orients
First encounter (rows N-M): First enemy, teaches mechanics
Open tension (rows M-P): Very sparse, player feels exposed
Dense middle (rows P-Q): Clusters, ambushes, multiple enemies
Corridors (rows Q-R): Tall grass flanking paths
Exit zone (rows R-end): Final encounters or resolution
```

Adjust band sizes based on map height. Not all zones needed for every level.

### Step 4: Place Clusters First

Rock clusters (3-5 rocks each):
- Pick a center cell
- Add 2-4 adjacent rocks using different rock sprites
- Vary the shape (L, T, diamond, not always square)

Tall grass ambush zones (4-7 cells each):
- Place flanking a likely player path
- Rectangular or L-shaped
- Put a puma inside or adjacent

### Step 5: Place Enemies

- Pumas near tall grass or behind rock clusters
- Pairs for pack behavior
- One sentinel in open space near entry
- Hard difficulty for sentinels and final encounters
- Medium for ambush pumas

### Step 6: Fill Small Props

- Ground cover in strips of 2-4 cells
- Dry brush and moss as tiny details (1 cell each)
- Fallen logs in pairs
- Dead trees as landmarks (1-2 per level)
- Skull bones for atmosphere (1-3 per level)

### Step 7: Verify

Count cells with backgroundTexture. For a 40×30 map (1200 cells):
- Props should cover ~80-120 cells max (7-10%)
- At least 3 zones should be nearly empty
- Every rock cluster has 3+ rocks
- Every tall grass patch has 4+ cells

### Step 8: Write and Validate

Write the JSON file. Then:
```bash
python3 -c "import json; json.load(open('public/levels/{level}.json'))"
```

## Iteration Checklist

When iterating on feedback:
- [ ] Read feedback carefully
- [ ] Make targeted changes (don't rewrite everything)
- [ ] Explain what changed and why
- [ ] Re-verify 60/30/10 rule
- [ ] Validate JSON
