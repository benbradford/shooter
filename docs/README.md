# Documentation Index

Quick reference for navigating the Dodging Bullets documentation.

## Documentation Principles

### Keep Docs Lean

**Document only what isn't easily found in code:**
- Design decisions and rationale (WHY, not WHAT)
- Common pitfalls and their solutions
- Non-obvious behavior and edge cases
- Critical constraints not obvious from code
- Best practices and patterns

**Don't document:**
- Code structure (use code search tools)
- API signatures (read the actual interfaces)
- JSON formats (read actual level files)
- Step-by-step code tutorials (obvious from reading code)
- Large code examples (use code search to find patterns)

### When Updating Documentation

1. **Remove before adding** - Check if existing info can be condensed
2. **No code examples** - Unless showing a non-obvious pattern
3. **No JSON examples** - Unless showing a unique structure
4. **Focus on gotchas** - What would trip someone up?
5. **One source of truth** - Don't duplicate information across docs
6. **Ask for clarification** - Request details when requirements are unclear or when there's conflicting information between docs and code

### Auditing Documentation

**Run the audit script:**
```bash
./scripts/audit-docs.sh
```

This checks:
- Total line count (target: <7,000 lines)
- Largest files (candidates for condensation)
- Files with most code blocks (potential bloat)
- Files with JSON examples (often redundant)
- Stale references to deleted features

**When asked to "audit the docs":**
1. Run the audit script
2. Review files >300 lines for condensation opportunities
3. Check code blocks - keep only non-obvious patterns
4. Check JSON examples - remove if they duplicate level files
5. Look for stale information (references to deleted features)
6. Suggest consolidation opportunities
7. **Don't automatically change** - present findings and wait for approval

**Current status:** 6,265 lines (under 7,000 target) after March 2026 condensation

When asked to "update the docs":
1. Update existing sections to reflect code changes
2. Remove obsolete information about deleted features
3. Add new information for new features
4. Keep docs accurate and minimal
5. Update multiple doc files as needed
6. **Update `.agents/summary` to keep it in sync with doc changes**
7. **Ask clarifying questions if there's conflicting information or unclear behavior**

## 🎯 Designing New Features

**Before implementing a new feature**, follow the structured design process:

**[Feature Design Process](./feature-design-process.md)** - SOP for going from idea to implementation-ready design
- Phase 1: Initial capture and clarifying questions
- Phase 2: Technical POC for risky/unknown tech
- Phase 3: Requirements document (WHAT)
- Phase 4: Design document (HOW)
- Phase 5: Runtime analysis (execution flow verification) ⭐ NEW
- Phase 6: Failure analysis (edge cases and stress tests) ⭐ NEW
- Phase 7: Scrutiny and clarification (find ALL gaps)
- Phase 8: Task breakdown with estimates
- Phase 9: Implementation clarifications (quick reference)
- Phase 10: README for future sessions

**[Runtime Analysis](./runtime-analysis.md)** - SOP for verifying execution correctness ⭐ NEW
- Mechanical execution traces
- Lifecycle ownership tables
- Temporal coupling detection
- Async boundary analysis
- Race condition detection

**[Failure Analysis](./failure-analysis.md)** - SOP for stress-testing designs ⭐ NEW
- Edge case simulation
- Timing attacks
- Resource stress tests
- Invalid state testing
- Failure recovery paths

**Time investment**: 1-3 hours of design saves 10-20 hours of implementation confusion.

**Example**: `features/interactions/` - Complete implementation in 3 hours (vs 26-34 hour estimate) thanks to thorough design.

## 🚨 Start Here

1. **[Coding Standards](./coding-standards.md)** - MANDATORY reading
   - Build/lint workflow (run after EVERY change)
   - Modern JavaScript standards
   - Component design principles
   - No redundant comments rule
   - ESLint rules explained

2. **[Quick Reference](./quick-reference.md)** - Common tasks and patterns
   - Project structure overview
   - Adding assets, entities, components
   - Debug controls
   - Troubleshooting guide

## Core Architecture

3. **[ECS Architecture](./ecs-architecture.md)** - Entity-Component system
   - Component design principles (single responsibility, props pattern, no defaults)
   - Entity lifecycle and update order
   - EntityManager usage
   - Creating new entities and components

4. **[Grid and Collision](./grid-and-collision.md)** - Grid system and movement
   - Layer-based collision system
   - Multi-level environments
   - Transition cells (staircases)
   - Scene setup and camera

5. **[Pathfinding](./pathfinding.md)** - A* pathfinding system
   - Navigating around walls
   - Layer-aware pathfinding
   - Transition cell usage
   - Performance and best practices

6. **[Collision System](./collision-system.md)** - Entity-to-entity collision
   - CollisionComponent and tags
   - AABB collision detection
   - Separation from grid collision
   - Debug visualization (C key)

7. **[Event System](./event-system.md)** - Event-driven gameplay
   - EventManagerSystem and EventListener
   - BaseEventComponent for automatic cleanup
   - Triggers and event flow
   - One-shot vs repeating triggers

