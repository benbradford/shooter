#!/bin/bash

VERBOSE=false
if [ "$1" == "-v" ] || [ "$1" == "--verbose" ]; then
  VERBOSE=true
fi

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
  "test/tests/test-player-movement.js"
  "test/tests/test-shooting.js"
  "test/tests/test-wall-collision.js"
)

PASSED=0
FAILED=0
FAILED_TESTS=()

for test in "${TESTS[@]}"; do
  echo "Running $test..."
  echo ""
  
  OUTPUT=$(node "$test" 2>&1)
  
  if [ "$VERBOSE" = true ]; then
    echo "$OUTPUT"
  else
    echo "$OUTPUT" | sed -n '/\[GWT-START\]/,/\[GWT-END\]/p' | grep -v '\[GWT-'
    echo ""
    echo "$OUTPUT" | grep "TEST PASSED\|TEST FAILED"
  fi
  
  if echo "$OUTPUT" | grep -q "✓ TEST PASSED"; then
    ((PASSED++))
  else
    ((FAILED++))
    FAILED_TESTS+=("$test")
  fi
  
  echo ""
  echo "--------------------------------------"
  echo ""
done

echo "TESTS RUN: ${#TESTS[@]}"
echo "TESTS PASSED: $PASSED"
echo "TESTS FAILED: $FAILED"
echo ""

if [ $FAILED -gt 0 ]; then
  echo "FAILED TESTS:"
  for test in "${FAILED_TESTS[@]}"; do
    echo "  - $test"
  done
  echo ""
else
  echo "ALL TESTS PASSED!"
  echo ""
fi

echo "Killing dev server (PID: $SERVER_PID)..."
kill $SERVER_PID

if [ $FAILED -gt 0 ]; then
  exit 1
else
  exit 0
fi
