# Specialized Agents System - Task Breakdown

## ✅ Phase 1: Design Agent (Pilot) - COMPLETE

### Task 1.1: Create Agent Structure ✅
**Location:** `.kiro/agents/db-design/`

**Subtasks:**
- [x] Create directory `.kiro/agents/db-design/`
- [x] Create `instructions.md` with agent definition
- [x] Create `sops/` subdirectory

**Actual Time:** 15 minutes

---

### Task 1.2: Write instructions.md ✅
**File:** `.kiro/agents/db-design/instructions.md`

**Content:**
- [x] Agent purpose: Take feature requests to implementation-ready specs
- [x] Expertise: Architecture, design patterns, ECS, refactoring
- [x] Context files (~1,256 lines)
- [x] Available SOPs
- [x] Delegation triggers
- [x] Key capabilities (asks questions, suggests refactors, not afraid of big changes)

**Actual Time:** 30 minutes

---

### Task 1.3: Create disambiguate-feature SOP ✅
**File:** `.kiro/agents/db-design/sops/disambiguate-feature.md`

**Content:**
- [x] Purpose and prerequisites
- [x] 7 detailed steps with verification
- [x] Question templates
- [x] Output format
- [x] Common issues

**Actual Time:** 45 minutes

---

### Task 1.4: Create create-spec SOP ✅
**File:** `.kiro/agents/db-design/sops/create-spec.md`

**Content:**
- [x] Purpose: Create requirements, design, tasks, README
- [x] Steps for each document
- [x] Templates and guidelines
- [x] Verification checklists
- [x] Common issues

**Actual Time:** 45 minutes

---

### Task 1.5: Create suggest-refactor SOP ✅
**File:** `.kiro/agents/db-design/sops/suggest-refactor.md`

**Content:**
- [x] Purpose: Identify refactor needs
- [x] Steps: Assess fit, identify smells, propose refactor, estimate costs
- [x] Decision criteria
- [x] Output format
- [x] Common issues

**Actual Time:** 30 minutes

---

### Task 1.6: Update Main Agent ✅
**File:** `.kiro/agents/dodging-bullets.md`

**Content:**
- [x] Add delegation section
- [x] List specialized agents (db-design, db-asset-management, db-level-editor)
- [x] Define trigger keywords for design agent
- [x] Explain how to use use_subagent tool

**Actual Time:** 20 minutes

---

### Task 1.7: Test Design Agent
**Test cases:**
1. [ ] "create a design for features/npc/npcs.md"

**Verification:**
- [ ] Agent asks clarifying questions
- [ ] Creates complete spec (requirements, design, tasks)
- [ ] Suggests refactors if needed
- [ ] Spec is implementation-ready

**Estimated Time:** 1 hour

---

### Task 1.8: Refine Based on Results
**Actions:**
- [ ] Update SOPs based on issues
- [ ] Adjust question templates
- [ ] Improve refactor detection
- [ ] Document lessons learned

**Estimated Time:** 30 minutes

---

## Phase 2: Asset Management Agent

### Task 1.1: Create Agent Structure
**Location:** `.kiro/agents/db-design/`

**Subtasks:**
- [ ] Create directory `.kiro/agents/db-design/`
- [ ] Create `instructions.md` with agent definition
- [ ] Create `sops/` subdirectory

**Estimated Time:** 15 minutes

---

### Task 1.2: Write instructions.md
**File:** `.kiro/agents/db-design/instructions.md`

**Content:**
- Agent purpose: Take feature requests to implementation-ready specs
- Expertise: Architecture, design patterns, ECS, refactoring
- Context files (~1,256 lines)
- Available SOPs
- Delegation triggers
- Key capabilities (asks questions, suggests refactors, not afraid of big changes)

**Estimated Time:** 30 minutes

---

### Task 1.3: Create disambiguate-feature SOP
**File:** `.kiro/agents/db-design/sops/disambiguate-feature.md`

