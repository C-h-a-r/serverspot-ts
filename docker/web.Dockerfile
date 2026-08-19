FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/*/package.json ./packages/
COPY tooling/*/package.json ./tooling/
RUN pnpm install --frozen-lockfile

FROM base AS builder
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG AUTH_SECRET=build-time-placeholder-secret-minimum-32-characters
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV AUTH_SECRET=$AUTH_SECRET
ENV DATABASE_URL=$DATABASE_URL
ENV SKIP_ENV_VALIDATION=true
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @serverspot/web build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
