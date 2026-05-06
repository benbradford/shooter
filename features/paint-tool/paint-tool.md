# Paint Tool - Feature Description

## Overview

A freehand paint tool in the level editor that allows drawing directly on the canvas with results visible in-game. Paint strokes are stored in level JSON and rendered at runtime.

## Core Features

### Color Picker
- Color wheel / color input for selecting paint color
- Alpha/transparency slider (0-1)
- Remembers last used color between strokes

### Brush Size
- Adjustable brush width (pixels)
- Slider or numeric input in the paint panel

### Drawing Modes
- **Freehand**: Click-drag to paint continuous strokes
- **Straight line**: Shift-click to draw a straight line from the last stroke endpoint to the current click position
- **Single point**: Click without dragging for a dot/stamp

### Undo/Redo
- Cmd+Z to undo last stroke
- Cmd+Shift+Z to redo
- UI buttons for undo/redo in the paint panel
- Integrates with existing editor mutation/history system

### Delete All
- Button to remove all paint strokes from the level
- Confirmation before clearing

### Persistence
- Paint data stored in level JSON (`paintStrokes` field)
- Loaded and rendered in-game during normal gameplay
- Survives level transitions (part of level data)

## Data Model

```typescript
type PaintStroke = {
  points: Array<{ x: number; y: number }>; // World pixel coordinates
  color: number;    // Hex color (0xRRGGBB)
  alpha: number;    // 0-1 transparency
  width: number;    // Brush size in pixels
};
```

## Rendering

- Paint renders between cell textures and edge graphics (depth ~-30)
- Visible in both editor and in-game
- Uses Phaser Graphics object for stroke rendering

## Files to Modify

| File | Change |
|------|--------|
| `editor/panels/Toolbar.ts` | Add 'Paint' tool button, paint settings panel |
| `editor/EditorBridge.ts` | Paint state, mutation methods, serialization |
| `editor/CanvasInteraction.ts` | Pointer event routing for paint tool, shift-click logic |
| `src/systems/level/LevelLoader.ts` | Add `paintStrokes` to LevelData interface |
| `src/constants/DepthConstants.ts` | Add `paintLayer` depth constant |
| `src/scenes/theme/GameSceneRenderer.ts` | Render paint strokes in-game |

## Integration Points

- **Mutation system**: All paint operations go through `_applyMutation()` for undo/redo
- **Drag batching**: Freehand strokes use `beginDragMutation()` / `endDragMutation()`
- **Save flow**: Paint strokes included in `getCurrentLevelData()` serialization
- **Existing undo/redo**: Cmd+Z already wired in CanvasInteraction — paint strokes are part of levelData snapshots

## Open Questions

1. Should brush size be in world pixels (fixed regardless of zoom) or screen pixels (scales with zoom)?
2. Maximum number of strokes per level for performance?
3. Should there be an eraser tool or just undo?
4. Layer ordering — should paint render above or below entity shadows?
