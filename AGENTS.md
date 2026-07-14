# Beneath the Roots (Dodging Bullets)

2D top-down action-adventure game built with Phaser 3 + TypeScript. Custom ECS architecture. Solo-dev project.

## Critical Workflow

After EVERY code change:
```bash
npm run build                # TypeScript compilation - MUST pass with zero errors
```

Only run linter when explicitly asked or before committing:
```bash
npx eslint src --ext .ts     # MUST pass with zero errors
```

## Tech Stack

- **Engine:** Phaser 3.90
- **Language:** TypeScript 5.9, Vite 7
- **Architecture:** Custom Entity-Component System (ECS)
- **Testing:** Puppeteer integration tests (`npm run test:single test-{name}`)
- **Platforms:** Web (Netlify), Android (Capacitor), Desktop (Electron)
- **Level Editor:** Browser-based at `/editor/` (standalone HTML + Phaser canvas)

## Fast Startup Context

When starting a new Codex session, load the project with this mental model first:

- **Game shape:** Top-down action-adventure with grid movement, combat, pets, NPC interactions, level transitions, and persistent world state
- **Bootstrap:** `src/main.ts` creates the Phaser game, orders scenes, and exposes internals when `?test=true`
- **Runtime hub:** `src/scenes/GameScene.ts` orchestrates level loading, theme rendering, ECS setup, collision, event management, world-state restore, and scene-level state transitions
- **ECS core:** `src/ecs/Entity.ts` and `src/ecs/EntityManager.ts` define entity lifecycle, updates, destruction, and tag queries
- **Level pipeline:** `src/systems/level/LevelLoader.ts` reads level JSON, `src/systems/EntityLoader.ts` creates runtime entities, and `public/levels/*.json` is the source data
- **Persistence:** `src/systems/WorldStateManager.ts` owns save/load, flags, persistent destruction, and cross-level state
- **Assets:** `src/assets/AssetRegistry.ts` is the source of truth for asset keys/groups and `src/assets/AssetLoader.ts` performs scene loading
- **Editor:** `editor/` is a standalone tool that edits level data and depends on asset keys being registered for editor usage too
- **Tests:** Browser integration tests live in `test/tests/`; `test/run-all-tests.sh` starts Vite and runs them; tests drive the game through Puppeteer plus `RemoteInputComponent`
- **Tracking:** `features/` holds requirements/design/tasks for planned work; `workbench/` holds browser-based trackers for features, bugs, architecture issues, and linter cleanup

### Read Order For Broad Tasks

If a request is broad, ambiguous, or touches multiple systems, read in this order before editing:

1. `AGENTS.md`
2. `docs/coding-standards.md`
3. `src/main.ts`
4. `src/scenes/GameScene.ts`
5. One relevant system file in `src/systems/` or `src/ecs/`
6. One relevant doc from `docs/README.md`
7. Related test file in `test/tests/` if the task is a bug or behavior change

## Project Structure

```
src/
├── ecs/
│   ├── components/{category}/   # Core, movement, combat, AI, visual, UI, input, etc.
│   ├── entities/{type}/         # Entity factories (robot, skeleton, puma, etc.)
│   └── systems/                 # EventManagerSystem, PathFollower
├── scenes/                      # GameScene, LoadingScene, theme renderers
├── systems/                     # Animation, combat, grid, level, state, entity-factories
├── assets/                      # AssetRegistry, AssetLoader
├── trigger/                     # Level triggers
├── exit/                        # Level exit system
└── utils/                       # Shared utilities
editor/                          # Standalone level editor (HTML panels + bridge to Phaser)
public/levels/*.json             # Level data files
features/                        # Feature specs (requirements, design, tasks)
workbench/                       # Browser-based project trackers
test/                            # Puppeteer integration tests
```

## Architecture

### ECS Pattern
- **Entity:** Container with unique ID holding components
- **Component:** Data + behavior, implements `Component` interface with `update()` and `onDestroy()`
- **EntityManager:** Centralized lifecycle management
- All components use **props objects** for configuration (no defaults in constructors)

### Grid System
- Fixed 64x64 pixel cells
- Layer-based collision: numeric elevation (-1, 0, 1, 2+)
- A* pathfinding (layer-aware)
- Grid dimensions: 16x10 to 40x30

