#!/bin/bash
# Log an activity to the proof-of-work feed
# Usage: ./log-activity.sh <type> <description> [metadata_json]

TYPE="$1"
DESC="$2"
META="${3:-{}}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
FILE="/root/clawd/hackathon/proof-of-work/activity.json"

# Create entry
ENTRY=$(jq -n \
  --arg ts "$TIMESTAMP" \
  --arg type "$TYPE" \
  --arg desc "$DESC" \
  --argjson meta "$META" \
  '{timestamp: $ts, type: $type, description: $desc, metadata: $meta}')

# Append to activity log
jq ". + [$ENTRY]" "$FILE" > "${FILE}.tmp" && mv "${FILE}.tmp" "$FILE"

echo "Logged: $TYPE - $DESC"
