#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: npm run test:single <test-name> [test-filter]"
  echo "Example: npm run test:single test-ammo-system"
  echo "Example: npm run test:single test-ammo-system testFireUntilOverheat"
  exit 1
fi

TEST_NAME="$1"
TEST_FILTER="$2"

# Find the test file
TEST_FILE=$(find test/tests -name "*${TEST_NAME}*.js" | head -1)

if [ -z "$TEST_FILE" ]; then
  echo "Error: No test file found matching '$TEST_NAME'"
  exit 1
fi

if [ -n "$TEST_FILTER" ]; then
  ./test/run-single-test.sh "$TEST_FILE" "$TEST_FILTER"
else
  ./test/run-single-test.sh "$TEST_FILE"
fi
