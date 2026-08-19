# Architecture

## Package Boundaries

### Apps (Deployables)

| App | Responsibility |
|-----|----------------|
| `apps/web` | Next.js full-stack: public site, admin dashboard, API routes, webhooks |
| `apps/worker` | Background job processor (outbox pattern → BullMQ later) |
| `apps/game-gateway` | Persistent WebSocket connections to game servers |
| `apps/cli` | Operational commands: setup, migrate, seed, backup |

### Core Packages

| Package | Responsibility |
|---------|----------------|
| `@serverspot/config` | Typed env vars (@t3-oss/env-nextjs), feature flags, module toggles |
| `@serverspot/db` | Drizzle schema, migrations, DB client, seed |
| `@serverspot/auth` | Better Auth server + client configuration |
| `@serverspot/permissions` | RBAC constants, permission evaluation helpers |
| `@serverspot/observability` | Pino structured logging |

### Domain Packages

Each domain module owns its business logic:

- `@serverspot/store` — Products, carts, orders, fulfilment
- `@serverspot/forum` — Categories, threads, posts, moderation
- `@serverspot/support` — Tickets, help centre, automation
- `@serverspot/cms` — Blog posts, pages, SEO
- `@serverspot/users` — Profiles, linked accounts, badges
- `@serverspot/payments` — Stripe, PayPal, checkout abstraction
- `@serverspot/jobs` — Job types, enqueue, retry policies
- `@serverspot/email` — Nodemailer + React Email templates
- `@serverspot/discord` — OAuth, role sync, notifications
- `@serverspot/game` — Game-agnostic adapter interfaces
- `@serverspot/minecraft` — Minecraft-specific protocol
- `@serverspot/storage` — File storage abstraction
- `@serverspot/spot` — Template parser, renderer, sandbox

### Rules

1. **No business logic in React components** — components orchestrate UI only
2. **No circular dependencies** between packages
3. **Shared UI** only in `@serverspot/ui`
4. **Shared config** only in `@serverspot/config`
5. **Import via workspace packages** — e.g. `@serverspot/store`, never relative cross-package paths

## Data Flow

```
HTTP Request
  → Next.js route / server action (apps/web)
    → Service function (packages/{domain})
      → Repository query (packages/db)
        → PostgreSQL

Background Job
  → Worker poller (apps/worker)
    → Job handler (packages/jobs)
      → Service function (packages/{domain})
        → Side effects (email, fulfilment, webhooks)
```

## Auth & Permissions

- **Better Auth** manages sessions, OAuth, email/password
- **RBAC** via `roles`, `permissions`, `role_permissions`, `user_roles` tables
- Admin routes require session + `admin.access` permission
- Permission checks via `@serverspot/permissions` helpers

## Spot Theme System

Public pages are rendered via the Spot template engine (`packages/spot`), not hardcoded React.

Theme packs live in `themes/{name}/` with:
- `schema.json` — admin-configurable options
- HTML templates with Spot syntax
- CSS and sandboxed JavaScript

See `prompt.txt` Section 5 for full Spot specification.
