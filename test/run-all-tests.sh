#!/bin/bash

echo "Starting dev server..."
npm run dev > /dev/null 2>&1 &
SERVER_PID=$!

echo "Waiting for server to be ready..."
until curl -s http://localhost:5173 > /dev/null; do
  sleep 0.5
done
echo "Server ready!"
echo ""

TESTS=(
  "test/test-player-movement.js"
  "test/test-shooting.js"
)

PASSED=0
FAILED=0
FAILED_TESTS=()

for test in "${TESTS[@]}"; do
  echo "Running $test..."
  if ./test/run-test.sh "$test" 2>&1 | grep -q "✓ TEST PASSED"; then
    echo "✓ PASSED"
    ((PASSED++))
  else
    echo "✗ FAILED"
    ((FAILED++))
    FAILED_TESTS+=("$test")
  fi
  echo ""
done

echo "========================================"
echo "Test Results: $PASSED passed, $FAILED failed"
echo "========================================"

if [ $FAILED -gt 0 ]; then
  echo "Failed tests:"
  for test in "${FAILED_TESTS[@]}"; do
    echo "  - $test"
  done
fi

echo ""
echo "Killing dev server (PID: $SERVER_PID)..."
kill $SERVER_PID

if [ $FAILED -gt 0 ]; then
  exit 1
else
  exit 0
fi
