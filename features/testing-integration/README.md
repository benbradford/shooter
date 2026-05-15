# Testing Integration - Make Tests Integral to Feature Development

## Problem Statement

We have a solid Puppeteer-based integration test framework (45 test files, 15 test levels, helpers for movement/combat/state) but agents actively avoid using it. Coverage is poor and human-in-the-loop is required for verification that tests could handle.

## Stale Tests (Must Be Removed/Rewritten)

Many existing tests assume the player can shoot (gun/bullets/ammo), which is no longer true — the player now punches. These tests will fail immediately and need to be deleted or rewritten for the current combat system.

**Tests to DELETE (assume shooting/bullets/ammo):**
- `test/tests/player/test-shooting.js` — Aim HUD, firing weapon
- `test/tests/player/test-ammo-system.js` — Ammo depletion, overheat, reload
- `test/tests/player/test-auto-and-manual-aim.js` — Manual aim overriding auto-aim for bullets
- `test/tests/player/test-projectile-collision.js` — Bullet wall collision in 8 directions
- `test/tests/player/test-multi-layer.js` — Bullet layer collision rules

**Tests to REVIEW (may reference shooting helpers but core logic is still valid):**
- `test/tests/player/test-player-movement.js` — Movement + HUD, likely still valid
- `test/tests/player/test-player-transition.js` — Layer transitions, likely still valid
- `test/tests/player/test-wall-collision.js` — Wall blocking, likely still valid

**Helpers to CLEAN UP:**
- `test/interactions/player.js` — Contains `fireWeapon()`, `fireSingleShot()`, `getBulletCount()`, `holdFire()`, `waitForFullAmmo()`, `traceBullet()` — all shooting-related, should be removed
- `test/interactions/hud.js` — Contains `getAimJoystickVisuals()` — aim joystick no longer exists

**Replacement helpers needed:**
- `punch()` — Trigger punch via RemoteInputComponent
- `punchAndWait()` — Punch and wait for animation to complete
- `chargeSuperPunch()` — Hold punch for 1s+ to trigger super punch
- `getAttackButtonState()` — Check attack button icon/state

## Root Causes

### 1. db-implementor had testing explicitly removed

The implementor instructions say:
- "Deferred Test Handling (Removed) — Testing has been removed from the workflow to prevent connection timeouts."
- "Browser Testing (Removed)"
- "Test Generation (Removed)"
- Success criteria: "User should manually test functionality after implementation."

Testing was stripped because subagent calls timed out when running the full dev-server + Puppeteer pipeline.

### 2. Main agent doesn't enforce testing

The dodging-bullets agent's Bug Fix Workflow says "run integration tests" but in practice delegates to db-implementor which skips them. No enforcement point exists.

### 3. No test specification in the design process

`docs/feature-design-process.md` has 12 phases but none produce test specifications. Tests are an afterthought, not a deliverable.

### 4. Massive coverage gaps

**Has tests:** level loading (12), pets (9), player basics (8), NPC (1)

**No tests:** pushables, lasers, levers, escorts, breakables, holes, cellmodifiers, eventchainers, combat/punch, super punch, water/swimming, void jumping, world state persistence, collectibles, red skeletons, pumas

## Files That Need Changes

| File | Change |
|------|--------|
| `.kiro/agents/db-implementor/instructions.md` | Re-enable testing with timeout-safe approach |
| `.kiro/agents/db-implementor/sops/execute-task.md` | Remove contradictions, make test step mandatory |
| `docs/feature-design-process.md` | Add test specification phase |
| `.kiro/agents/dodging-bullets.md` | Add test enforcement to implementation delegation |

## Implementation Plan

### Phase 0: Clean up stale tests

Delete tests that assume shooting (player can no longer shoot — she punches):
- Delete `test/tests/player/test-shooting.js`
- Delete `test/tests/player/test-ammo-system.js`
- Delete `test/tests/player/test-auto-and-manual-aim.js`
- Delete `test/tests/player/test-projectile-collision.js`
- Delete `test/tests/player/test-multi-layer.js`
- Remove shooting helpers from `test/interactions/player.js` (`fireWeapon`, `fireSingleShot`, `getBulletCount`, `holdFire`, `waitForFullAmmo`, `traceBullet`)
- Remove `getAimJoystickVisuals()` from `test/interactions/hud.js`
- Add punch helpers to `test/interactions/player.js`
- Verify remaining tests still pass: `npm run test:headless`

### Phase 1: Re-enable testing in db-implementor

**Problem:** Tests timed out because the agent tried to start a dev server inside the subagent call.

**Fix:** Use `npm run test:headless:single` which manages its own server lifecycle. The test runner (`test/run-single-test.sh`) already handles startup/shutdown cleanly. The agent just needs to call the script and check the exit code.

Key changes to `db-implementor/instructions.md`:
- Remove all "Removed" sections about testing
- Replace with: "Run `npm run test:headless:single {test-name}` — this handles dev server lifecycle automatically"
- Make test pass a hard gate before marking task complete

### Phase 2: Add test specification to design process

Add between Phase 4 (Design) and Phase 5 (Runtime Analysis):

**Phase 4.5: Test Specification**
- For each acceptance criterion in requirements.md, define a test case
- Specify test level requirements (what entities/cells are needed)
- Output: `features/{feature}/test-spec.md`
- Each task in tasks.md references which test verifies it

### Phase 3: Add test creation to task execution

Each task in tasks.md should include:
- `test_file`: path to the test that verifies this task
- `test_level`: path to the test level (if new one needed)

The implementor creates the test BEFORE implementing (TDD-lite):
1. Create test level with required entities
2. Create test file with failing test
3. Implement feature
4. Run test — must pass

### Phase 4: Coverage expansion for existing features

Create tests for untested features, prioritized by:
1. Features that break most often (pushables, world state)
2. Features with complex interactions (lasers + levers, escorts)
3. Simple entity spawning tests (breakables, holes, collectibles)

### Phase 5: CI-like verification

Add to the main agent's verification step:
- After `npm run build`, run `npm run test:headless` for the relevant test category
- If no tests exist for the feature being modified, flag it

## Test Infrastructure (Already Working)

```bash
# Run all tests
npm run test:headless

# Run single test file
npm run test:headless:single test-ammo-system

# Filter by keyword
npm run test:headless:single test-ammo-system "refills"
```

**Test framework:** `test/helpers/test-runner.js` — Puppeteer, launches browser, injects commands, runs GWT-format tests, exits with code 0/1.

**Test helpers:** `test/interactions/player.js` — movement, combat, state management helpers.

**Test levels:** `public/levels/test/` — 15 dedicated test levels.

## Success Criteria

- [ ] db-implementor creates and runs tests for every task
- [ ] Design process produces test specifications
- [ ] Coverage exists for all entity types (at minimum: spawns, has correct tags)
- [ ] Agents can verify their own work without human testing
- [ ] Regressions caught automatically when modifying existing features

## Key Insight

The infrastructure works perfectly. The problem is purely organizational — testing was removed from agent workflows due to timeout issues, and nothing replaced it. The fix is re-enabling with `test:headless:single` (which handles its own server lifecycle) and making test creation a required deliverable.
