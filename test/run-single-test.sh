#!/bin/bash

VERBOSE=false

# Parse flags
while [[ "$1" =~ ^- ]]; do
  case "$1" in
    -v|--verbose)
      VERBOSE=true
      shift
      ;;
    *)
      echo "Unknown flag: $1"
      exit 1
      ;;
  esac
done

if [ -z "$1" ]; then
  echo "Usage: ./test/run-single-test.sh [-v|--verbose] <test-file>"
  echo "Example: ./test/run-single-test.sh test/test-wall-collision.js"
  echo "Example: ./test/run-single-test.sh -v test/test-wall-collision.js"
  exit 1
fi

TEST_FILE="$1"

if [ ! -f "$TEST_FILE" ]; then
  echo "Error: Test file not found: $TEST_FILE"
  exit 1
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

echo "Running $TEST_FILE..."
if [ "$VERBOSE" = true ]; then
  VERBOSE=true node "$TEST_FILE"
else
  node "$TEST_FILE"
fi
TEST_EXIT=$?

echo ""
echo "Killing dev server (PID: $SERVER_PID)..."
kill $SERVER_PID

exit $TEST_EXIT
