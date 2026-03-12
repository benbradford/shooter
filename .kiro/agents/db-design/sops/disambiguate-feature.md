# SOP: Disambiguate Feature Request

## Purpose

Extract complete, unambiguous requirements from a rough feature idea through systematic clarifying questions.

## Prerequisites

- User has provided initial feature description
- Context loaded (architecture docs, existing features)

## Steps

### 1. Understand Core Functionality

**Action:** Identify what the feature fundamentally does

**Questions to ask yourself:**
- What is the user trying to achieve?
- What problem does this solve?
- What are the main components/systems involved?

**Verification:** Can summarize feature in 1-2 sentences

---

### 2. Ask Behavior Questions

**Action:** Clarify how the feature behaves

**Question templates:**
- "What happens when {action}?"
- "How should {system} respond to {event}?"
- "Should this work for {entity type} or just {other type}?"
- "What's the expected behavior when {edge case}?"

**Examples:**
- Feature: "Enemies drop loot"
  - "What types of loot? (coins, health, ammo, weapons?)"
  - "Do all enemies drop loot or only some?"
  - "How much loot? Fixed amount or random?"
  - "Does loot despawn? If so, after how long?"

**Verification:** User has answered 5-10 behavior questions

**Common issues:** Stopping too early - keep asking until no ambiguities remain

---

### 3. Ask Integration Questions

**Action:** Understand how feature integrates with existing systems

**Question templates:**
- "How does this interact with {existing system}?"
- "Should this affect {entity type}?"
- "Does this need to persist across level transitions?"
- "Should this be saved in world state?"

**Examples:**
- Feature: "Enemy shields"
  - "Do shields block all damage or just projectiles?"
  - "Can player have shields too?"
  - "Do shields regenerate?"
  - "Should shield state persist when re-entering level?"

**Verification:** All integration points identified

---

### 4. Ask Edge Case Questions

**Action:** Identify unusual scenarios and error conditions

**Question templates:**
- "What if {unusual condition}?"
- "What happens when {resource} runs out?"
- "How should this behave when {conflicting state}?"
- "What if player does {unexpected action}?"

**Examples:**
- Feature: "Crafting system"
  - "What if player tries to craft without materials?"
  - "Can player craft while moving/in combat?"
  - "What if inventory is full?"
  - "Can recipes fail?"

**Verification:** Edge cases documented

---

### 5. Identify Technical Unknowns

**Action:** Flag anything that needs POC or research

**Look for:**
- New libraries/technologies
- Performance concerns
- Browser compatibility issues
- Complex algorithms

**Examples:**
- "Need to research: Can we use Web Workers for pathfinding?"
- "Unknown: Will 1000 particles cause performance issues?"
- "POC needed: Test if Lua can handle async operations"

**Verification:** All unknowns flagged for POC

---

### 6. Document Assumptions

**Action:** Write down any assumptions made

**Format:**
```markdown
## Assumptions
1. Loot despawns after 15 seconds (standard pickup lifetime)
2. Only enemies with difficulty "medium" or "hard" drop loot
3. Loot uses existing pickup system (coins, medipacks)
```

**Verification:** All assumptions explicit

---

### 7. Check for Scope Creep

**Action:** Identify if feature is too large

**Red flags:**
- Requires 5+ new components
- Affects 10+ existing files
- Needs new systems
- Estimate >20 hours

**If too large:**
- Suggest breaking into phases
- Identify MVP (minimum viable product)
- Propose incremental approach

**Verification:** Scope is reasonable or broken into phases

---

## Final Verification

- [ ] 5-10 clarifying questions asked and answered
- [ ] All behavior specified
- [ ] All integration points identified
- [ ] Edge cases documented
- [ ] Technical unknowns flagged
- [ ] Assumptions explicit
- [ ] Scope is reasonable

## Output Format

```markdown
# {Feature} - Disambiguated Requirements

## Core Functionality
Brief description

## Behavior
- Question 1: Answer
- Question 2: Answer
...

## Integration Points
- System X: How it integrates
- System Y: How it integrates

## Edge Cases
- Case 1: How to handle
- Case 2: How to handle

## Technical Unknowns
- Unknown 1: Needs POC
- Unknown 2: Needs research

## Assumptions
1. Assumption 1
2. Assumption 2

## Scope
- MVP: Core features
- Phase 2: Additional features (if applicable)
```

## Common Issues

**Too few questions:**
- Symptom: Spec has ambiguities during implementation
- Solution: Ask more questions upfront, aim for 10+ minimum

**Accepting vague answers:**
- Symptom: User says "whatever makes sense"
- Solution: Provide 2-3 specific options, force user to choose

**Missing edge cases:**
- Symptom: Bugs discovered during implementation
- Solution: Systematically think through unusual scenarios

**Scope creep:**
- Symptom: Feature keeps growing during design
- Solution: Define MVP clearly, move extras to Phase 2
