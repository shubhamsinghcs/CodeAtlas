FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages ./packages/
COPY apps ./apps/

# Install dependencies and build
RUN pnpm install --frozen-lockfile
RUN pnpm build

# Production image
FROM node:22-alpine

WORKDIR /app

# We only need the built artifacts and node_modules for CLI
# This can be optimized further in the future, but for now we copy the workspace
COPY --from=builder /app /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Make codeatlas globally available
RUN npm link ./packages/cli

ENTRYPOINT ["codeatlas"]
CMD ["--help"]
