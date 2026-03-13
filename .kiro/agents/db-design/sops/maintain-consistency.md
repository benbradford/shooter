# SOP: Maintain Document Consistency

## Purpose

Ensure all specification documents (requirements, design, scrutiny, tasks) remain consistent when any one of them changes.

## The Problem

Specification documents are interdependent:
- **requirements.md** defines WHAT
- **design.md** defines HOW
- **scrutiny.md** identifies GAPS
- **tasks.md** breaks down WORK

**If one changes, the others are now incomplete or inconsistent.**

## When to Use

**ALWAYS use this SOP when:**
- Adding/removing tasks
- Changing task approach
- Adding prerequisite refactors
- Reordering phases
- Splitting/merging tasks
- Changing scope

**Even if the change seems small.**

## Process

### Step 1: Identify the Change

**What changed?**
- New tasks added (e.g., Phase 0 refactors)
- Tasks removed (scope reduction)
- Task approach changed (different implementation)
- Tasks reordered (dependencies changed)

**Document the change:**
- What was added/removed/modified?
- Why was it changed?
- What's the impact?

---

### Step 2: Update requirements.md

**For each new task, add:**
- Component/system requirement
- API definition
- Acceptance criteria
- Files to create/modify

**For each removed task, remove:**
- Corresponding requirement
- API definition
- Files list

**For changed tasks, update:**
- API if it changed
- Acceptance criteria if behavior changed
- Files list if different files affected

**Verification:**
- [ ] All tasks have corresponding requirements
- [ ] No orphaned requirements (task was removed)
- [ ] APIs match task implementation
- [ ] Files lists are accurate

---

### Step 3: Update design.md

**For each new task, add:**
- Component design section
- Implementation approach
- Code examples
- Integration points
- Data flow

**For each removed task, remove:**
- Corresponding design section
- References in other sections

**For changed tasks, update:**
- Implementation approach
- Code examples
- Integration points

**Special attention:**
- Update architecture diagrams
- Update data flow if changed
- Update component interactions

**Verification:**
- [ ] All tasks have design sections
- [ ] No orphaned design sections
- [ ] Architecture diagrams accurate
- [ ] Data flow matches tasks

---

### Step 4: Update scrutiny.md

**For each new task, add:**
- Questions about edge cases
- Questions about integration
- Questions about error handling
- Questions about dependencies

**For each removed task, remove:**
- Corresponding questions
- Questions that no longer apply

**For changed tasks, update:**
- Questions if behavior changed
- Questions if integration changed

**Typical questions per new component:**
- How is it created/destroyed?
- What are error conditions?
- How does it integrate with existing code?
- What are edge cases?
- What happens on failure?

**Verification:**
- [ ] All new components have scrutiny questions
- [ ] No orphaned questions
- [ ] Critical questions identified

---

### Step 5: Verify Consistency

**Cross-check all documents:**

1. **For each task in tasks.md:**
   - [ ] Has requirement in requirements.md
   - [ ] Has design section in design.md
   - [ ] Has scrutiny questions in scrutiny.md

2. **For each requirement in requirements.md:**
   - [ ] Has corresponding task in tasks.md
   - [ ] Has design section in design.md

3. **For each design section in design.md:**
   - [ ] Has corresponding requirement
   - [ ] Has corresponding task

4. **For each scrutiny question:**
   - [ ] Relates to a requirement/design/task
   - [ ] Not orphaned

**Verification:**
- [ ] No orphaned content in any document
- [ ] All tasks covered in all documents
- [ ] Phase numbers consistent across documents
- [ ] Time estimates match

---

### Step 6: Update README.md

**If structure changed significantly:**
- Update reading order
- Update key decisions summary
- Update implementation order
- Update time estimates

**Verification:**
- [ ] README reflects current structure
- [ ] Reading order is correct
- [ ] Time estimates match tasks.md

---

## Common Mistakes

### ❌ Only Updating tasks.md
**Problem:** Other documents now incomplete
**Solution:** Always update all four documents

### ❌ Forgetting to Remove Orphaned Content
**Problem:** Design has sections for removed tasks
**Solution:** Check for orphans in step 5

### ❌ Inconsistent Phase Numbers
**Problem:** Phase 0 in tasks.md, but Phase 1 in requirements.md
**Solution:** Renumber consistently across all documents

### ❌ Not Updating Architecture Diagrams
**Problem:** Diagrams show old structure
**Solution:** Update diagrams when components change

### ❌ Assuming "Close Enough"
**Problem:** Small inconsistencies compound
**Solution:** Be precise - exact consistency required

---

## Checklist

Before considering any change complete:

- [ ] Identified what changed and why
- [ ] Updated requirements.md (added/removed/modified)
- [ ] Updated design.md (added/removed/modified)
- [ ] Updated scrutiny.md (added/removed/modified)
- [ ] Verified consistency across all documents
- [ ] Updated README.md if structure changed
- [ ] No orphaned content in any document
- [ ] Phase numbers consistent
- [ ] Time estimates consistent

---

## Example: Adding Phase 0 Refactors

**Change:** Added 10 tasks for prerequisite refactors

**Required updates:**
1. ✅ tasks.md - Added Phase 0 with 10 tasks
2. ✅ requirements.md - Added Phase 0 section with 6 requirements
3. ✅ design.md - Added Phase 0 design sections
4. ✅ scrutiny.md - Added 20 questions for Phase 0
5. ✅ README.md - Updated implementation order and time estimates

**Result:** All documents consistent, complete specification

---

## Success Criteria

Documents are consistent when:
- ✅ Every task has requirement, design, and scrutiny
- ✅ Every requirement has task and design
- ✅ No orphaned content
- ✅ Phase numbers match
- ✅ Time estimates match
- ✅ Architecture diagrams accurate
- ✅ README reflects current structure
