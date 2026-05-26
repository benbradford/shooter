---
name: run-all-tests
description: Run the full Puppeteer integration test suite headless and report a summary of passes and failures.
---

# Run All Tests

Run every Puppeteer integration test headless and report results.

## Steps

1. Run: `HEADLESS=true npm run test 2>&1`
2. Parse the output for pass/fail lines (look for `✓ PASSED` and `✗ FAILED` patterns).
3. Report a concise summary:
   - Total passed / total failed / total tests
   - For failures: show the test name and the assertion error (not the full stack)
4. If ALL tests pass, just say "All X tests passed."
