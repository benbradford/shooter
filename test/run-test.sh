#!/bin/bash

# Check if server is already running
if ! curl -s http://localhost:5173 > /dev/null 2>&1; then
  echo "Error: Dev server not running on port 5173"
  echo "Start server with: npm run dev"
  exit 1
fi

echo "Running test..."
node "$@"

exit $?
