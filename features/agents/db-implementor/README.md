# db-implementor Agent Implementation Guide

## For New Kiro Sessions

### Quick Start

Say: "Implement the db-implementor agent from features/agents/db-implementor/"

### What's Already Done

- [x] Requirements documented
- [x] Design documented
- [x] Tasks broken down
- [x] Agent instructions created
- [x] Test templates implemented
- [x] Pattern enforcement implemented
- [x] Browser automation integrated
- [x] Core scripts complete
- [ ] Agent tested on real feature

### Key Documents (Read in Order)

1. **README.md** (this file) - Start here
2. **requirements.md** - What the agent does
3. **design.md** - How it works
4. **tasks.md** - Implementation breakdown

### Critical Design Decisions

1. **Test generation is mandatory** - Every task gets a test, no exceptions
2. **Template-based tests** - Pattern matching selects appropriate template
3. **Dependency-aware testing** - Tests deferred if dependencies not met
4. **Stub generation** - Early tasks get stubs to unblock build
5. **Pattern enforcement** - Automated checks before marking complete
6. **Browser automation** - Puppeteer runs tests and captures screenshots
7. **Regression suite** - Auto-growing per feature
8. **Minimal test levels** - Generated per task, focused scenarios
9. **Integration testing** - Re-run deferred tests after phase complete
10. **Self-correction** - Agent fixes build/lint errors automatically

### Implementation Order

**Phase 1: Agent Configuration** (1 hour)
- Create .agents/db-implementor.yaml
- Define agent instructions
- Test agent invocation

**Phase 2: Core Implementation Loop** (2 hours)
- Task reading from tasks.md
- Code implementation
- Build + lint enforcement
- Task completion marking

**Phase 3: Test Generation** (4 hours)
- Test template library
- Template selection logic
- Test level generation
- Test file creation

**Phase 4: Browser Automation** (2 hours)
- Dev server management
- Puppeteer integration
- Screenshot capture
- Visual verification

**Phase 5: Pattern Enforcement** (3 hours)
- Props pattern checker
- Magic number detector
- Update order validator
- Reporting system

**Phase 6: Regression Suite** (2 hours)
- Suite file generation
- Test aggregation
- Integration testing

**Total: 14 hours**

### Success Criteria

- [ ] Agent can execute single task
- [ ] Agent generates test automatically
- [ ] Agent runs test in browser
- [ ] Agent takes screenshot
- [ ] Agent enforces patterns
- [ ] Agent marks task complete
- [ ] Agent builds regression suite
- [ ] Agent handles dependencies
- [ ] Agent self-corrects errors
- [ ] Build and lint pass

### Example Usage

```
User: "implement task 1.1 from features/npc/tasks.md"

db-implementor:
1. Reads task 1.1
2. Implements code
3. Runs pattern checks
4. Builds + lints
5. Generates test
6. Runs test
7. Takes screenshot
8. Marks complete
9. Reports results

Result: Task complete with test coverage in 15-20 minutes
```

### Files to Create

- `.agents/db-implementor.yaml` - Agent configuration
- `scripts/pattern-checker.js` - Pattern enforcement
- `scripts/test-generator.js` - Test generation
- `scripts/test-templates/` - Template library

### Files to Modify

None (agent is standalone)
