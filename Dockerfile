FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

# Copy application code and images
COPY src ./src
COPY public ./public

# Expose the port (Railway sets PORT env var)
EXPOSE 3000

# Start the server
CMD ["bun", "run", "src/index.ts"]
