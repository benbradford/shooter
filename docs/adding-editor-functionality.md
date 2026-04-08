# Adding Editor Functionality

Guide for adding new editor modes based on lessons learned from implementing the Trigger system.

## ⚠️ CRITICAL: Always Update extractEntities() ⚠️

When adding ANY new field to entity data that can be edited, you MUST also update `EditorBridge.extractEntities()` to preserve the field when logging. This is the most commonly forgotten step.

**Checklist:**
- [ ] Update level data type (LevelEntity, LevelData, etc.)
- [ ] Update editor state to modify the field
- [ ] **Update EditorBridge.extractEntities()** ← Most commonly forgotten!
- [ ] Test: Edit field → Click Log → Verify field in JSON

## Architecture

The editor uses a split architecture:
- `editor/EditorBridge.ts` — Singleton connecting HTML UI ↔ Phaser. All edits go through `_applyMutation()`.
- `editor/CanvasInteraction.ts` — Handles Phaser input events, WASD camera, zoom, tool routing
- `editor/panels/` — HTML panel classes (Toolbar, ContextPanel, TexturePicker, Toast, PanelController)

## Critical Patterns

### Check UI Clicks Before Grid Clicks

Always check `hitTestPointer()` with depth check before processing grid selection. Without this, clicking buttons also selects grid cells behind them.

### Prevent Input Event Propagation

Call `e.stopPropagation()` on input `keydown` events to prevent WASD from moving camera while typing.

### Track Visual Elements for Cleanup

Store visual elements in a Map, destroy on deselect, clear all in `onExit()`. Without tracking, deselected items keep visual indicators and memory leaks occur.

### Modify GameScene Level Data Directly

Always modify `gameScene.getLevelData()` — not `getCurrentLevelData()` which creates a temporary copy.

### Register and Unregister Event Listeners

Always clean up in `onExit()`. Use arrow functions for event handlers to maintain `this` context.

## Step-by-Step: Adding New Editor Mode

1. Create `EditorState` class with `onEnter()`, `onExit()`, UI creation
2. Add tool handling in `editor/CanvasInteraction.ts`
3. Add button to DefaultEditorState
4. Update LevelData type in LevelLoader.ts
5. Update `EditorBridge.extractEntities()` to preserve data
6. Add loading in GameScene

## Testing Checklist

- [ ] Button clicks don't select grid cells
- [ ] Typing in inputs doesn't move camera
- [ ] Items appear in logged JSON
- [ ] Items load correctly on refresh
- [ ] Event listeners cleaned up on exit
- [ ] Visual elements destroyed on exit
- [ ] No console errors when switching modes
