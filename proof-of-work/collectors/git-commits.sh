#!/bin/bash
# Collect recent git commits and log them to activity feed
# Run periodically or after commits

REPO_DIR="${1:-/root/clawd}"
ACTIVITY_LOG="/root/clawd/hackathon/proof-of-work/log-activity.sh"
LAST_SHA_FILE="/root/clawd/hackathon/proof-of-work/.last-commit-sha"

cd "$REPO_DIR" || exit 1

# Get last processed SHA
LAST_SHA=""
if [ -f "$LAST_SHA_FILE" ]; then
    LAST_SHA=$(cat "$LAST_SHA_FILE")
fi

# Get commits since last SHA (or last 10 if no SHA)
if [ -n "$LAST_SHA" ]; then
    COMMITS=$(git log --oneline "$LAST_SHA"..HEAD 2>/dev/null || git log --oneline -10)
else
    COMMITS=$(git log --oneline -1)  # Just the latest on first run
fi

# Process each commit
echo "$COMMITS" | while read -r line; do
    if [ -n "$line" ]; then
        SHA=$(echo "$line" | cut -d' ' -f1)
        MSG=$(echo "$line" | cut -d' ' -f2-)
        
        # Log the commit
        "$ACTIVITY_LOG" "commit" "$MSG" "{\"sha\": \"$SHA\", \"repo\": \"clawd\"}"
    fi
done

# Save current HEAD
git rev-parse HEAD > "$LAST_SHA_FILE"
