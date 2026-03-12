# Specialized Agents System - Implementation Guide

## For New Kiro Sessions

### Quick Start

Say: "Implement the specialized agents system from features/agents/"

### What's Already Done

- [x] Requirements documented
- [x] Design documented
- [x] Tasks broken down
- [ ] Asset management agent created
- [ ] SOPs written
- [ ] Main agent delegation logic updated
- [ ] Pilot testing complete

### Key Documents (Read in Order)

1. **README.md** (this file) - Start here
2. **requirements.md** - What the system does
3. **design.md** - How it works
4. **tasks.md** - Step-by-step implementation

### Critical Design Decisions

1. **Implicit delegation** - Main agent auto-delegates based on keywords
2. **Hybrid SOP detail** - Detailed for error-prone steps, high-level for obvious ones
3. **Agent asks questions** - If stuck, specialized agent asks user directly
4. **Sequential execution** - No parallel agents (for now)
5. **Session memory** - Agents remember within session, not across sessions
6. **Pilot first** - Start with asset management agent only

### Agent Structure

```
.kiro/agents/
├── dodging-bullets/              # Main orchestrator (existing)
├── db-asset-management/          # Specialized for assets (to create)
│   ├── instructions.md
│   └── sops/
│       ├── update-spritesheet.md
│       └── optimize-assets.md
├── db-enemy-implementation/      # Future
└── db-testing/                   # Future
```

### Delegation Flow

```
User: "Update thrower spritesheet"
  ↓
Main Agent: Recognizes "update" + "spritesheet"
  ↓
Main Agent: Delegates to db-asset-management
  ↓
Asset Agent: Loads minimal context (~450 lines)
  ↓
Asset Agent: Follows update-spritesheet SOP
  ↓
Asset Agent: Reports results
  ↓
Main Agent: Summarizes for user
```

### Example SOP Structure

```markdown
# SOP: Update Enemy Spritesheet

## Steps

### 1. Verify Frame Dimensions
**Action:** Check frame size matches AssetRegistry
**Verification:** Dimensions match
**Common issues:** Mismatch causes incorrect slicing

### 2. Generate Sprite Sheet
**Action:** Run generation script
**Verification:** Script completes, file created
**Common issues:** Missing directories

...

## Final Verification
- [ ] Build passes
- [ ] Lint passes
- [ ] Animations play correctly
```

### Success Criteria

- [ ] Asset management agent created
- [ ] 2 SOPs written (update-spritesheet, optimize-assets)
- [ ] Main agent delegation logic updated
- [ ] Pilot test: Update thrower spritesheet successfully
- [ ] Pilot test: Optimize assets successfully
- [ ] SOPs are clear and followable
- [ ] Faster than main agent doing same task

### Estimated Implementation Time

**Pilot (Asset Management Agent):** 3.5 hours
- Agent setup: 50 minutes
- SOPs: 1.5 hours
- Main agent updates: 20 minutes
- Testing and refinement: 1.25 hours

**Future Expansion:** +4 hours (if pilot successful)
- Enemy implementation agent: 2 hours
- Testing agent: 2 hours
