#!/bin/bash

# Trap Ctrl+C and exit immediately
trap 'echo ""; echo "Test interrupted. Killing dev server..."; kill $SERVER_PID 2>/dev/null; exit 130' INT

VERBOSE=false
TEST_NAME=""

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
  echo "Usage: ./test/run-single-test.sh [-v|--verbose] <test-file> [test-name]"
  echo "Example: ./test/run-single-test.sh test/test-wall-collision.js"
  echo "Example: ./test/run-single-test.sh test/test-wall-collision.js 'Player moves up'"
  echo "Example: ./test/run-single-test.sh -v test/test-wall-collision.js"
  exit 1
fi

TEST_FILE="$1"
TEST_NAME="$2"

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

if [ -n "$TEST_NAME" ]; then
  echo "Running test: $TEST_NAME from $TEST_FILE..."
  if [ "$VERBOSE" = true ]; then
    VERBOSE=true TEST_NAME="$TEST_NAME" node "$TEST_FILE"
  else
    TEST_NAME="$TEST_NAME" node "$TEST_FILE"
  fi
else
  echo "Running $TEST_FILE..."
  if [ "$VERBOSE" = true ]; then
    VERBOSE=true node "$TEST_FILE"
  else
    node "$TEST_FILE"
  fi
fi
TEST_EXIT=$?

echo ""
echo "Killing dev server (PID: $SERVER_PID)..."
kill $SERVER_PID

exit $TEST_EXIT
