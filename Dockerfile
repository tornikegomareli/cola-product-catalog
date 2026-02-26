FROM oven/bun:1 AS base
WORKDIR /app

# Install ALL dependencies (including sharp for thumbnail generation)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy application code, scripts, and images
COPY src ./src
COPY scripts ./scripts
COPY public ./public

# Generate optimized thumbnails from original images
RUN bun run build:thumbnails

# Expose the port (Railway sets PORT env var)
EXPOSE 3000

# Start the server
CMD ["bun", "run", "src/index.ts"]
