# Build stage
FROM oven/bun:1 as builder

WORKDIR /app

# Copy package files
COPY package.json .

# Install dependencies without lockfile (since we don't have bun.lockb in backend dir)
RUN bun install

# Copy the rest of the application
COPY . .

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
  CMD curl -f http://localhost:8080/ || exit 1

# Start the application
CMD ["bun", "run", "start"]
