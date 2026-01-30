# Dodging Bullets Skills

This directory contains Agent Skills for specialized development tasks.

## Available Skills

### component-builder/
Expert in creating and refactoring ECS components. Use when:
- Creating new components
- Refactoring existing components
- Questions about component design patterns
- Component organization and structure

## Using Skills

Skills are automatically discovered by kiro-cli agents. When you spawn a sub-agent for a specific task, it will load the relevant skill based on the task description.

### Example: Creating a New Component

```bash
# Main agent spawns Component Builder sub-agent
kiro-cli chat --agent dodging-bullets

# In chat:
"Create a new DashComponent that allows entities to dash in a direction"

# Main agent will spawn a sub-agent with component-builder skill
```

## Skill Structure

Each skill directory contains:
- `SKILL.md` - Core instructions and patterns
- Additional reference files (optional)
- Scripts (optional)

## Adding New Skills

1. Create directory: `skills/skill-name/`
2. Create `SKILL.md` with YAML frontmatter:
   ```yaml
   ---
   name: Skill Name
   description: What this skill does
   ---
   ```
3. Add skill content below frontmatter
4. Update this README

## Planned Skills

- [ ] entity-factory - Creating entity types
- [ ] level-editor - Editor features and level system
- [ ] enemy-ai - Enemy behaviors and state machines
- [ ] visual-effects - Particles, animations, effects
- [ ] build-lint - Code quality enforcement
