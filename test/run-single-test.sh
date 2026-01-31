#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: ./test/run-single-test.sh <test-file>"
  echo "Example: ./test/run-single-test.sh test/test-wall-collision.js"
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
node "$TEST_FILE"
TEST_EXIT=$?

echo ""
echo "Killing dev server (PID: $SERVER_PID)..."
kill $SERVER_PID

exit $TEST_EXIT
