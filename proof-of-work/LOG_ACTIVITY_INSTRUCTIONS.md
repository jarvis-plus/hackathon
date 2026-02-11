# Activity Logging for Cron Jobs

After completing your task, ALWAYS log the run as an activity:

```bash
curl -s -X POST http://127.0.0.1:3456/api/activities \
  -H "Content-Type: application/json" \
  -d '{"type": "cron-run", "description": "[CRON_NAME]: [brief summary of what happened]", "metadata": {"cron": "CRON_NAME", "result": "success|no-action|error"}}'
```

Replace:
- `CRON_NAME` with the cron job name (e.g., `jarvis-x-post`)
- Summary: what you did (e.g., "Posted tweet about dashboard v2, replied to 2 mentions")
- Result: `success` (did something), `no-action` (nothing to do), `error` (something failed)

This ensures every cron execution is tracked in the PoW activity log and signed on-chain.