**Content:**
- Purpose: Extract complete requirements from rough idea
- Steps:
  1. Identify core functionality
  2. Ask clarifying questions (behavior, edge cases, integration)
  3. Document assumptions
  4. Identify technical unknowns
- Question templates for common scenarios
- When to ask vs when to assume

**Estimated Time:** 45 minutes

---

### Task 1.4: Create create-spec SOP
**File:** `.kiro/agents/db-design/sops/create-spec.md`

**Content:**
- Purpose: Create requirements, design, and task breakdown
- Steps:
  1. Write requirements.md (WHAT)
  2. Write design.md (HOW)
  3. Scrutinize for ambiguities
  4. Write tasks.md (breakdown)
- Templates for each document
- Checklist for completeness

**Estimated Time:** 45 minutes

---

### Task 1.5: Create suggest-refactor SOP
**File:** `.kiro/agents/db-design/sops/suggest-refactor.md`

**Content:**
- Purpose: Identify when feature needs architectural changes
- Steps:
  1. Analyze feature requirements
  2. Check if fits current architecture
  3. Identify code smells if hacked in
  4. Propose refactor approach
  5. Estimate refactor vs hack cost
- Red flags that indicate refactor needed
- How to present refactor suggestions

**Estimated Time:** 30 minutes

---

### Task 1.6: Update Main Agent
**File:** `.kiro/agents/dodging-bullets/instructions.md`

**Content:**
- Add delegation section
- List specialized agents
- Define trigger keywords for design agent
- Explain when to delegate

**Estimated Time:** 20 minutes

---

### Task 1.7: Test Design Agent
**Test cases:**
1. "I want enemies to have shields"
2. "Add a combo system for attacks"
3. "Enemies should drop loot"

**Verification:**
- Agent asks clarifying questions
- Creates complete spec (requirements, design, tasks)
- Suggests refactors if needed
- Spec is implementation-ready

**Estimated Time:** 1 hour

---

### Task 1.8: Refine Based on Results
**Actions:**
- Update SOPs based on issues
- Adjust question templates
- Improve refactor detection
- Document lessons learned

**Estimated Time:** 30 minutes

---

## Phase 2: Asset Management Agent

### Task 2.1: Create Agent Structure
**Location:** `.kiro/agents/db-asset-management/`

**Subtasks:**
- [ ] Create directory
- [ ] Create instructions.md
- [ ] Create sops/ subdirectory

**Estimated Time:** 15 minutes

---

### Task 2.2: Write instructions.md
**File:** `.kiro/agents/db-asset-management/instructions.md`

**Content:**
- Agent purpose and expertise
- Context files (~450 lines)
- Available SOPs
- Delegation triggers

**Estimated Time:** 20 minutes

---

### Task 2.3: Create update-spritesheet SOP
**File:** `.kiro/agents/db-asset-management/sops/update-spritesheet.md`

**Content:**
- Detailed steps with verification
- Common issues and solutions
- Rollback procedure

**Estimated Time:** 45 minutes

---

### Task 2.4: Create optimize-assets SOP
**File:** `.kiro/agents/db-asset-management/sops/optimize-assets.md`

**Content:**
- Run audit, identify large assets
- Resize and update code
- Verify visuals

**Estimated Time:** 30 minutes

---

### Task 2.5: Test Asset Agent
**Test cases:**
1. "Update thrower spritesheet"
2. "Optimize assets over 1MB"

**Verification:**
- Follows SOP correctly
- Produces correct output
- Build/lint pass

**Estimated Time:** 30 minutes

---

## Phase 3: Level Editor Agent

### Task 3.1: Create Agent Structure
**Location:** `.kiro/agents/db-level-editor/`

**Estimated Time:** 15 minutes

---

### Task 3.2: Write instructions.md
**File:** `.kiro/agents/db-level-editor/instructions.md`

