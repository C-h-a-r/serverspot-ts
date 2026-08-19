# ServerSpot

**Everything you need to run your game server website — store, community, support, and more.**

ServerSpot is a production-grade, self-hosted game server community platform built with TypeScript. It combines a public storefront and community website, a polished admin dashboard, a custom Spot theme system, and deep game-server integrations.

## Tech Stack

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Monorepo:** pnpm workspaces + Turborepo
- **Database:** PostgreSQL + Drizzle ORM
- **Auth:** Better Auth (email/password + OAuth)
- **UI:** Tailwind CSS 4 + shadcn-style components
- **Linting:** Biome

## Project Structure

```
apps/
  web/            Main Next.js app (storefront, admin, API)
  worker/         Background job processor
  game-gateway/   WebSocket game server connections
  cli/            Setup, migrate, seed, create-admin

packages/
  db/             Drizzle schema, migrations, repositories
  auth/           Better Auth configuration
  permissions/    RBAC evaluation
  config/         Environment & feature flags
  spot/           Spot template engine
  ui/             Shared React components
  ...             Domain packages (store, forum, support, etc.)

themes/default/   Default Spot theme pack
plugins/          Minecraft, Discord, example plugin SDK
```

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 9+
- Docker (for PostgreSQL)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
cp .env apps/web/.env
# Edit .env — set AUTH_SECRET to a random 32+ character string
```

Or run the interactive setup:

```bash
pnpm cli setup
```

### 3. Start PostgreSQL

```bash
docker compose up -d postgres
```

### 4. Run migrations & seed

```bash
pnpm db:generate
pnpm cli migrate
pnpm cli seed
```

### 5. Create admin user

```bash
pnpm cli create-admin
```

### 6. Start development

```bash
pnpm dev
```

Open [http://localhost:3000/login](http://localhost:3000/login) and sign in with your admin account.

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all packages and apps |
| `pnpm lint` | Run Biome linter |
| `pnpm test` | Run Vitest tests |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm cli setup` | Interactive first-run setup |
| `pnpm cli doctor` | Check system health |
| `pnpm cli migrate` | Run database migrations |
| `pnpm cli seed` | Seed roles, permissions, modules |
| `pnpm cli create-admin` | Create an owner admin account |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:studio` | Open Drizzle Studio |

## Docker Deployment

```bash
# PostgreSQL only (development)
docker compose up -d postgres

# Full stack (after building)
docker compose up -d web worker

# With game gateway
docker compose --profile gateway up -d

# With Caddy reverse proxy
docker compose --profile caddy up -d
```

## Implementation Phases

This repository follows a phased implementation plan:

| Phase | Status | Scope |
|-------|--------|-------|
| **1 — Foundation** | ✅ Complete | Monorepo, DB schema, auth, admin shell, CLI |
| **2 — Spot + Public Site** | ✅ Complete | Spot engine, theme pack, public pages, theme editor |
| **3 — Core Modules** | ✅ Complete | Store, forum, support, blog, players |
| **4 — Payments** | ✅ Complete | Stripe, PayPal, cart/checkout, worker, email |
| **5 — Game Integrations** | ✅ Complete | Gateway, Minecraft SDK, linking, votes, leaderboards |
| **6 — Remaining Modules** | ✅ Complete | Applications, analytics, Discord, developer API |
| 7 — Hardening | Planned | E2E tests, security, docs |

## Architecture

```
Route/API (apps/web)
  → Service layer (packages/*)
    → Repository (packages/db)
      → PostgreSQL

Background jobs (apps/worker)
  → Job handlers (packages/jobs)
    → Service layer (packages/*)

Public rendering (apps/web)
  → Spot engine (packages/spot)
    → Theme pack (themes/default/)
```

Domain logic lives in `packages/*` — never deeply inside React components.

## License

Private — all rights reserved.
