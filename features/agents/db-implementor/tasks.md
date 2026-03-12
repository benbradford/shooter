# db-implementor Agent - Task Breakdown

## Phase 1: Agent Configuration (1 hour)

### Task 1.1: Create Agent Configuration File
**File**: `.agents/db-implementor.yaml`

**Subtasks**:
- [ ] Create agent config with name, description
- [ ] Reference instruction file
- [ ] Set context files (docs, testing.md)
- [ ] Test agent invocation

**Dependencies**: None
**Estimated Time**: 30 minutes

---

### Task 1.2: Create Agent Instructions
**File**: `.agents/db-implementor-instructions.md`

**Subtasks**:
- [ ] Define core workflow
- [ ] Define commands (implement task, implement phase)
- [ ] Define reporting format
- [ ] Define error handling
- [ ] Define critical rules

**Dependencies**: None
**Estimated Time**: 30 minutes

---

## Phase 2: Core Implementation Loop (2 hours)

### Task 2.1: Task Reading System ✅
**File**: `scripts/task-reader.js`

**Subtasks**:
- [x] Parse tasks.md markdown
- [x] Extract task by ID
- [x] Parse subtasks
- [x] Parse dependencies
- [x] Return structured object

**Dependencies**: None
**Estimated Time**: 45 minutes
**Actual Time**: 20 minutes

---

### Task 2.2: Build and Lint Enforcement
**File**: Agent instructions (behavior)

**Subtasks**:
- [ ] Run npm run build
- [ ] Check exit code
- [ ] If fail: analyze error, fix, retry (max 3)
- [ ] Run npx eslint
- [ ] If fail: run --fix, then manual fixes
- [ ] Report results

**Dependencies**: None
**Estimated Time**: 30 minutes

---

### Task 2.3: Task Completion Marking ✅
**File**: `scripts/mark-task-complete.js`

**Subtasks**:
- [x] Read tasks.md
- [x] Find task by ID
- [x] Mark subtasks [x]
- [x] Add ✅ to header
- [x] Add actual time
- [x] Write back to file

**Dependencies**: Task 2.1
**Estimated Time**: 45 minutes
**Actual Time**: 15 minutes

---

## Phase 3: Test Generation (4 hours)

### Task 3.1: Create Test Template Library ✅
**Files**: `scripts/test-templates/*.js`

**Subtasks**:
- [x] component-existence.template.js
- [x] range-detection.template.js
- [x] animation-playback.template.js
- [x] ui-state-change.template.js
- [x] manager-query.template.js
- [x] entity-spawning.template.js

**Dependencies**: None
**Estimated Time**: 1.5 hours
**Actual Time**: 25 minutes

---

### Task 3.2: Template Selection Logic ✅
**File**: `scripts/test-generator.js`

**Subtasks**:
- [x] Detect task type from name
- [x] Map to template
- [x] Load template
- [x] Return template with metadata

**Dependencies**: Task 3.1
**Estimated Time**: 30 minutes
**Actual Time**: 15 minutes (included in test-generator.js)

---

### Task 3.3: Test Level Generator ✅
**File**: `scripts/test-level-generator.js`

**Subtasks**:
- [x] Analyze task requirements
- [x] Determine needed entities
- [x] Generate minimal level JSON
- [x] Save to public/levels/test/
- [x] Naming: test-{feature}-{task}.json

**Dependencies**: None
**Estimated Time**: 1 hour
**Actual Time**: 10 minutes (included in test-generator.js)

---

### Task 3.4: Test File Generator ✅
**File**: `scripts/test-generator.js` (extend)

**Subtasks**:
- [x] Fill template with task values
- [x] Add setup code
- [x] Add verification code
- [x] Save to test/tests/{category}/
- [x] Naming: test-{feature}-{aspect}.js

**Dependencies**: Task 3.2, Task 3.3
**Estimated Time**: 1 hour
**Actual Time**: 20 minutes (included in test-generator.js)

---

## Phase 4: Browser Automation (2 hours)

### Task 4.1: Dev Server Manager ✅
**File**: `scripts/dev-server-manager.js`

**Subtasks**:
- [x] Start dev server (npm run dev)
- [x] Wait for ready (check port 5173)
- [x] Return PID
- [x] Kill server on cleanup

**Dependencies**: None
**Estimated Time**: 30 minutes
**Actual Time**: 15 minutes

---

### Task 4.2: Test Runner Integration
**File**: Agent instructions (behavior)

**Subtasks**:
- [ ] Start dev server
- [ ] Run generated test
- [ ] Capture results
- [ ] Stop dev server
- [ ] Report pass/fail

**Dependencies**: Task 4.1
**Estimated Time**: 45 minutes

---

### Task 4.3: Screenshot Capture
**File**: Agent instructions (behavior)

**Subtasks**:
- [ ] Take screenshot after test
- [ ] Save to test/screenshots/
- [ ] Naming: test-{feature}-{task}.png
- [ ] Include in report

**Dependencies**: Task 4.2
**Estimated Time**: 15 minutes

---

### Task 4.4: Visual Verification
**File**: Agent instructions (behavior)