**Content:**
- Agent purpose and expertise
- Context files (~891 lines)
- Available SOPs
- Delegation triggers

**Estimated Time:** 20 minutes

---

### Task 3.3: Create add-editor-mode SOP
**File:** `.kiro/agents/db-level-editor/sops/add-editor-mode.md`

**Content:**
- Steps to create new editor state
- UI creation patterns
- Integration with EditorScene
- Common pitfalls (hitTestPointer, extractEntities)

**Estimated Time:** 45 minutes

---

### Task 3.4: Test Editor Agent
**Test case:** "Add editor mode for placing decorations"

**Verification:**
- Creates state class
- Adds button
- Integrates correctly
- Follows patterns

**Estimated Time:** 30 minutes

---

## Total Estimated Time

**Phase 1 (Design Agent - Pilot):** 4 hours
- Agent setup: 45 min
- SOPs: 2 hours
- Main agent updates: 20 min
- Testing: 1 hour
- Refinement: 30 min

**Phase 2 (Asset Management):** 2.5 hours
- Agent setup: 35 min
- SOPs: 1.25 hours
- Testing: 30 min
- Refinement: 20 min

**Phase 3 (Level Editor):** 2 hours
- Agent setup: 35 min
- SOP: 45 min
- Testing: 30 min
- Refinement: 10 min

**Total:** 8.5 hours for 3 agents

## Critical Path

1. Phase 1 must complete before Phase 2 (pilot first)
2. Evaluate pilot success before expanding
3. Phase 2 and 3 can be done in any order

## Success Metrics

**Design Agent success:**
- Creates specs without implementation
- Asks 5-10 clarifying questions per feature
- Suggests refactors when appropriate
- Specs are complete and unambiguous
- User approves specs before implementation

**Overall success:**
- 80%+ of tasks delegated successfully
- Specialized agents faster than main agent
- Consistent quality output
- User satisfaction with delegation


### Task 1.1: Create Agent Structure
**Location:** `.kiro/agents/db-asset-management/`

**Subtasks:**
- [ ] Create directory `.kiro/agents/db-asset-management/`
- [ ] Create `instructions.md` with agent definition
- [ ] Create `sops/` subdirectory
- [ ] Define agent purpose, expertise, context files

**Estimated Time:** 20 minutes

---

### Task 1.2: Write instructions.md
**File:** `.kiro/agents/db-asset-management/instructions.md`

**Content:**
- Agent purpose and expertise
- Context files to load (4-5 docs, ~450 lines total)
- Available SOPs list
- Delegation trigger keywords
- Example invocations

**Estimated Time:** 30 minutes

---

### Task 1.3: Create update-spritesheet SOP
**File:** `.kiro/agents/db-asset-management/sops/update-spritesheet.md`

**Content:**
- Purpose and prerequisites
- Detailed steps with verification:
  1. Verify frame dimensions
  2. Check directory order
  3. Generate sprite sheet
  4. Update animation file
  5. Verify integration
- Final verification checklist
- Common issues and solutions
- Rollback procedure

**Estimated Time:** 45 minutes

---

### Task 1.4: Create optimize-assets SOP
**File:** `.kiro/agents/db-asset-management/sops/optimize-assets.md`

**Content:**
- Purpose: Reduce asset file sizes
- Steps:
  1. Run audit script
  2. Identify large assets
  3. Resize images
  4. Update sprite scales in code
  5. Verify visuals unchanged
- Verification checklist
- Common issues

**Estimated Time:** 30 minutes

---

### Task 1.5: Update Main Agent Delegation Logic
**File:** `.kiro/agents/dodging-bullets/instructions.md`

**Content:**
- Add delegation section
- List specialized agents
- Define trigger keywords
- Explain when to delegate

**Pattern:**
```markdown
## Delegation

When user requests asset-related tasks, delegate to specialized agents:

**Asset Management (db-asset-management):**
- "update {enemy} spritesheet"
- "optimize assets"
- "add texture {name}"
- "align sprites"

Use: `use_subagent` tool with agent_name: "db-asset-management"
```

