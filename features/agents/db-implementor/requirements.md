# db-implementor Agent - Requirements

## Overview

Specialized implementation agent that executes tasks from feature specs with automated testing, pattern enforcement, and visual verification.

## Core Value Proposition

**"Every task gets a test, automatically, with zero overhead."**

## Phase 1: Core Task Execution

### 1.1 Task Reading

**Purpose**: Read and parse task from tasks.md

**API**:
```typescript
function readTask(featurePath: string, taskId: string): Task {
  // Returns: { id, name, files, subtasks, dependencies, estimatedTime }
}
```

**Acceptance Criteria**:
- Reads features/{feature}/tasks.md
- Parses task by ID (e.g., "1.1")
- Extracts subtasks, dependencies, files
- Returns structured task object

### 1.2 Design Context Reading

**Purpose**: Read relevant design sections for implementation guidance

**API**:
```typescript
function readDesignContext(featurePath: string, taskName: string): string {
  // Returns relevant sections from design.md
}
```

**Acceptance Criteria**:
- Reads features/{feature}/design.md
- Extracts sections relevant to task
- Returns implementation guidance

### 1.3 Pattern Search

**Purpose**: Find similar patterns in codebase

**API**:
```typescript
function searchPatterns(taskType: string): Pattern[] {
  // Returns: [{ file, code, description }]
}
```

**Acceptance Criteria**:
- Searches for similar components/entities
- Returns code examples
- Identifies patterns to follow

### 1.4 Code Implementation

**Purpose**: Implement task with minimal code

**Behavior**:
- Follow design.md specification
- Use existing patterns
- Minimal code (no verbose implementations)
- No redundant comments

**Acceptance Criteria**:
- Code matches design.md
- Follows existing patterns
- Subtasks completed
- Files created/modified as specified

### 1.5 Build and Lint

**Purpose**: Verify code compiles and passes lint

**Behavior**:
```bash
npm run build && npx eslint src --ext .ts
```

**Self-correction**:
- If build fails: Analyze error, fix, retry
- If lint fails: Run --fix, then manual fixes
- Max 3 attempts before reporting to user

**Acceptance Criteria**:
- Build passes (0 errors)
- Lint passes (0 warnings)
- Self-corrects common issues

## Phase 2: Pattern Enforcement

### 2.1 Props Pattern Check

**Purpose**: Verify components use props pattern

**Checks**:
- Component has props interface
- No default values in constructor
- All props required (except callbacks)

**Acceptance Criteria**:
- Detects violations
- Reports line numbers
- Suggests fixes

### 2.2 Magic Number Detection

**Purpose**: Ensure all numbers are named constants

**Checks**:
- Numeric literals outside const declarations
- Constants have units in name

**Acceptance Criteria**:
- Finds all magic numbers
- Reports line numbers
- Suggests constant names

### 2.3 Update Order Validation

**Purpose**: Verify components are in update order

**Checks**:
- Entity with components has setUpdateOrder()
- All added components are in update order
- Order matches dependencies

**Acceptance Criteria**:
- Detects missing update order
- Detects missing components in order
- Reports violations

### 2.4 Readonly Property Check

**Purpose**: Ensure properties assigned once are readonly

**Checks**:
- Properties assigned in constructor
- Properties never reassigned
- Should be marked readonly

**Acceptance Criteria**:
- Identifies candidates
- Reports line numbers
- Suggests readonly modifier

### 2.5 Pattern Consistency Check

**Purpose**: Verify code follows existing patterns

**Checks**:
- Compare with similar components
- Flag deviations
- Suggest corrections

**Acceptance Criteria**:
- Identifies similar code
- Compares structure
- Reports differences

## Phase 3: Test Generation

### 3.1 Template Library

**Purpose**: Provide test templates for common patterns

**Templates**:
1. Component existence test
2. Range detection test
3. Animation playback test
4. UI state change test
5. Manager query test
6. Entity spawning test

**Acceptance Criteria**:
- Templates cover common task types
- Templates use existing helpers
- Templates follow GWT format

### 3.2 Template Selection

**Purpose**: Select appropriate template based on task type

**Logic**:
```
"Create {X}Component" → Component template
"Add {X} detection" → Range detection template
"Update {X}Component" → UI state template
"Create {X}Manager" → Manager query template
"Add {X} animation" → Animation template
```

