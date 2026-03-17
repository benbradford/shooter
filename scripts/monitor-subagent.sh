#!/bin/bash
# Monitor subagent progress and detect timeouts

AGENT_NAME=$1
TIMEOUT_SECONDS=${2:-300}  # Default 5 minutes

LOG_FILE="tmp/logs/${AGENT_NAME}.log"
CHECKPOINT_FILE="tmp/logs/${AGENT_NAME}-checkpoint.log"

if [ ! -f "$LOG_FILE" ]; then
    echo "❌ No log file found: $LOG_FILE"
    exit 1
fi

# Get last log entry
LAST_LOG=$(tail -1 "$LOG_FILE")
echo "📝 Last log entry:"
echo "   $LAST_LOG"
echo ""

# Get checkpoint status
if [ -f "$CHECKPOINT_FILE" ]; then
    CHECKPOINT=$(cat "$CHECKPOINT_FILE")
    echo "📍 Checkpoint:"
    echo "   $CHECKPOINT"
    echo ""
    
    # Parse checkpoint
    PHASE=$(echo "$CHECKPOINT" | cut -d'|' -f2)
    PHASE_NAME=$(echo "$CHECKPOINT" | cut -d'|' -f3)
    STATUS=$(echo "$CHECKPOINT" | cut -d'|' -f4)
    
    echo "   Phase: $PHASE - $PHASE_NAME"
    echo "   Status: $STATUS"
else
    echo "⚠️  No checkpoint file found"
fi

echo ""
echo "Options:"
echo "  1. Wait longer (agent may still be working)"
echo "  2. Cancel and retry"
echo "  3. Cancel and implement directly"
echo "  4. Check full log: cat $LOG_FILE"
