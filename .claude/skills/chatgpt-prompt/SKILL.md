---
name: chatgpt-prompt
description: Generate a ChatGPT image prompt for a game asset (prop or terrain tile). Reads the SOP and produces a ready-to-paste prompt.
---

# ChatGPT Prompt Generator

Generate a ready-to-paste ChatGPT image generation prompt for a game asset.

## Usage

The user provides a description of what they want (e.g., `dead tree`, `stone wall tile`, `wooden bridge`).

## Steps

1. Read `agent-sops/creating-chatgpt-image-prompts.md` — this is the authoritative source. Do NOT rely on memory.
2. Determine the asset class:
   - **Prop** (isolated object on transparent background): small prop, structure, or nature
   - **Terrain tile** (edge-to-edge tiling texture): repeating midsection, edge, corner, or transition
3. Fill in the appropriate template from the SOP with subject-specific details.
4. Output the completed prompt in a fenced code block so the user can copy it cleanly.
5. Add 1-2 brief notes about detail choices made, in case they want to adjust.
6. If the asset is known to be tricky (organic, circular, ground-based), include an iteration tip.

## Important

- Always read the SOP fresh — it gets updated with new learnings.
- Do not lecture or include SOP background — just hand them the prompt.
- If the user specifies "no shadows", remove all shadow references and use "flat ambient lighting only".