### State Machines
- Used for player states (idle, walk, push) and enemy AI (patrol, alert, chase, attack, hit, death)
- Implement `IState` with `onEnter()`, `onExit()`, `update(delta)`

### Event System
- EventManagerSystem + EventListener components
- EventChainers for sequential spawning/scripting
- Triggers for level events

## Coding Standards

- **No magic numbers** — use named constants with units: `_MS`, `_PX`, `_PERCENT`, `_DEGREES`, `_CELLS`
- **No redundant comments** — code should be self-documenting
- **Props-based components** — all configurable values passed as typed props objects
- **No defaults in constructors** — be explicit at call sites
- **Single responsibility** per component
- **No lonely if in else** — use `else if`
- **No useless constructors** that only call `super()`

## Key Patterns

### Creating entities
```typescript
const entity = entityManager.createEntity();
entity.add(new TransformComponent({ x, y }));
entity.add(new SpriteComponent({ scene, texture, frame }));
```

### Component communication
```typescript
const transform = this.entity.get(TransformComponent);
```

### Asset registration
Register in `src/assets/AssetRegistry.ts`, load in `AssetLoader.ts`, reference by key.

### Adding a background texture (4 steps — all required)
1. Add PNG to `public/assets/cell_drawables/`
2. Register in `src/assets/AssetRegistry.ts` (key, path, type: `'image'`)
3. Add key to the `editor` asset group array in `AssetRegistry.ts` (without this, the editor can't show it)
4. Add key to `BACKGROUND_TEXTURE_KEYS` in `editor/panels/TexturePicker.ts`

## Level Themes

dungeon, swamp, grass, wilds, tunnels — each with their own renderer in `src/scenes/theme/`.

## Debug Controls

- **G:** Toggle grid debug (layers, transitions)
- **C:** Toggle collision boxes
- **E:** Open level editor

## Testing

```bash
npm run test:single test-{feature}    # Run one test
npm run test:headless                  # All tests headless
```

Tests use Puppeteer + RemoteInputComponent to drive the game programmatically.

### Bug fix workflow — test first
When fixing bugs, **always write a failing test before changing implementation code**:
1. Write a test that asserts correct behavior (must FAIL against current code)
2. Run it — confirm it fails for the right reason
3. Fix the code
4. Run the test — confirm it passes
5. Run related tests to check for regressions

## Documentation

Detailed docs in `docs/` — see `docs/README.md` for index. Key ones:
- `docs/coding-standards.md` — full rules
- `docs/ecs-architecture.md` — ECS details
- `docs/adding-enemies.md` — enemy implementation guide
- `docs/quick-reference.md` — common patterns

## Feature Specs

Features are designed in `features/{name}/` with:
- `requirements.md` — what to build
- `design.md` — how to build it
- `tasks.md` — implementation breakdown

## Workbench

Browser-based trackers at `http://localhost:5173/workbench/`:
- Architecture issues, features, bugs, linter errors
- Interactive status buttons and agent session spawning

**Feature lifecycle:** When implementing a tracked feature, set its status to `'in-progress'` in `workbench/feature-tracker.html` when starting, and `'done'` when complete. If `features/{name}/tasks.md` exists, mark individual tasks with checkboxes.

## Multi-Tool Development System

This project supports **Kiro**, **Claude Code**, and **Codex** for AI-assisted development:
- Kiro sessions: `kiro-cli chat --agent dodging-bullets` (orchestrator with sub-agents)
- Claude Code sessions: `claude` (picks up context from `CLAUDE.md` in project root)
- Codex sessions: `codex` (picks up context from this `AGENTS.md` file)
- Both Kiro and Claude managed via the VS Code extension (DB Sessions sidebar)
- `scripts/extract-sessions.mjs` reads kiro and claude session histories for doc updates

## SOPs (read on demand)

When the user's request matches a trigger phrase below, read the named SOP file and follow it.

### ChatGPT image prompts

Triggers: "help me create a chatgpt prompt to draw ...", "give me a chatgpt prompt for ...", "chatgpt prompt for an image of ...", "what should i tell chatgpt to draw ...", "image prompt for ...", "tell chatgpt how to draw ...".

Read `agent-sops/creating-chatgpt-image-prompts.md` and follow the SOP.
