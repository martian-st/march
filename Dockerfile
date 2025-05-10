# Build stage
FROM oven/bun:1 as builder

WORKDIR /app

# Copy package files from backend
COPY apps/backend/package.json .
COPY apps/backend/bun.lockb .

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the backend application
COPY apps/backend/src ./src
COPY apps/backend/index.js .

# Production stage
FROM oven/bun:1-slim

WORKDIR /app

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json .
COPY --from=builder /app/src ./src
COPY --from=builder /app/index.js .

# Set production environment
ENV NODE_ENV=production

# Expose the port the app runs on
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:8080/health || exit 1

# Start the application
CMD ["bun", "run", "start"]
