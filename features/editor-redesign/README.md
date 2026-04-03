# Standalone Level Editor — Implementation Guide

## For New Kiro Sessions

### Quick Start

Say: "Implement the standalone editor from features/editor-redesign/"

### What's Already Done

- [x] Feature request documented
- [x] Clarifying questions answered (13 categories, 55+ questions)
- [x] Requirements documented (19 requirements)
- [x] Design documented (architecture, data flow, all components)
- [x] Runtime analysis passed (3 passes, all 10 violations fixed)
- [x] Failure analysis passed (3 passes, all 9 risks mitigated)
- [x] Tasks broken down (10 phases, 23 hours estimated)
- [ ] Implementation

### Key Documents (Read in Order)

1. **README.md** (this file) — Start here
2. **requirements.md** — WHAT the system does (19 requirements with acceptance criteria)
3. **design.md** ⭐ — HOW it works (architecture, data flow, code patterns, all component designs)
4. **runtime-analysis.md** — Execution flow verification (all violations fixed)
5. **failure-analysis.md** — Stress test results (all risks mitigated)
6. **tasks.md** — Implementation breakdown (10 phases)
7. **clarifying-questions.md** — All design decisions with rationale

### Critical Design Decisions

1. **Reuse GameScene with `editorMode` flag** — disable gameplay, keep rendering
2. **EditorBridge singleton** — shared state + single mutation point between HTML and Phaser
3. **Phaser scene owns all level data** — HTML panel reads via bridge, never holds own copy
4. **Vanilla HTML/CSS/JS** — no framework, zero new dependencies
5. **All mutations through `_applyMutation()`** — snapshots state for future undo/redo
6. **Scene restart for level switching** — reuses full GameScene init path, avoids partial-state bugs
7. **Entity placement is in-place** — uses `EntityLoader.createEntityCreator()`, no scene restart
8. **Bridge is the scene indirection layer** — CanvasInteraction never stores direct scene reference
9. **Phaser listeners re-register on each scene restart** — via `onSceneReady` callback
10. **`isLoading` guard** — prevents all operations during scene restart
11. **Outer try/catch in editor create()** — `notifySceneReady()` fires unconditionally
12. **Drag batching** — one snapshot per paint stroke, not per cell
13. **Big bang migration** — build standalone separately, delete old editor when done
14. **Editor excluded from production builds** — not in `build.rollupOptions.input`

### Architecture Overview

```
editor/index.html (70/30 split layout)
├── Left: Phaser Canvas (GameScene in editorMode)
│   └── CanvasInteraction.ts (click/drag/WASD/zoom)
├── Right: HTML Panel
│   ├── Toolbar.ts (level selector, tools, save, play)
│   ├── ContextPanel.ts (cell/entity/level info)
│   ├── TextureBrowser.ts (searchable grid)
│   ├── EntityPalette.ts (entity type picker)
│   └── Toast.ts (notifications)
└── EditorBridge.ts (singleton connecting both sides)
```

### Key Patterns

- **Every edit → `_applyMutation()`** — never modify grid/entities directly
- **HTML reads, bridge mutates** — panels call bridge methods, never touch game state
- **WASD gated by two conditions** — `isMouseOverCanvas && !isHtmlInputFocused()`
- **Drag painting deduplicates per cell** — tracks `lastPaintedCell`
- **Scene accessor via bridge** — always `bridge.getScene()`, never stored reference

### Files to Create

**Editor core:**
- `editor/index.html`, `editor/editor.css`, `editor/main.ts`
- `editor/EditorBridge.ts`, `editor/CanvasInteraction.ts`

**HTML panels:**
- `editor/panels/PanelController.ts`, `editor/panels/Toolbar.ts`
- `editor/panels/ContextPanel.ts`, `editor/panels/LevelInfo.ts`
- `editor/panels/CellForm.ts`, `editor/panels/EntityForm.ts`
- `editor/panels/TextureBrowser.ts`, `editor/panels/EntityPalette.ts`
- `editor/panels/Toast.ts`

### Files to Modify

- `vite.config.ts` — `/api/levels` endpoint, multi-page config
- `src/scenes/GameScene.ts` — `editorMode` flag, skip gameplay, expose accessors

### Files to Delete (After Completion)

- `src/editor/*.ts` (~26 files)
- `src/scenes/EditorScene.ts`
- E-key handler in `src/scenes/GameScene.ts`

### Implementation Order

| Phase | What | Time |
|-------|------|------|
| 1 | Infrastructure (vite, HTML, bridge skeleton, toast) | 2.5h |
| 2 | GameScene editor mode | 1.5h |
| 3 | Canvas interaction (click/drag/WASD) | 1.5h |
| 4 | Core HTML panels (toolbar, context panel, save/load) | 3h |
| 5 | Grid editing (cell paint, textures) | 2h |
| 6 | Entity system (palette, placement, forms) | 3h |
| 7 | Complex editors (triggers, exits, NPC interactions) | 4h |
| 8 | Level management (switching, new level, resize) | 1.5h |
| 9 | Polish (labels, overlays, shortcuts, hover coords) | 2.5h |
| 10 | Cleanup (verify parity, delete old editor) | 1.5h |
| **Total** | | **23h** |

### Success Criteria

- [ ] All current editor functionality works in standalone editor
- [ ] No new dependencies added (vanilla HTML/CSS/JS)
- [ ] Game at `/` completely unaffected
- [ ] Editor excluded from production builds
- [ ] WASD/keyboard conflict resolved (mouse-over-canvas gating)
- [ ] NPC interaction editing is a proper HTML form
- [ ] Texture browser has search/filter
- [ ] Level switching works without page reload
- [ ] Unsaved changes warning prevents data loss
- [ ] Mutation architecture supports future undo/redo
- [ ] Old editor code deleted after verification
- [ ] Build and lint pass with zero errors

### Risk Areas

1. **GameScene editor mode** — disabling gameplay without breaking rendering
2. **Entity in-place creation** — using EntityLoader factory outside normal flow
3. **NPC interaction editor** — most complex UI (nested forms, dynamic lists)
4. **Texture thumbnails** — extracting from Phaser textures to `<img>` elements
5. **Serialization correctness** — lifted code must produce identical JSON
6. **Scene restart lifecycle** — bridge must survive restarts, listeners must re-register

### Verified Safe (Runtime + Failure Analysis)

All these issues were identified and fixed in the design:
- Scene started before bridge created → fixed: bridge created first
- Stale scene references → fixed: always read from `bridge.getScene()`
- Phaser listeners lost on restart → fixed: re-register via `onSceneReady`
- `isLoading` stuck on error → fixed: outer try/catch, unconditional `notifySceneReady()`
- Orphaned drag state → fixed: `window.blur` listener + safety reset in `onPointerDown`
- Save race with level switch → fixed: `isSaving` guard + stale-save check
- Entity placement data loss → fixed: in-place creation, no scene restart