**Acceptance Criteria**:
- Detects task type from name
- Selects correct template
- Falls back to generic template

### 3.3 Test Level Generation

**Purpose**: Create minimal test level for task

**Behavior**:
- Analyze task requirements
- Determine needed entities
- Generate minimal level JSON
- Save to public/levels/test/

**Acceptance Criteria**:
- Level contains only needed entities
- Player spawn position set
- Grid size minimal (20x20)
- Naming: test-{feature}-{task}.json

### 3.4 Test File Generation

**Purpose**: Generate test file from template

**Behavior**:
- Fill template with task-specific values
- Add setup code (waitForFullAmmo, etc.)
- Add verification code
- Save to test/tests/{category}/

**Acceptance Criteria**:
- Test file follows template structure
- Uses existing helpers
- GWT format
- Naming: test-{feature}-{aspect}.js

## Phase 4: Browser Automation

### 4.1 Dev Server Management

**Purpose**: Start/stop dev server for testing

**Behavior**:
```bash
npm run dev &
PID=$!
sleep 3  # Wait for server
# Run tests
kill $PID
```

**Acceptance Criteria**:
- Server starts successfully
- Waits for ready state
- Cleans up after tests

### 4.2 Test Execution

**Purpose**: Run test in browser with Puppeteer

**Behavior**:
- Load test level
- Execute test code
- Capture results
- Report pass/fail

**Acceptance Criteria**:
- Test runs without errors
- Results captured
- Pass/fail determined

### 4.3 Screenshot Capture

**Purpose**: Take screenshot for visual verification

**Behavior**:
- After test completes
- Save to test/screenshots/
- Include in report

**Acceptance Criteria**:
- Screenshot saved
- Naming: test-{feature}-{task}.png
- Included in report

### 4.4 Visual Verification

**Purpose**: Verify visual correctness from screenshot

**Behavior**:
- Check entity renders
- Check position correct
- Check animation playing
- Report observations

**Acceptance Criteria**:
- Lists visual checks
- Reports pass/fail per check
- Includes in report

## Phase 5: Regression Suite

### 5.1 Suite File Generation

**Purpose**: Create regression test file per feature

**Behavior**:
- Aggregate all feature tests
- Create single regression file
- Import all test functions
- Run all tests together

**Acceptance Criteria**:
- File: test/regression/test-{feature}-regression.js
- Imports all feature tests
- Runs all in sequence
- Single screenshot

### 5.2 Test Aggregation

**Purpose**: Add each task's test to regression suite

**Behavior**:
- After task complete
- Import test function
- Add to tests array
- Update regression file

**Acceptance Criteria**:
- Test added to suite
- Suite still runs
- No duplicates

### 5.3 Integration Testing

**Purpose**: Re-run deferred tests after dependencies complete

**Behavior**:
- Track deferred tests
- After phase complete, re-run all deferred
- Report results
- Mark as verified

**Acceptance Criteria**:
- Deferred tests tracked
- Re-run automatically
- Results reported
- Integration verified

## Phase 6: Progress Tracking

### 6.1 Task Completion Marking

**Purpose**: Update tasks.md with completion status

**Behavior**:
- Mark subtasks complete: [x]
- Add ✅ to task header
- Add actual time taken
- Update README.md progress

**Acceptance Criteria**:
- tasks.md updated
- README.md updated
- Completion visible

### 6.2 Reporting

**Purpose**: Generate detailed completion report

**Format**:
```
✅ Task X.Y: {Name}

Files Created: [list]
Files Modified: [list]
Pattern Enforcement: [results]
Build & Lint: [results]
Testing: [results]
Visual Verification: [results]
Regression: [results]
Time: {actual} minutes
Next: Task X.Y+1 ready
```

**Acceptance Criteria**:
- Report includes all sections
- Screenshot embedded/linked
- Clear next steps

## Success Criteria

Agent successfully executes task when:
- ✅ Code implemented per design.md
- ✅ Build passes (0 errors)
- ✅ Lint passes (0 warnings)
- ✅ Pattern checks pass
- ✅ Test generated
- ✅ Test runs (pass or deferred)
- ✅ Screenshot captured
- ✅ Added to regression suite
- ✅ Task marked complete
- ✅ Report generated
