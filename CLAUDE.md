# CLAUDE.md — Orim (CollabBoard)

> A real-time collaborative whiteboard with AI board manipulation.

- **GitHub:** https://github.com/jpwilson/colabboard
- **Deployed:** Vercel (TBD)

---

## Tech Stack

| Layer          | Technology                                      |
| -------------- | ----------------------------------------------- |
| Framework      | Next.js 16.1.6 (App Router, TypeScript, Turbopack) |
| Styling        | Tailwind CSS v4 (CSS-first config in globals.css)  |
| Backend        | Supabase (Postgres + Realtime + Auth + RLS)        |
| Canvas         | react-konva (Konva.js)                             |
| Unit/Integration | Vitest + React Testing Library                   |
| E2E            | Playwright (Chromium only)                         |
| CI/CD          | GitHub Actions CI, Vercel deployment               |
| AI (later)     | Claude/OpenAI with function/tool calling           |
| Payments (later) | Stripe                                          |

---

## Project Documents

Read these files for context before starting work:

| Document | Purpose |
|----------|---------|
| `PRD.md` | Product requirements — what to build, staged deadlines, feature status |
| `USER_FLOW.md` | User journeys — routes and auth states for each flow |
| `ERROR_FIX_LOG.md` | Known errors and fixes — check before debugging |
| `EVALUATOR_TEST_PLAN.md` | Pre-submission checklist — maps to G4 testing scenarios |
| `G4 Week 1 - CollabBoard.pdf` | Assignment spec (source of truth for requirements) |
| `Orim_PreSearch_Document.pdf` | Early architecture decisions (directional, not binding) |

---

## Architecture

- Monolithic Next.js app — no microservices
- App Router with `src/` directory
- Server Components by default; Client Components where needed
- REST route handlers for API (not GraphQL/tRPC)

---

## Folder Structure

```
src/
  app/              # Pages and layouts
  components/
    ui/             # Shared UI primitives
    board/          # Board components (BoardCanvas is Konva boundary)
    providers/      # Context providers
  hooks/            # Custom hooks (useBoard, usePresence, useCursors)
  lib/
    supabase/       # client.ts, server.ts, proxy.ts
    empty.ts        # Canvas stub for Turbopack
    utils.ts        # Shared utilities
  types/
    database.ts     # Supabase generated types
    board.ts        # Board domain types
  test/
    setup.ts        # Vitest setup (jest-dom matchers)
    helpers.ts      # Custom render wrapper
  proxy.ts          # Next.js 16 proxy (session refresh)
e2e/                # Playwright E2E tests
docs/               # Deliverables (AI_DEV_LOG, COST_ANALYSIS, ROADMAP)
```

---

## Routes

| Path              | Purpose                                    |
| ----------------- | ------------------------------------------ |
| `/`               | Landing page                               |
| `/login`          | Authentication                             |
| `/dashboard`      | Board list                                 |
| `/board/[slug]`   | Board view (slug is human-readable, URL-safe) |

---

## Key Patterns

### Supabase SSR — Two Clients

- `src/lib/supabase/client.ts` — browser client for Client Components
- `src/lib/supabase/server.ts` — server client with `getAll()`/`setAll()` cookies

### Proxy (NOT Middleware)

`src/proxy.ts` handles auth session refresh (Next.js 16 convention). Exports `proxy()`, **not** `middleware()`. This is **not** `middleware.ts`.

### Canvas (react-konva)

- ALL react-konva usage MUST live in `src/components/board/BoardCanvas.tsx` (or child components imported from there)
- Must use `'use client'`
- Load with `next/dynamic` and `{ ssr: false }`
- One `Transformer` for selection
- `Textarea` overlay for text editing (not native Konva text editing)
- Throttle drag events; persist to DB on drag-end only

### Conflict Resolution

Last-Write-Wins via `updated_at` timestamps.

---

## Database Schema (planned)

| Table            | Key Columns                                                            |
| ---------------- | ---------------------------------------------------------------------- |
| `boards`         | id (uuid), slug (unique), name, owner_id, created_at, updated_at      |
| `board_members`  | id, board_id, user_id, role (owner\|editor\|viewer), invited_at        |
| `board_objects`  | id, board_id, type, data (jsonb), x, y, width, height, z_index, created_by, updated_at |

---

## RBAC

| Role   | Permissions                                    |
| ------ | ---------------------------------------------- |
| Owner  | Full control, delete board, manage members     |
| Editor | Create/edit/move/delete objects                 |
| Viewer | Read-only, can see cursors and presence         |
| Guest  | Viewer access via invite link                   |

