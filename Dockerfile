# Stage 1: Build
FROM node:22-slim AS builder

WORKDIR /app

# Enable pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies (frozen-lockfile for consistency)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Stage 2: Production
FROM node:22-slim

WORKDIR /app

# Enable pnpm (optional if we just run node output, but good for healthchecks etc if needed)
# Not strictly necessary for running the output if standalone, but 'nuxt start' might need it if we used that.
# However, for Nuxt 3/4 output it's usually `node .output/server/index.mjs`.
# We don't strictly need pnpm in the runner if the build is standalone.
# But let's keep the env clean.

COPY --from=builder /app/.output /app/.output

# Expose port
EXPOSE 3000

# Set environment variables
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

# Start the application
CMD ["node", ".output/server/index.mjs"]
