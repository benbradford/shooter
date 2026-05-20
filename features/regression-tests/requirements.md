# Regression Test Suite — Requirements

## Problem Statement

The project has been hit by regressions introduced by refactors (e.g., the CachedFlag migration broke punch because `loadFromFile()` didn't notify flag subscribers). The existing test suite covers loading/transitions, pets, and basic player movement, but the core gameplay systems — combat, state management, flags, jumping, pushing — have zero automated coverage.

## Goal

Build a regression test suite that can be run after any code change to catch broken gameplay before it ships. Tests should be fast, reliable, and focused on verifiable behavior rather than visual correctness.

## What We Have Today

- **Framework**: Puppeteer integration tests using `RemoteInputComponent` for programmatic input
- **Test helpers**: `punch()`, `punchAndWait()`, `chargeSuperPunch()`, `moveToCellHelper()`, `setPlayerInput()`
- **Existing coverage**:
  - Player movement (8-direction, HUD state)
  - Level transitions and state persistence
  - NPC interactions (1 test)
  - Pet system (follow, abilities, water, teleport)
  - Texture/asset loading
- **Globals exposed in test mode**: `TransformComponent`, `RemoteInputComponent`, `GridPositionComponent`, `ProjectileComponent`, `PetAbilityComponent`, `DogBarkAbility`, `Pathfinder`

## What's Missing (Priority Order)

1. **Combat/Punch system** — the exact bug we just hit. No test verifies that punching works when `canPunch` is set.
2. **World flag system** — flags like `canPunch`, `canPush`, `canJump`, `canSwim` gate core abilities. No test verifies they activate/deactivate correctly.
3. **Push system** — pushing blocks is a core puzzle mechanic. Zero tests.
4. **Jump system** — jumping over gaps/water. Zero tests.
5. **Enemy AI and damage** — no tests verify enemies can damage the player or be killed.
6. **State persistence across transitions** — existing tests check entity persistence but not flag-gated ability persistence.
7. **Water/swim system** — partially tested via pets, but player swimming behavior untested.
8. **Super punch / charge attack** — no tests for hold-to-charge mechanic.
9. **Health and death** — no tests for damage, health regen, death state.
10. **Event system / triggers** — no tests for trigger-based flag changes.

## Constraints

- Tests must be runnable headless via `npm run test:headless`
- Each test file should be self-contained and independently runnable via `npm run test:single`
- Tests should not depend on specific level layouts beyond dedicated test levels
- New test levels should be minimal (small grid, only what's needed)
- Tests must be deterministic — no timing-dependent assertions
- New globals needed for tests should be added to `main.ts` test-mode block

## Success Criteria

- `npm run test:headless` catches the CachedFlag punch regression
- Every flag-gated ability has at least one "works when enabled" and one "blocked when disabled" test
- Core combat loop (punch → damage → enemy death) has end-to-end coverage
- Push and jump mechanics have basic coverage
- Test suite completes in under 60 seconds headless