8. **[World State System](./world-state-system.md)** - Save/load game progress
   - Persistent entity destruction
   - Event-spawned entity tracking
   - Cell modification persistence
   - Player health and overheal
   - Press Y to save state

## Input and Controls

9. **[Input Systems](./input-systems.md)** - Player controls
   - Touch joystick (movement)
   - Crosshair button (firing)
   - Keyboard controls
   - Momentum-based movement

10. **[Screen Scaling and HUD](./screen-scaling-and-hud.md)** - Critical quirks
   - Screen scaling, coordinate systems
   - HUD positioning
   - Android compatibility

## Testing

11. **[Testing](./testing.md)** - Automated browser testing
   - Running tests with Puppeteer
   - RemoteInputComponent for test control
   - Writing new tests
   - Test principles (don't confound tests)
   - Getting feedback from game state

## Level Design

12. **[Level Editor](./level-editor.md)** - In-game level editor
   - Level data structure and loading
   - Editor modes (default, grid, move, resize, add entity, edit entity)
   - Saving workflow
   - State machine architecture
   - Common issues and solutions

11. **[Entity Creation System](./entity-creation-system.md)** - Unified entity system
   - Entity IDs and types
   - Event-driven spawning
   - EventChainers for sequential spawning
   - Triggers and exits
   - Editor integration

## Adding Content

12. **[Adding Enemies](./adding-enemies.md)** - Complete enemy implementation guide
   - Asset preparation
   - Component creation
   - State machine setup
   - Level integration

13. **[Updating Enemy Spritesheets](./updating-enemy-spritesheets.md)** - SOP for spritesheet updates
   - Lessons learned from thrower update
   - Step-by-step verification process
   - Direction mapping and animation creation
   - Common pitfalls and solutions
   - Future automation opportunities

14. **[Spawner Entities](./spawner-entities.md)** - Creating entities that spawn other entities
   - Spawner component design
   - Spawned entity movement (GridPositionComponent critical)
   - Difficulty system
   - Editor integration
   - Common pitfalls and solutions

15. **[Visual Effects](./visual-effects.md)** - Hit flashes, particles, shadows
    - HitFlashComponent usage
    - Particle system patterns
    - Shadow component
    - Rotating projectiles
    - Combining effects

## Implemented Enemies

- **Stalking Robot**: Patrols waypoints, detects player, shoots fireballs
- **Bug Base**: Spawns bugs that chase the player
- **Thrower**: Runs toward player, throws grenades in arc
- **Skeleton**: Pathfinds to player, stops periodically, throws rotating bone projectiles
- **Puma**: Rests until player detected (FOV or proximity), stands up, threatens, chases with momentum, jumps at player (2× distance), recovers with deceleration

## Key Concepts

### Entity-Component System (ECS)
- **Entity**: Container with ID that holds components
- **Component**: Reusable logic/data modules
- **EntityManager**: Centralized entity lifecycle management
- **Update Order**: Components update in specified order per entity

### Props Pattern
- All configurable values passed as props (no defaults in component constructors)
- Makes components reusable across entity types
- Self-documenting at call sites

### Collision Types
1. **Grid Collision** (GridCollisionComponent): Entity vs walls/layers
2. **Entity Collision** (CollisionComponent + CollisionSystem): Entity vs entity

### State Machines
- Used for player states (idle, walk)
- Used for enemy AI (patrol, alert, stalking, attack, hit, death)
- Used for editor modes (default, grid, move, resize, edit robot)

### Debug Controls
- **G**: Toggle grid debug (layers, transitions, occupants)
- **C**: Toggle collision boxes (entity and grid collision)
- **E**: Enter level editor

## Development Workflow

```bash
# After EVERY code change (mandatory):
npm run build                # Must pass with zero errors
npx eslint src --ext .ts     # Must pass with zero errors

# Optional (if dev server not running):
npm run dev                  # Start dev server
```

## Common File Locations

- **Entity factories**: `src/{entityType}/{EntityName}Entity.ts`
- **Components**: `src/ecs/components/{ComponentName}Component.ts`
- **State classes**: `src/{entityType}/{EntityName}{StateName}State.ts`
- **Assets**: `public/assets/{category}/`
- **Asset registry**: `src/assets/AssetRegistry.ts`
- **Levels**: `public/levels/{levelName}.json`

## Anti-Patterns to Avoid

❌ Redundant comments (e.g., `// Health` before `new HealthComponent()`)
❌ Default parameter values in component constructors
❌ Useless constructors that only call `super()`
❌ Lonely if statements in else blocks (use `else if`)
❌ Magic numbers (always use named constants)
❌ Hardcoded behavior in components (use callbacks)
❌ Long parameter lists (use props objects)

## When to Update Docs

- New component type → Update ECS Architecture
- New entity type → Update Adding Enemies (if enemy) or Quick Reference
- New editor mode → Update Level Editor
- New debug control → Update Quick Reference
- New coding rule → Update Coding Standards
- Project structure change → Update Quick Reference
