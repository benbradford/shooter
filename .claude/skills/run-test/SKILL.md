---
name: run-test
description: Run a Puppeteer integration test by name (headless). Accepts a test name or partial match.
---

# Run Test

Run a specific Puppeteer integration test headless and report the result.

## Usage

The user provides a test name (e.g., `super-punch`, `level-transition`, `health-damage`).

## Steps

1. Find the matching test file under `test/tests/` — match against the filename pattern `test-{name}.js`. If ambiguous, list matches and ask.
2. Run: `HEADLESS=true node {path-to-test-file}`
3. Report pass/fail with any relevant error output. Keep output concise — show the assertion failure, not the full stack.

## Examples

- `/run-test super-punch` → runs `test/tests/combat/test-super-punch.js`
- `/run-test transition` → runs `test/tests/loading/test-level-transition.js`
- `/run-test health` → runs `test/tests/health/test-health-damage.js`
