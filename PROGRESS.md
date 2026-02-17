# Orim — Progress Tracker

## Project Overview

**Orim** is a real-time collaborative whiteboard built for Gauntlet G4 Week 1.
Stack: Next.js 16 + Supabase + react-konva + Tailwind v4.

---

## Completed Work

### Phase 0: Scaffolding & CI (PRs: initial commits)
- [x] Next.js 16 with TypeScript, Tailwind v4, App Router
- [x] Supabase SSR client utilities + Next.js 16 proxy
- [x] Vitest, Playwright, ESLint, Prettier configuration
- [x] GitHub Actions CI pipeline
- [x] Project structure, seed tests, types
- [x] CLAUDE.md documentation

### Phase 0.5: Interactive Canvas (PR: initial commits)
- [x] react-konva canvas with pan/zoom (wheel + drag)
- [x] Sticky note tool — click to place, double-click to edit text
- [x] Rectangle tool — click to place
- [x] Select tool — click to select, drag to move, transformer to resize
- [x] Delete selected objects (Delete/Backspace key)
- [x] Grid dot background (40px spacing)
- [x] Z-index layering

### Phase 1: Fix Tests & Deploy (PR #1)
- [x] Fix E2E and unit tests for canvas-based homepage
- [x] Vercel deployment configuration

### Phase 2: Auth System (PR #2)
- [x] Database schema: `boards`, `board_members`, `board_objects` tables
- [x] RLS policies with `is_board_member()` and `is_board_editor()` helpers
- [x] Email/password authentication
- [x] Google OAuth setup (Supabase + Google Cloud Console)
- [x] GitHub OAuth setup (Supabase + GitHub Developer Settings)
- [x] Login page with sign-in/sign-up toggle
- [x] OAuth callback route handler
- [x] Protected routes: `/dashboard`, `/board/[slug]`
- [x] Proxy-based route protection (redirect to `/login` if unauthenticated)
- [x] Dashboard page — list boards, create board, delete board
- [x] Board page — lookup by slug, verify membership, render canvas
- [x] Auto-generated human-readable slugs (adjective-noun-number)
- [x] TypeScript types generated from Supabase schema

### Phase 3: Performance Benchmarks (PR #3)
- [x] Vitest benchmark suite (`src/benchmarks/canvas.bench.ts`)
- [x] 500-object generation, viewport culling, LWW merge, cursor batch benchmarks
- [x] Sync benchmarks (serialize/deserialize, diff computation)
- [x] E2E performance test (FPS measurement with 100+ objects)
- [x] CI job for benchmarks

### Phase 4: Real-time Cursor Sync (PR #4)
- [x] `usePresence` hook — Supabase Realtime Presence on `board:{boardId}` channel
- [x] `useThrottle` hook — generic throttle (~50ms for cursor updates)
- [x] `CursorOverlay` component — colored arrow cursors with name labels
- [x] `PresenceIndicator` component — online user avatars in toolbar
- [x] 8 distinct cursor colors assigned by userId hash
- [x] Unit tests for hooks and components

### Phase 5: Real-time Object Sync (PR #5)
- [x] `useBoard` hook — master sync hook (fetch + subscribe + CRUD)
- [x] Three-layer sync: Broadcast (instant) → Postgres (persist) → Postgres Changes (catch-up)
- [x] Last-Write-Wins (LWW) conflict resolution via `updated_at`
- [x] Optimistic local updates with broadcast + DB persist
- [x] `board-sync.ts` — type conversions, LWW merge, serialization
- [x] BoardCanvas integration: synced mode (with boardId) vs local mode
- [x] Unit tests for sync logic

### Phase 6: Dashboard Polish & Board Features (PR #6)
- [x] Dashboard: member count, owner badge, formatted dates, delete button
- [x] Window resize handler for canvas Stage dimensions
- [x] Board page 404 handling

### Phase 7: Final Integration (PR #7)
- [x] Board page auth redirect E2E test
- [x] Full auth flow verified: landing → login → dashboard → board

### Phase 8: Landing Page & Theme (PR #8 + direct commit)
- [x] Brand color palette: blue (#0096FF), teal (#66FFCC), gold (#FFC107), slate (#445668)
- [x] CSS custom properties via `@theme inline` for Tailwind v4
- [x] Force `color-scheme: light` to fix dark mode text issues
- [x] Landing page with glassmorphism UI:
  - [x] Animated hero section with mock canvas preview
  - [x] Feature showcase grid (6 features)
  - [x] "How it works" 3-step section
  - [x] iOS/Android "Coming soon" section
  - [x] Floating background blobs with drift animation
  - [x] Scroll-triggered fade-in animations (IntersectionObserver)
- [x] Login form fixes:
  - [x] Legible input text (`text-slate-900`)
  - [x] Password show/hide eye toggle
  - [x] Visible submit button (inline styles)
  - [x] Overlapping yellow circles logo (matching brand)
- [x] E2E tests updated for new routing

---

## Remaining Plan

### Next Up: Enhanced Drawing Tools
- [ ] Shape tool dropdown: circle, triangle, diamond, star, arrow, line, hexagon, rounded rectangle
- [ ] Shape properties: fill color, fill opacity/transparency, border color, border thickness
- [ ] Sticky note color picker
- [ ] Font selection (3-4 open source fonts) for sticky notes and text in shapes
- [ ] Free draw tool (freehand drawing with pen/pencil)
- [ ] Properties panel / toolbar for editing selected object properties

### Future Phases (from original plan)
- [ ] Vercel production deployment with env vars
- [ ] CI secrets for E2E with proper auth
- [ ] Board invitation system (share links)
- [ ] AI board manipulation (Claude/OpenAI function calling)
- [ ] Stripe payments integration
- [ ] Mobile apps (iOS/Android)

---

## Tech Debt & Known Issues
- `bg-primary` Tailwind class doesn't render on login submit button (workaround: inline styles)
- E2E tests use `BYPASS_AUTH=true` in CI (no real auth flow testing)
- Supabase built-in email limited to 4/hr in dev (Resend needed for production)

---

## PRs Merged

| # | Title | Branch |
|---|-------|--------|
| 8 | feat: add landing page with glassmorphism and fix login theme | `feat/landing-page-and-theme` |
| 7 | test: add board page auth redirect E2E test | `feat/final-polish` |
| 6 | feat: polish dashboard and add window resize handler | `feat/board-features` |
| 5 | feat: add real-time object sync with Broadcast + Postgres | `feat/object-sync` |
| 4 | feat: add real-time cursor sync with Supabase Presence | `feat/cursor-sync` |
| 3 | feat: add performance benchmarks framework | `feat/perf-benchmarks` |
| 2 | feat: auth system with login, dashboard, and board routes | `feat/auth` |
| 1 | chore: fix tests for canvas homepage + deploy | `chore/fix-tests-and-deploy` |
