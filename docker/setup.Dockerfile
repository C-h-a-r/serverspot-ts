FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/cli/package.json ./apps/cli/
COPY apps/worker/package.json ./apps/worker/
COPY apps/web/package.json ./apps/web/
COPY apps/game-gateway/package.json ./apps/game-gateway/
COPY packages/*/package.json ./packages/
COPY tooling/*/package.json ./tooling/
RUN pnpm install --frozen-lockfile

FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY . .
WORKDIR /app
ENTRYPOINT ["pnpm", "cli"]
