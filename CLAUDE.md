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

## Project Structure

```
src/
├── ecs/
│   ├── components/{category}/   # Core, movement, combat, AI, visual, UI, input, etc.
│   ├── entities/{type}/         # Entity factories (robot, skeleton, puma, etc.)
│   └── systems/                 # Collision, movement, etc.
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
- **Component:** Data + behavior, implements `Component` interface with `init()` and `onDestroy()`
- **EntityManager:** Centralized lifecycle management
- All components use **props objects** for configuration (no defaults in constructors)

### Grid System
- Fixed 64x64 pixel cells
- Layer-based collision: FLOOR (0), WALL (1), ENTITY (2)
- A* pathfinding (layer-aware)
- Grid dimensions: 30x30 to 40x30

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

## Dual Development System

This project supports both **Kiro** and **Claude Code** for AI-assisted development:
- Kiro sessions: `kiro-cli chat --agent dodging-bullets` (orchestrator with sub-agents)
- Claude Code sessions: `claude` (picks up context from this file)
- Both managed via the VS Code extension (DB Sessions sidebar)
- Session type shown by icon in the sidebar

## SOPs (read on demand)

When the user's request matches a trigger phrase below, read the named SOP file
and follow it. Do not respond from memory — the SOP files contain the
authoritative procedure.

### ChatGPT image prompts

Triggers: "help me create a chatgpt prompt to draw …", "give me a chatgpt
prompt for …", "chatgpt prompt for an image of …", "what should i tell chatgpt
to draw …", "image prompt for …", "tell chatgpt how to draw …".

→ Read `agent-sops/creating-chatgpt-image-prompts.md` and follow the SOP.