**Subtasks**:
- [ ] Analyze screenshot
- [ ] Check entity renders
- [ ] Check position correct
- [ ] Check animation playing
- [ ] Report observations

**Dependencies**: Task 4.3
**Estimated Time**: 30 minutes

---

## Phase 5: Pattern Enforcement (3 hours)

### Task 5.1: Props Pattern Checker ✅
**File**: `scripts/pattern-checker.js`

**Subtasks**:
- [x] Parse TypeScript AST
- [x] Find component classes
- [x] Check for props interface
- [x] Check for default values
- [x] Report violations

**Dependencies**: None
**Estimated Time**: 1 hour
**Actual Time**: 30 minutes

---

### Task 5.2: Magic Number Detector ✅
**File**: `scripts/pattern-checker.js` (extend)

**Subtasks**:
- [x] Parse code for numeric literals
- [x] Exclude const declarations
- [x] Check for unit suffixes
- [x] Report violations with line numbers

**Dependencies**: None
**Estimated Time**: 45 minutes
**Actual Time**: 15 minutes (included in pattern-checker.js)

---

### Task 5.3: Update Order Validator ✅
**File**: `scripts/pattern-checker.js` (extend)

**Subtasks**:
- [x] Find entity.add() calls
- [x] Find setUpdateOrder() call
- [x] Verify all components in order
- [x] Report missing components

**Dependencies**: None
**Estimated Time**: 30 minutes
**Actual Time**: 10 minutes (included in pattern-checker.js)

---

### Task 5.4: Readonly Property Checker ✅
**File**: `scripts/pattern-checker.js` (extend)

**Subtasks**:
- [x] Find property declarations
- [x] Check if assigned once
- [x] Check if marked readonly
- [x] Report candidates

**Dependencies**: None
**Estimated Time**: 45 minutes
**Actual Time**: 10 minutes (included in pattern-checker.js)

---

## Phase 6: Regression Suite (2 hours)

### Task 6.1: Regression File Generator ✅
**File**: `scripts/regression-generator.js`

**Subtasks**:
- [x] Create test/regression/test-{feature}-regression.js
- [x] Import all feature tests
- [x] Aggregate into single runTests() call
- [x] Set screenshot path

**Dependencies**: None
**Estimated Time**: 45 minutes
**Actual Time**: 20 minutes

---

### Task 6.2: Test Aggregation ✅
**File**: `scripts/regression-generator.js` (extend)

**Subtasks**:
- [x] After each task, add test to regression file
- [x] Update imports
- [x] Update tests array
- [x] Verify suite still runs

**Dependencies**: Task 6.1
**Estimated Time**: 30 minutes
**Actual Time**: 15 minutes (included in regression-generator.js)

---

### Task 6.3: Integration Testing
**File**: Agent instructions (behavior)

**Subtasks**:
- [ ] Track deferred tests
- [ ] After phase complete, re-run deferred tests
- [ ] Report results
- [ ] Mark as verified

**Dependencies**: Task 6.2
**Estimated Time**: 45 minutes

---

## Phase 7: Testing and Validation (2 hours)

### Task 7.1: Test on Simple Task
**Subtasks**:
- [ ] Choose simple task (add to EntityType)
- [ ] Run agent workflow
- [ ] Verify all steps execute
- [ ] Verify test generated
- [ ] Verify report format

**Dependencies**: All previous phases
**Estimated Time**: 30 minutes

---

### Task 7.2: Test on Complex Task
**Subtasks**:
- [ ] Choose complex task (create component)
- [ ] Run agent workflow
- [ ] Verify pattern enforcement
- [ ] Verify test passes
- [ ] Verify screenshot captured

**Dependencies**: Task 7.1
**Estimated Time**: 45 minutes

---

### Task 7.3: Test Full Feature
**Subtasks**:
- [ ] Run agent on all NPC tasks
- [ ] Verify all tasks complete
- [ ] Verify regression suite created
- [ ] Verify 100% coverage
- [ ] Measure time savings

**Dependencies**: Task 7.2
**Estimated Time**: 45 minutes

---

## Total Estimated Time

**Phase 1**: 1 hour
**Phase 2**: 2 hours
**Phase 3**: 4 hours
**Phase 4**: 2 hours
**Phase 5**: 3 hours
**Phase 6**: 2 hours
**Phase 7**: 2 hours

**Total**: 16 hours

## Critical Path

1. Phase 1 → Phase 2 (agent must exist before implementing)
2. Phase 2 → Phase 3 (core loop before testing)
3. Phase 3 → Phase 4 (tests before browser automation)
4. Phase 4 → Phase 6 (browser before regression)
5. Phase 5 can be parallel with Phase 3-4
6. Phase 7 requires all previous phases

## Risk Areas

- **AST parsing** - TypeScript parsing for pattern checks may be complex
- **Browser automation** - Puppeteer integration may have edge cases
- **Template coverage** - May not cover all task types
- **Dependency detection** - Complex dependency chains may be hard to detect
- **Visual verification** - Automated visual checks may be unreliable
