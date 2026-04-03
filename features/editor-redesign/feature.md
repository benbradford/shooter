# Feature: Standalone Level Editor App

## Summary

Replace the current in-game editor overlay (press E) with a completely separate standalone editor application. The editor runs as its own page/app with a split layout: the Phaser game rendering on the left, and all editor controls as native HTML/CSS UI on the right.

## Current State

- Editor is an overlay scene (EditorScene) launched on top of GameScene by pressing E
- All UI is drawn using Phaser game objects (text buttons, rectangles) on top of the game canvas
- Editor has multiple states: DefaultEditorState, GridEditorState, MoveEditorState, ResizeEditorState, TriggerEditorState, CellModifierEditorState, AddEntityEditorState, TextureEditorState, ThemeEditorState, PortalEditorState, EventChainerEditorState
- Keyboard input conflicts (typing in Phaser text inputs triggers game controls)
- Limited UI capabilities (no proper form controls, no scrollable lists)
- Level switching requires URL parameter change and page reload

## Desired State

### Layout
- Separate page at `/editor/` (Vite multi-page app)
- Left panel: Phaser canvas showing the level (rendering only, no gameplay)
- Right panel: Native HTML/CSS controls for all editing tools
- Level selector dropdown/menu to switch between levels without reload

### Left Panel (Phaser Canvas)
- Renders the level using existing theme renderers (GameSceneRenderer)
- Shows grid, textures, entities as sprites
- Handles mouse clicks for cell/entity selection
- WASD for camera panning
- No game logic (no AI, no player movement, no combat, no HUD)
- Grid debug visualization always on or toggleable

### Right Panel (HTML UI)
- Level selector (dropdown or list of all levels)
- Tool palette: Wall, Floor, Water, Platform, Stairs, Bridge, Blocked
- Entity palette: All entity types (skeleton, thrower, robot, etc.)
- Properties panel: Shows details of selected cell or entity with proper form inputs
- Texture browser: Grid of available textures with thumbnails
- Theme selector
- Trigger/Exit/EventChainer/CellModifier editors with proper form controls
- Save button (writes to disk via dev server endpoint)
- Resize controls
- Undo/redo (stretch goal)

### Communication
- EditorBridge singleton connects HTML UI ↔ Phaser scene
- HTML buttons call bridge methods → Phaser scene responds
- Phaser click events → bridge callbacks → HTML panel updates

## Technical Approach

- Vite multi-page app: `editor/index.html` as separate entry point
- Phaser `parent` config points to left panel div
- EditorGameScene: simplified scene that renders but doesn't run gameplay
- Reuse: Grid, GameSceneRenderer, theme renderers, LevelLoader, AssetRegistry
- Replace: EditorScene, all *EditorState files → HTML UI + EditorBridge
- Existing `/api/save-level` and new `/api/levels` endpoints for file I/O

## Key Constraints

- Must support all current editor functionality (cell editing, entity placement, triggers, exits, eventchainers, cellmodifiers, textures, themes, resize)
- Must work with existing level JSON format (no migration needed)
- Dev-only feature (doesn't need to work in production builds)
- Should not break the existing game (game still works at `/`)