**Estimated Time:** 20 minutes

---

### Task 1.6: Test Asset Agent
**Test cases:**
1. "Update thrower spritesheet"
2. "Optimize assets over 1MB"
3. "Add new texture for door"

**Verification:**
- Agent loads correct context
- Follows SOP steps
- Produces correct output
- Build and lint pass
- Faster than main agent

**Estimated Time:** 45 minutes

---

### Task 1.7: Refine Based on Results
**Actions:**
- Update SOP based on issues encountered
- Adjust context files if needed
- Improve delegation triggers
- Document lessons learned

**Estimated Time:** 30 minutes

---

## Phase 2: Evaluate Pilot (Decision Point)

### Task 2.1: Assess Pilot Success
**Questions:**
- Did asset agent complete tasks successfully?
- Were SOPs clear enough to follow?
- Was it faster than main agent?
- Did it reduce context overload?
- Would user use it again?

**Decision:** If successful, proceed to Phase 3. If not, refine pilot.

**Estimated Time:** 15 minutes

---

## Phase 3: Expand (If Pilot Successful)

### Task 3.1: Create Enemy Implementation Agent
**Location:** `.kiro/agents/db-enemy-implementation/`

**Subtasks:**
- [ ] Create agent structure
- [ ] Write instructions.md
- [ ] Create add-enemy SOP
- [ ] Test with new enemy
- [ ] Refine

**Estimated Time:** 2 hours

---

### Task 3.2: Create Testing Agent
**Location:** `.kiro/agents/db-testing/`

**Subtasks:**
- [ ] Create agent structure
- [ ] Write instructions.md
- [ ] Create write-test SOP
- [ ] Test with new test
- [ ] Refine

**Estimated Time:** 2 hours

---

## Phase 4: Maintenance

### Task 4.1: SOP Updates
**Trigger:** When code changes affect SOP steps

**Process:**
1. Identify affected SOPs
2. Update steps to match new code
3. Update "Last Updated" date
4. Test SOP still works

**Ongoing:** As needed

---

### Task 4.2: Add New SOPs
**Trigger:** When new repetitive patterns emerge

**Process:**
1. Identify pattern
2. Document as SOP
3. Add to agent's instructions.md
4. Test with real task

**Ongoing:** As needed

---

## Total Estimated Time

**Phase 1 (Pilot):** 3.5 hours
- Agent structure: 20 min
- Instructions: 30 min
- update-spritesheet SOP: 45 min
- optimize-assets SOP: 30 min
- Main agent updates: 20 min
- Testing: 45 min
- Refinement: 30 min

**Phase 2 (Evaluation):** 15 minutes

**Phase 3 (Expansion):** 4 hours (if pilot successful)
- Enemy agent: 2 hours
- Testing agent: 2 hours

**Total:** 3.5 hours for pilot, +4 hours if expanding

## Critical Path

1. Task 1.1-1.4 must be completed in order (agent setup)
2. Task 1.5 can be done in parallel with 1.3-1.4
3. Task 1.6 blocks 1.7 (must test before refining)
4. Phase 2 blocks Phase 3 (evaluate before expanding)

## Risk Areas

- **SOP clarity** - Steps might not be detailed enough
- **Context sufficiency** - Agent might need more context than planned
- **Delegation recognition** - Main agent might not recognize triggers
- **SOP maintenance** - SOPs might go stale as code evolves

## Success Indicators

**Pilot is successful if:**
- Asset agent completes 2/3 test tasks without help
- SOPs are followed correctly
- Output quality matches main agent
- Execution time is faster
- User finds it valuable

**Pilot needs refinement if:**
- Agent asks many clarifying questions
- SOPs are unclear or incomplete
- Output quality is lower
- Not faster than main agent
- User prefers main agent
