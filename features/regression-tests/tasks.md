# Regression Test Suite — Tasks

## Phase 0: Infrastructure (prerequisite for all other tasks)

### Task 0.1: Expose Test Globals
**Files**:
- `src/main.ts`

**Subtasks**:
- [ ] Import `WorldStateManager`, `AttackComboComponent`, `HealthComponent`, `WalkComponent`, `StateMachineComponent`, `CollisionComponent`, `WaterEffectComponent`, `JumpComponent`, `PushableComponent`
- [ ] Add all to `globalThis` in the `test === 'true'` block
- [ ] Verify build passes

**Estimated Time**: 15 minutes

---

### Task 0.2: Create Combat Interaction Helpers
**File**: `test/interactions/combat.js`

**Subtasks**:
- [ ] `getPunchState()` — returns `{ phase, phaseTimer, wasAttackPressed }` from `AttackComboComponent`
- [ ] `isPunching()` — returns boolean (combo state !== 'idle')
- [ ] `getEnemyHealth(entityId)` — find entity by ID, read `HealthComponent`
- [ ] `getEnemyCount()` — count entities with 'enemy' tag
- [ ] `getAllEnemies()` — return array of `{ id, health, x, y }`
- [ ] `waitForPunchComplete(maxMs)` — poll until not punching

**Estimated Time**: 30 minutes

---

### Task 0.3: Create Flags Interaction Helpers
**File**: `test/interactions/flags.js`

**Subtasks**:
- [ ] `setFlag(name, value)` — calls `WorldStateManager.getInstance().setFlag(name, value)`
- [ ] `getFlag(name)` — calls `WorldStateManager.getInstance().getFlag(name)`
- [ ] `isFlagTrue(name)` — calls `WorldStateManager.getInstance().isFlagTrue(name)`
- [ ] `waitForFlagSync(ms)` — wait for CachedFlag subscribers to fire (setTimeout 50ms)

**Estimated Time**: 15 minutes

---

### Task 0.4: Create State Interaction Helpers
**File**: `test/interactions/state.js`

**Subtasks**:
- [ ] `getPlayerState()` — read `StateMachineComponent` current state name
- [ ] `getPlayerHealth()` — read `HealthComponent.getHealth()`
- [ ] `getPlayerMaxHealth()` — read `HealthComponent.maxHealth`
- [ ] `isPlayerDead()` — health <= 0
- [ ] `setPlayerHealth(value)` — set health directly for test setup
- [ ] `isPlayerInWater()` — read `WaterEffectComponent.getIsInWater()`

**Estimated Time**: 20 minutes

---

## Phase 1: Combat Tests (highest priority — directly catches the bug we just fixed)

### Task 1: Basic Punch Test
**Files**:
- `test/tests/combat/test-punch-basic.js`
- `public/levels/test/test-combat.json` (new test level)

**Test Cases**:
- [ ] GIVEN canPunch is true, WHEN player presses attack, THEN punch animation plays (state transitions to punching)
- [ ] GIVEN canPunch is false, WHEN player presses attack, THEN no punch occurs (state stays idle)
- [ ] GIVEN canPunch is true, WHEN player punches, THEN state returns to idle after punch duration (~500ms)
- [ ] GIVEN canPunch starts false then set to true mid-game, WHEN player presses attack, THEN punch works (CachedFlag update test — this catches the exact regression)

**Level Needs**: Small room (10x10), player start, `canPunch: true` in level flags.

**Estimated Time**: 1 hour

---

### Task 2: Punch Damage Test ✓ COMPLETE
**Files**:
- `test/tests/player/test-punch-damage.js`
- `public/levels/test/test-punch-damage.json`

**Test Cases**:
- [x] GIVEN enemy in punch range facing player, WHEN player punches toward enemy, THEN enemy takes damage
- [x] GIVEN enemy out of punch range, WHEN player punches toward enemy, THEN enemy takes no damage
- [x] GIVEN enemy at full health, WHEN player punches enough times, THEN enemy is destroyed

**Level Needs**: Small room, player + 1 stationary enemy (e.g., skeleton with patrol disabled).

**Estimated Time**: 1.5 hours

---

### Task 3: Flag Gating Test
**Files**:
- `test/tests/flags/test-flag-gating.js`

