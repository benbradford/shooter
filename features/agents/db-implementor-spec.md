# db-implementor Agent - Feature Spec

## Purpose

Create a specialized implementation agent that executes tasks from feature specs with:
1. Automated test generation (zero overhead)
2. Pattern enforcement (coding standards)
3. Visual verification (browser testing)
4. Regression suite building (automatic coverage)

## Problem Statement

**Current state:**
- Excellent testing infrastructure exists (Puppeteer + helpers)
- Tests are rarely written (high overhead)
- Coverage gaps accumulate
- Visual bugs caught late
- No regression testing

**Root cause:**
- Manual test writing takes 15-30 minutes per task
- Easy to skip under time pressure
- No enforcement mechanism

## Solution

**db-implementor agent that makes testing automatic and enforced.**

For every task:
- Auto-generates test from template
- Runs test in browser
- Takes screenshot
- Verifies visually
- Adds to regression suite
- **Zero overhead for developer**

## Value Proposition

### Time Savings Per Feature
- Manual test writing: 4-8 hours
- Auto-generated: 0 hours
- Debugging savings: 1-3 hours (catch bugs immediately)
- **Total: 5-11 hours saved per feature**

### Quality Improvements
- 100% test coverage (guaranteed)
- Pattern enforcement (automated)
- Visual verification (every task)
- Regression suite (grows automatically)

## Key Features

### 1. Test Template Library
- Component creation template
- Range detection template
- Animation playback template
- UI state change template
- Manager query template

### 2. Test Level Generation
- Minimal focused test scenarios
- Auto-generated per task
- Consistent naming convention

### 3. Browser Automation
- Start dev server
- Run test with Puppeteer
- Take screenshot
- Verify visually
- Stop server

### 4. Pattern Enforcement
- Props pattern check
- Magic number detection
- Redundant comment detection
- Update order validation
- Readonly property check

### 5. Regression Suite
- Auto-growing test coverage
- One regression file per feature
- Run before releases

## Implementation Plan

### Phase 1: Basic Agent (2-3 hours)
- Create agent instructions file
- Implement task reading
- Implement code generation
- Build + lint enforcement
- Task completion marking

### Phase 2: Test Generation (4-6 hours)
- Create test template library
- Implement template selection logic
- Implement test level generation
- Browser automation integration
- Screenshot capture

### Phase 3: Pattern Enforcement (3-4 hours)
- Props pattern checker
- Magic number detector
- Comment analyzer
- Update order validator
- Reporting system

### Phase 4: Regression Suite (2-3 hours)
- Regression file generation
- Test aggregation
- Suite management

**Total: 11-16 hours to build**

## Success Metrics

After implementing one feature with db-implementor:
- ✅ All tasks completed
- ✅ 100% test coverage
- ✅ 0 pattern violations
- ✅ Complete regression suite
- ✅ All screenshots captured
- ✅ 5-11 hours saved

## Next Steps

1. Review this spec
2. Create agent configuration in `.agents/`
3. Implement Phase 1 (basic agent)
4. Test on simple feature
5. Implement Phase 2 (test generation)
6. Test on NPC system
7. Implement Phases 3-4
8. Deploy for all features

## Questions to Resolve

- Should agent execute all tasks in a phase automatically, or one at a time?
- Should agent ask before fixing pattern violations, or fix automatically?
- Should agent create test levels in test/ or public/levels/test/?
- Should regression suite be per-feature or global?
