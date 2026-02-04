# Proof of Work Dashboard - Docker Image
# 
# Build: docker build -t jarvis-pow .
# Run:   docker run -p 3456:3456 -v $(pwd)/data:/app/data jarvis-pow
#
# For production, mount the Solana wallet keypair:
#   docker run -p 3456:3456 \
#     -v $(pwd)/data:/app/data \
#     -v /path/to/wallet.json:/app/wallet.json:ro \
#     -e SOLANA_KEYPAIR_PATH=/app/wallet.json \
#     jarvis-pow

FROM oven/bun:latest

# Create app directory
WORKDIR /app

# Install dependencies first for better layer caching
COPY package.json ./
RUN bun install --production

# Copy application source
COPY api/ ./api/
COPY dashboard/ ./dashboard/
COPY collectors/ ./collectors/
COPY sign-activity.ts log.ts auto-sign.ts ./
COPY log-activity.sh cron-runner.sh ./

# Create data directory for persistent storage
RUN mkdir -p /app/data

# Copy default data files if they don't exist in volume
COPY data/webhooks.json ./data/webhooks.json.default

# Initialize activity.json if not mounted
RUN echo '[]' > /app/activity.json.default

# Script to initialize data on first run
RUN echo '#!/bin/sh\n\
if [ ! -f /app/activity.json ]; then\n\
  cp /app/activity.json.default /app/activity.json\n\
fi\n\
if [ ! -f /app/data/webhooks.json ]; then\n\
  cp /app/data/webhooks.json.default /app/data/webhooks.json\n\
fi\n\
exec bun run api/server.ts\n' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Expose the dashboard port
EXPOSE 3456

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3456/api/health || exit 1

# Environment variables with defaults
ENV PORT=3456 \
    NODE_ENV=production

# Labels for container metadata
LABEL org.opencontainers.image.title="Jarvis Proof of Work Dashboard" \
      org.opencontainers.image.description="Cryptographically signed proof of AI agent activity" \
      org.opencontainers.image.url="https://github.com/jarvis-plus/hackathon" \
      org.opencontainers.image.source="https://github.com/jarvis-plus/hackathon" \
      org.opencontainers.image.vendor="Jarvis AI" \
      org.opencontainers.image.licenses="MIT"

# Run as non-root for security (optional, comment out if you need root)
# USER bun

ENTRYPOINT ["/app/entrypoint.sh"]
