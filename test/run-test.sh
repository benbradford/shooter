#!/bin/bash

echo "Starting dev server..."
npm run dev > /dev/null 2>&1 &
SERVER_PID=$!

echo "Waiting for server to be ready..."
until curl -s http://localhost:5173 > /dev/null; do
  sleep 0.5
done
echo "Server ready!"

echo "Running test..."
node "$@"

TEST_EXIT_CODE=$?

echo ""
echo "Killing dev server (PID: $SERVER_PID)..."
kill $SERVER_PID

exit $TEST_EXIT_CODE