**Test Cases**:
- [ ] GIVEN canPunch is false, WHEN player presses attack, THEN no punch
- [ ] GIVEN canPunch is true, WHEN player presses attack, THEN punch fires
- [ ] GIVEN canPush is false, WHEN player walks into pushable, THEN block doesn't move
- [ ] GIVEN canPush is true, WHEN player walks into pushable, THEN block moves
- [ ] GIVEN canJump is false, WHEN player stands at edge, THEN no jump icon shows
- [ ] GIVEN canJump is true, WHEN player stands at edge, THEN jump icon shows
- [ ] GIVEN canSwim is false, WHEN player walks toward water, THEN player is blocked
- [ ] GIVEN canSwim is true, WHEN player walks into water, THEN player enters water

**Level Needs**: May reuse `test-combat.json` with flags toggled programmatically.

**Estimated Time**: 2 hours

---

### Task 4: Basic Push Test ✓ COMPLETE
**Files**:
- `test/tests/player/test-push.js`
- `public/levels/test/test-push.json`

**Test Cases**:
- [x] GIVEN canPush is true and player faces pushable block, WHEN player holds movement into block and presses attack, THEN block moves one cell in push direction
- [x] GIVEN pushable is against a wall, WHEN player pushes, THEN block does not move
- [x] GIVEN pushEnabled is false, WHEN player walks into pushable, THEN player does not enter push state

**Level Needs**: Small room (10x10), player, 1 pushable block with open space, 1 wall-adjacent block, 1 disabled pushable.

**Estimated Time**: 1.5 hours

---

### Task 5: Super Punch (Charge Attack) Test ✓ COMPLETE
**Files**:
- `test/tests/combat/test-super-punch.js`

**Test Cases**:
- [x] GIVEN hasSuperPunch is true, WHEN player holds attack for >1000ms then releases, THEN super punch fires (greater damage)
- [x] GIVEN hasSuperPunch is false, WHEN player holds attack for >1000ms, THEN normal punch fires (no charge)
- [x] GIVEN player is charging, WHEN attack released before threshold, THEN normal punch completes

**Level Needs**: Reuse `test-combat-enemy.json` with `hasSuperPunch: true` flag.

**Estimated Time**: 1 hour

---

### Task 6: Punch While Moving Test
**Files**:
- `test/tests/combat/test-punch-while-moving.js`

**Test Cases**:
- [x] GIVEN player is walking, WHEN player presses attack, THEN punch fires (walking_punch animation) ✓ COMPLETE
- [x] GIVEN player punches while moving, WHEN punch completes, THEN player resumes walking ✓ COMPLETE

**Level Needs**: Reuse `test-combat.json`.

**Estimated Time**: 45 minutes

---

## Phase 2: State & Persistence Tests

### Task 7: Flag Persistence Across Transitions ✓ COMPLETE
**Files**:
- `test/tests/flags/test-flag-persistence.js`

**Test Cases**:
- [x] GIVEN canPunch is set to true, WHEN player transitions to new level, THEN canPunch is still true
- [x] GIVEN flag is set during gameplay, WHEN game state is saved and reloaded, THEN flag persists
- [x] GIVEN flags are loaded from save, WHEN CachedFlag reads the value, THEN it reflects the saved value (not stale)

**Level Needs**: Reuses `test/test-combat` level (no separate transition levels needed — tests simulate WorldState transition operations directly).

**Estimated Time**: 1.5 hours

---

## Phase 3: Movement Ability Tests

### Task 8: Basic Jump Test ✓ COMPLETE
**Files**:
- `test/tests/player/test-jump.js`
- `public/levels/test/test-jump.json`

**Test Cases**:
- [x] GIVEN canJump is true and player is at a gap edge, WHEN player presses attack (jump icon showing), THEN player lands on other side
- [x] GIVEN canJump is false and player is at a gap edge, WHEN player walks toward edge, THEN player is blocked
- [x] GIVEN player is mid-jump, WHEN jump completes, THEN player cell position matches target

**Level Needs**: Small room with a 1-cell gap (void/hole) player can jump across.

**Estimated Time**: 1.5 hours

---

### Task 9: Water/Swim Test ✓ COMPLETE
**Files**:
- `test/tests/player/test-swim.js`
- `public/levels/test/test-swim.json` (new test level)

**Test Cases**:
- [x] GIVEN canSwim is true, WHEN player enters water cell, THEN `isInWater` is true
- [x] GIVEN canSwim is false, WHEN player walks toward water, THEN player cannot enter
- [x] GIVEN player is swimming, WHEN player presses attack, THEN no punch (punch blocked in water)
- [x] GIVEN player is swimming, WHEN player swims through bridge+water cell, THEN remains swimming
- [x] GIVEN player is swimming at edge, WHEN player swims toward dry land, THEN exits water
- [x] GIVEN player is swimming mid-pool, WHEN swimming between water cells, THEN stays in water
- [x] GIVEN player is on bridge (not swimming), WHEN walking toward water, THEN blocked

