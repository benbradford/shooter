---
name: new-level
description: Scaffold a new level JSON file with correct structure and optionally connect it to an existing level via exits.
---

# New Level

Create a new level file with correct structure, ready to edit.

## Usage

The user provides:
- **name** (required): level filename without extension (e.g., `grass_overworldnne`)
- **theme** (optional, default: `grass`): one of `dungeon`, `swamp`, `grass`, `wilds`, `tunnels`
- **size** (optional, default: `16x10`): `WIDTHxHEIGHT` in cells
- **connect-from** (optional): name of existing level to add a reciprocal exit pair

## Steps

1. **Create level file** at `public/levels/{name}.json` with this structure:
   ```json
   {
     "width": WIDTH,
     "height": HEIGHT,
     "playerStart": { "x": FLOOR(WIDTH/2), "y": FLOOR(HEIGHT/2) },
     "cells": [],
     "entities": [],
     "levelTheme": "THEME"
   }
   ```

2. **If connect-from is specified**:
   - Read the source level JSON
   - Ask the user which edge the exit should be on (north/south/east/west)
   - Add an exit entity in the source level pointing to the new level
   - Add a reciprocal exit entity in the new level pointing back to the source level
   - Position exits at appropriate edge cells based on direction

3. **Verify** the file is valid JSON and the dev server can serve it:
   ```bash
   python3 -c "import json; json.load(open('public/levels/{name}.json'))"
   ```

4. Report success. Remind the user they can open it with `?level={name}` or via the editor's level switcher.

## Exit Entity Template

```json
{
  "id": "exit_{direction}_to_{target}",
  "type": "exit",
  "data": {
    "col": COL,
    "row": ROW,
    "width": 1,
    "height": 1,
    "targetLevel": "TARGET_LEVEL",
    "targetCol": TARGET_COL,
    "targetRow": TARGET_ROW
  }
}
```

For edge exits, use width/height of 2 for wider exit zones.
