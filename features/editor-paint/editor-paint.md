# Editor Paint Tool

## Overview

Paint directly on the level canvas in the editor and see results rendered in-game. Supports freehand drawing, straight lines, adjustable brush size, color with alpha, and undo/redo.

## Requirements

- Color wheel picker with alpha/transparency
- Adjustable brush size
- Freehand painting (pointer drag)
- Straight line mode (shift-click between points)
- Undo/redo via Cmd+Z / Cmd+Shift+Z plus UI buttons
- Delete button to remove all paint data
- Paint data stored in level JSON and rendered in-game
- File size must stay small

## File Size Strategy

Level files are currently 2–89KB. Freehand strokes with raw point arrays would bloat them.

**Approach: Point simplification + compact inline format**

1. **Point simplification** — Ramer-Douglas-Peucker at capture time (epsilon ~2px). Reduces freehand strokes from hundreds of points to ~10-30 per stroke.

2. **Compact inline JSON** — Flat coordinate arrays, hex8 color (includes alpha), integer width:
   ```json
   "paintData": {
     "strokes": [
       { "c": "#ff000080", "w": 3, "p": [100,200, 110,205, 130,220] }
     ]
   }
   ```
   Flat arrays cut JSON overhead ~60% vs `{x,y}` objects.

3. **External file option** — If paint data exceeds ~5KB, store as `{levelName}.paint.json` (or binary `.paint.bin`) and reference from level JSON as `"paintFile": "dungeon1.paint.json"`. Keeps level JSON clean.

## Architecture

### Files to Modify

| File | Change |
|------|--------|
| `src/systems/level/LevelLoader.ts` | Add `paintData` field to `LevelData`, define `PaintStroke` type |
| `src/constants/DepthConstants.ts` | Add `paint: -5` depth (between `cellTextureModified: -8` and entities at `0`) |
| `src/scenes/theme/GameSceneRenderer.ts` | Add `createPaintGraphics(levelData)` to render strokes in-game |
| `editor/EditorBridge.ts` | Paint state (color, brush size, opacity), mutation methods, serialization |
| `editor/CanvasInteraction.ts` | Pointer event routing for `tool === 'paint'`, freehand + shift-line |
| `editor/panels/Toolbar.ts` | Add "Paint" tool button and paint sub-panel |

### Data Model

```typescript
type PaintStroke = {
  c: string;      // hex8 color with alpha (e.g. "#ff000080")
  w: number;      // brush width in pixels
  p: number[];    // flat array of [x1,y1, x2,y2, ...] world coordinates
};

// Added to LevelData:
paintData?: {
  strokes: PaintStroke[];
};
```

### Rendering (In-Game)

- `GameSceneRenderer.createPaintGraphics()` reads `levelData.paintData.strokes`
- Creates a single `Phaser.GameObjects.Graphics` at `Depth.paint`
- For each stroke: `lineStyle(w, colorInt, alpha)` → `moveTo` → `lineTo` per point pair → `strokePath()`
- Called during `initializeSprites()`

### Editor Tool

**Toolbar:** Add "Paint" to tool list. Sub-panel shows:
- Color input (HTML `<input type="color">`) + alpha slider
- Brush size slider (1–20px)
- Delete All button
- Undo/Redo buttons (wire to existing history stack)

**Pointer handling:**
- `pointerdown`: Start new stroke, record first point
- `pointermove`: Add points (with 4px minimum distance threshold to avoid redundancy)
- `pointerup`: Finalize stroke — apply RDP simplification, wrap in `_applyMutation()`
- Shift held + click: Draw straight line from last stroke endpoint to click position

**Live preview:** Draw current in-progress stroke on a temporary Graphics object (destroyed on finalize).

### Undo/Redo

Each finalized stroke is a single `_applyMutation()` call. The existing EditorBridge history system (max 50 entries, Cmd+Z undo) handles this automatically. Cmd+Shift+Z triggers redo from the existing redo stack.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Coordinate space | World pixels | Sub-cell precision for freehand, resolution-independent |
| Depth layer | `-5` (below entities, above cell textures) | Decorative ground markings shouldn't obscure gameplay |
| Blend mode | Normal (default) | Simpler; multiply can be added later as option |
| RDP epsilon | 2px | Invisible to eye, cuts point count 80-90% |
| External file threshold | 5KB paint data | Keeps level JSON lean for most levels |
| Single Graphics object | Yes | One draw call for all strokes, better perf than per-stroke objects |

## Implementation Phases

### Phase 1: Data model + in-game rendering
- Define `PaintStroke` type and `paintData` field in LevelLoader
- Add depth constant
- Render strokes in GameSceneRenderer

### Phase 2: Editor tool
- Add Paint tool to toolbar with sub-panel
- Handle freehand pointer events with distance threshold
- Shift-click straight lines
- Live preview during drag
- RDP simplification on finalize

### Phase 3: Undo/redo + delete
- Wire Cmd+Shift+Z to redo
- Add undo/redo UI buttons in paint panel
- Delete-all button (single mutation clearing strokes array)
- Click-to-select individual strokes + Delete key

### Phase 4: File size optimization
- Implement external file export when paint data > 5KB
- Add loading from external paint file in LevelLoader