**Level Needs**: Small room with water cells on one side.

**Estimated Time**: 1 hour

---

## Phase 4: Health & Damage Tests

### Task 10: Health and Damage Test ✓ COMPLETE
**Files**:
- `test/tests/health/test-health-damage.js`

**Test Cases**:
- [x] GIVEN player at full health, WHEN player takes damage, THEN health decreases
- [x] GIVEN player health is low, WHEN enough damage taken, THEN player enters death state
- [x] GIVEN player health is below max, WHEN time passes, THEN health regenerates (if regen enabled)
- [x] GIVEN player is in death state, WHEN death animation completes, THEN game handles death (no crash)

**Level Needs**: Uses `test-combat` level with programmatic damage via `takeDamage()`.

**Estimated Time**: 1.5 hours

---

## Phase 5: Event System Tests

### Task 11: Trigger and Event Test ✓ COMPLETE
**Files**:
- `test/tests/triggers/test-triggers.js`
- `public/levels/test/test-triggers.json` (new test level)

**Test Cases**:
- [x] GIVEN trigger zone exists at cell (X,Y), WHEN player enters that cell, THEN the trigger's event fires
- [x] GIVEN trigger sets a flag, WHEN player enters trigger, THEN flag value changes
- [x] GIVEN trigger has `once: true`, WHEN player enters trigger twice, THEN event fires only once

**Level Needs**: Small room with trigger zones that set specific flags.

**Estimated Time**: 1.5 hours

---

## Phase 6: Integration / Smoke Tests

### Task 12: Full Gameplay Loop Smoke Test ✓ COMPLETE
**Files**:
- `test/tests/combat/test-gameplay-loop.js`

**Test Cases**:
- [x] GIVEN player starts in test level with enemy, WHEN player moves to enemy and punches it to death, THEN enemy is destroyed and player survives
- [x] GIVEN player in attack range, WHEN player waits for enemy to attack, THEN player takes damage (enemy AI functioning)
- [x] GIVEN player in combat, WHEN rapid alternating movement and attack inputs sent, THEN no crash and state machine recovers

**Level Needs**: `public/levels/test/test-gameplay-loop.json` (medium skeleton)

**Estimated Time**: 1 hour

---

### Task 13: CachedFlag Regression Guard
**Files**:
- `test/tests/flags/test-cached-flag-load.js`

**Test Cases**:
- [ ] GIVEN game loads with saved state containing `canPunch: true`, WHEN game finishes loading, THEN CachedFlag for canPunch reads true
- [ ] GIVEN game loads with saved state containing `canSwim: true`, WHEN player reaches water, THEN player can swim
- [ ] GIVEN WorldStateManager.loadFromFile is called with flags, WHEN flag subscribers are checked, THEN all cached values match the loaded state

**Purpose**: This is the exact regression test for the bug we just fixed. It verifies that `loadFromFile()` properly notifies CachedFlag subscribers.

**Level Needs**: Test level loaded with pre-set flags.

**Estimated Time**: 1 hour

---

## Summary

| Phase | Tasks | Estimated Time | Priority |
|-------|-------|---------------|----------|
| 0 - Infrastructure | 0.1–0.4 | 1.5 hours | Prerequisite |
| 1 - Combat | 1–6 | 6.75 hours | Critical |
| 2 - State | 7 | 1.5 hours | High |
| 3 - Movement | 8–9 | 2.5 hours | High |
| 4 - Health | 10 | 1.5 hours | Medium |
| 5 - Events | 11 | 1.5 hours | Medium |
| 6 - Integration | 12–13 | 2 hours | High |

**Total**: ~17.25 hours across 17 tasks

## Execution Order

Recommended order to maximize regression catching earliest:
1. Task 0.1–0.4 (infrastructure)
2. Task 1 (basic punch — directly catches the CachedFlag bug)
3. Task 13 (CachedFlag regression guard)
4. Task 3 (flag gating — covers all ability flags)
5. Task 2 (punch damage)
6. Task 7 (flag persistence)
7. Task 4 (push)
8. Task 8 (jump)
9. Task 10 (health)
10. Task 5, 6 (super punch, moving punch)
11. Task 9 (water)
12. Task 11 (triggers)
13. Task 12 (smoke test)