---

## Commands

```bash
npm run dev            # Dev server (Turbopack, port 3000)
npm run build          # Lint + production build
npm run start          # Production server
npm run lint           # ESLint (flat config, zero warnings)
npm run lint:fix       # Auto-fix lint issues
npm run format         # Prettier format
npm run format:check   # Check formatting
npm run test           # Vitest watch mode (TDD workflow)
npm run test:run       # Vitest single run (CI)
npm run test:coverage  # Vitest with v8 coverage
npm run test:e2e       # Playwright E2E
npm run test:e2e:ui    # Playwright interactive UI
npm run typecheck      # TypeScript check
npm run validate       # Full: typecheck + lint + tests
```

---

## Development Workflow (TDD)

1. Write a failing test first (RED)
2. Write minimal code to pass (GREEN)
3. Refactor while keeping tests green (REFACTOR)
4. Test files live alongside source: `Component.tsx` + `Component.test.tsx`
5. E2E tests in `e2e/` for user flows
6. Do NOT unit test async Server Components — use E2E for those

---

## Code Conventions

- Functional components only
- Named exports for components; default exports only for pages
- `interface` for object shapes; `type` for unions/intersections
- No `any` — use `unknown` and narrow
- Error handling: never swallow silently
- PascalCase components, camelCase hooks, SCREAMING_SNAKE constants
- Test files: same name with `.test.tsx` suffix

---

## Git Conventions

- Branch naming: `feat/`, `fix/`, `chore/`, `test/`, `docs/`
- Conventional commits: `feat:`, `fix:`, `chore:`, `test:`, `docs:`
- All PRs must pass CI
- Squash merge to main

---

## Next.js 16 Specifics

- Proxy file is `src/proxy.ts` (NOT `middleware.ts`)
- Export is `proxy()` (NOT `middleware()`)
- `next lint` does not exist — use `eslint .` directly
- ESLint uses flat config in `eslint.config.mjs`
- Turbopack is default — no flag needed
- All request APIs are async: `await cookies()`, `await headers()`

---

## Supabase Rules

- Always use `supabase.auth.getUser()` on server — never `getSession()`
- Use `getAll()`/`setAll()` cookie pattern (not get/set/remove)
- RLS policies on every table — no exceptions
- Env var: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not ANON_KEY)
- Generate types: `npx supabase gen types typescript --project-id <id> > src/types/database.ts`

---

## Konva / Canvas Rules

- ALL Konva imports must be in `'use client'` components
- `BoardCanvas.tsx` is the single Konva entry point
- Load with `next/dynamic` and `{ ssr: false }`
- One `Transformer` attached to selected nodes
- Text editing via HTML textarea overlay (not native Konva text editing)
- Throttle drag/move events; persist to DB on drag-end only
- Target 60 FPS during pan/zoom

---

## Performance Targets

| Metric                  | Target                          |
| ----------------------- | ------------------------------- |
| Pan/zoom/manipulation   | 60 FPS                          |
| Object sync latency     | < 100ms                         |
| Cursor sync latency     | < 50ms                          |
| Object count            | 500+ without performance drops  |
| Concurrent users/board  | 5+                              |

---

## Build Priority (MVP)

1. Auth (Supabase Auth + OAuth + login page)
2. Cursor sync (Supabase Realtime Presence)
3. Object sync (Realtime Broadcast + Postgres Changes)
4. Conflict handling (LWW via `updated_at`)
5. State persistence (Postgres)
6. Board features (infinite canvas, sticky notes, shapes, transforms)
7. Deploy to Vercel

---

## Environment Variables

Required in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## AI Guardrails

### Environment Files (Read-Only)

- NEVER modify `.env`, `.env.local`, or `.env.*.example` files without explicit user approval
- When setting Vercel/CI env vars, use `printf` (not `echo`) to avoid trailing newlines
- If env var issues arise, check `ERROR_FIX_LOG.md` first

### Error Resolution Protocol

- Before debugging an issue, check `ERROR_FIX_LOG.md` for known solutions
- After resolving a new error, add an entry to `ERROR_FIX_LOG.md`
- Include: date, error description, root cause, fix applied, prevention rule

### Tech Stack Lock

- Do NOT introduce new frameworks, libraries, or major dependencies without user approval
- The stack is: Next.js 16, React 19, Supabase, react-konva, Tailwind v4, Vitest, Playwright
- If a task seems to need a new dependency, discuss alternatives using existing tools first
