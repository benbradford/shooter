# Subagent Monitoring System

## Overview

5-part system to prevent subagents from getting stuck and enable debugging.

## 1. Logging Infrastructure

**All agents log to:** `tmp/logs/{agent-name}.log`

**Checkpoint files:** `tmp/logs/{agent-name}-checkpoint.log`

## 2. Checkpoint System

**Format:** `{timestamp}|{phase}|{status}`

**Status values:** IN_PROGRESS, COMPLETE, WAITING, FAILED

## 3. Progress Markers

Agents output: `[STEP X] {action}...`

## 4. Monitor Script

**Usage:** `./scripts/monitor-subagent.sh {agent-name}`

Shows last log, checkpoint, recovery options.

## 5. Graceful Degradation

Agents never loop silently, report errors, ask for guidance when stuck.

## Recovery Workflow

```
Cancel → Monitor → Check status → Retry/Direct/Wait
```

## Testing

```bash
./scripts/monitor-subagent.sh db-design
tail -20 tmp/logs/db-design.log
cat tmp/logs/db-design-checkpoint.log
```
