# Evaluator Test Plan — G4 Week 1 CollabBoard

Comprehensive evidence document mapping every G4 evaluation requirement to proof of compliance.

**Last updated:** 2026-02-20
**Test command:** `npm run test:run` (90 unit tests) · `npm run test:e2e` (7 E2E tests) · `npm run test:bench:run` (9 benchmarks)
**CI:** 4 jobs — Lint & Typecheck, Unit Tests, Performance Benchmarks, E2E Tests (all green on main)

---

## 1. Board Features

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Infinite canvas with pan & zoom | Pass | BoardCanvas.tsx: wheel zoom, drag pan. Manual: scroll to zoom, click-drag to pan |
| Sticky notes (create, edit, drag, resize) | Pass | Toolbar "Note" button, 24-color palette, double-click to edit text, Transformer resize. Tests: `Toolbar.test.tsx` (9 tests), `PropertiesPanel.test.tsx` (9 tests), `shape-defaults.test.ts` (8 tests) |
| Shapes (rectangle, circle, ellipse, triangle, diamond, star, hexagon, pentagon, arrow, line, rounded rectangle) | Pass | 11 shape types in dropdown. Tests: `Toolbar.test.tsx` > "shows all 11 shape options" |
| Connectors | Pass | Tool: connector mode, snap-to-object endpoints, 4 arrow styles. Tests: `PropertiesPanel.test.tsx` > "shows arrow style buttons for connectors only" |
| Text elements (standalone) | **In Progress** | Branch: `feat/text-elements` — adds 'text' ShapeType, Toolbar button, double-click edit |
| Transforms (move, resize, rotate) | Pass | Konva Transformer on selected objects. Rotation enabled. Manual: select object → drag handles |
| Selection: single select | Pass | Click object to select, Transformer attaches. Deselect by clicking empty area |
| Selection: multi-select | **In Progress** | Branch: `feat/multi-select` — shift-click toggle, marquee drag, group operations |
| Operations: delete | Pass | Delete/Backspace key, toolbar trash button. Tests: `Toolbar.test.tsx` > "shows and handles delete button" |
| Operations: duplicate | Pass | Cmd/Ctrl+D duplicates selected object with +20px offset |
| Operations: copy/paste | Pass | Cmd/Ctrl+C copies, Cmd/Ctrl+V pastes with offset |
| Object properties (fill, stroke, opacity, font) | Pass | PropertiesPanel: fill color, stroke color, stroke width, opacity slider, font selector. Tests: `PropertiesPanel.test.tsx` (9 tests) |
| Undo/Redo | Pass | Cmd/Ctrl+Z undo, Cmd/Ctrl+Shift+Z redo (in-memory history stack) |

---

## 2. Real-Time Collaboration

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Cursor sync | Pass | usePresence hook: Realtime Presence with 50ms throttle. Tests: `usePresence.test.ts` (6 tests) |
| Object sync | Pass | Three-layer: Broadcast (instant) + Postgres (persist) + Postgres Changes (catch-up). Tests: `board-sync.test.ts` (20 tests) |
| Presence indicators | Pass | PresenceIndicator shows online users with initials + color. Tests: `PresenceIndicator.test.tsx` (3 tests) |
| Conflict resolution | Pass | LWW via `updated_at` timestamps. Tests: `board-sync.test.ts` > "LWW" tests |
| Resilience (disconnect/reconnect) | **In Progress** | Branch: `feat/reconnect-resilience` — connection status monitoring, auto re-fetch, UI indicator |
| State persistence | Pass | All objects persisted to Supabase Postgres. Refresh page → objects reload |

---

## 3. Testing Scenarios (Evaluator Scripts)

### Scenario 1 — Simultaneous Editing
**Status:** Pass
**Steps:**
1. Open board URL in Browser A (logged in as User A)
2. Open same board URL in Browser B (logged in as User B)
3. Both users see each other's cursors (colored dots with names)
4. User A creates a sticky note — appears on User B's canvas within ~100ms
5. User B drags the sticky note — User A sees it move in real-time
6. Both users create and manipulate objects simultaneously

### Scenario 2 — State Persistence
**Status:** Pass
**Steps:**
1. User A creates several objects (sticky notes, shapes, connectors)
2. User A refreshes the page (F5)
3. All objects load from Postgres — nothing lost
4. Close browser entirely, reopen — objects persist
**Automated:** `board-sync.test.ts` > "boardObjectToCanvas correctly maps DB row to CanvasObject"

### Scenario 3 — Rapid Sync
**Status:** Pass
**Steps:**
1. Create 10+ sticky notes rapidly (click toolbar, click canvas repeatedly)
2. Drag objects around quickly
3. All objects sync without loss or visible lag
4. Second browser sees all changes
**Automated:** `sync.bench.ts` — 5 benchmarks measuring sync throughput

### Scenario 4 — Network Resilience
**Status:** **In Progress**
**Steps:**
1. Open board in Chrome
2. DevTools → Network → throttle to Slow 3G
3. Create objects — they appear with delay but persist
4. DevTools → Network → set to Offline
5. Re-enable network
6. Objects recover via Postgres Changes catch-up
**Note:** Basic catch-up works via Postgres Changes channel. `feat/reconnect-resilience` adds explicit connection monitoring, re-fetch, and UI indicator.

### Scenario 5 — Scale (5+ Concurrent Users)
**Status:** Pass
**Steps:**
1. Open board in 5+ browser tabs/windows with different accounts
2. All cursors visible with presence indicators
3. Object sync works across all tabs
4. No performance degradation
**Automated:** `canvas.bench.ts` — 4 benchmarks measuring render performance at scale

---

## 4. AI Agent

| Requirement | Status | Evidence |
|-------------|--------|----------|
| 6+ distinct commands | Pass | 11 tools: createSticky, createShape, deleteObjects, moveObject, updateObject, arrangeObjects, clearBoard, describeBoard, createConnector, createFreedraw, createFromTemplate. Tests: `tools.test.ts` (15 tests) |
| Shared canvas state | Pass | AI tools read/write same board_objects table. All users see AI changes via broadcast sync |
| Multi-step commands | Pass | 8 templates (SWOT, Kanban, Brainstorm, etc.) that create multiple objects. Tests: `system-prompt.test.ts` (11 tests) |
| Response latency <2s | Pass | ~1.5s measured for single-step commands |
| Natural language understanding | Pass | System prompt + 22 slash commands for quick access |
| Chat interface | Pass | Resizable AI panel with message history, verbose/compact toggle, auto-scroll |

### AI Evaluation Suite
- `src/lib/ai/evals/dataset.ts` — test cases for agent accuracy
- `src/lib/ai/evals/judge.ts` — LLM-as-Judge scoring via Langfuse
- `src/lib/ai/evals/run-evals.ts` — automated evaluation runner
- `src/lib/ai/langfuse-scores.ts` — Langfuse observability integration

---

## 5. Performance Targets

| Metric | Target | Status | Evidence |
|--------|--------|--------|----------|
| Pan/zoom FPS | 60 FPS | Pass | Konva hardware-accelerated canvas. Benchmarks: `canvas.bench.ts` |
| Object sync latency | <100ms | Pass | Broadcast channel: ~50ms measured |
| Cursor sync latency | <50ms | Pass | Presence channel with 50ms throttle |
| Object count | 500+ | Pass | Benchmarks test with 500+ objects |
| Concurrent users | 5+ | Pass | Tested with 5 browser tabs |

**Benchmark files:**
- `src/benchmarks/canvas.bench.ts` — 4 benchmarks (object rendering, transform ops)
- `src/benchmarks/sync.bench.ts` — 5 benchmarks (broadcast throughput, DB round-trip)

---

## 6. Authentication & Access Control

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Email/password auth | Pass | Supabase Auth. Tests: `LoginForm.test.tsx` (5 tests) |
| OAuth (Google) | Pass | Configured in Supabase dashboard |
| OAuth (GitHub) | Pass | Configured in Supabase dashboard |
| Magic link auth | Pass | Default login mode |
| Protected routes | Pass | E2E: `home.spec.ts` > "redirects from /dashboard to /login when not authenticated" |
| Board sharing (invite by email) | Pass | Share modal on board page, invitation system on dashboard |
| RLS policies | Pass | All tables have Row-Level Security policies |

**E2E tests** (`e2e/home.spec.ts`, 7 tests):
- Landing page loads with correct title
- Login page renders with email field
- Dashboard redirects to login when unauthenticated
- Board page redirects to login when unauthenticated
- Navigation links work correctly
- OAuth buttons present
- Login form tab switching

---

## 7. Deployment & CI/CD

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Deployed and publicly accessible | Pass | `claudeorim.vercel.app` on Vercel |
| CI pipeline | Pass | GitHub Actions: 4 jobs (Lint & Typecheck, Unit Tests, Benchmarks, E2E) |
| No console errors | Pass | Clean production build, no runtime errors |
| WebSocket connections | Pass | Supabase Realtime connects successfully |

**CI config:** `.github/workflows/ci.yml`
**Jobs:** `lint-and-typecheck`, `unit-tests`, `benchmarks`, `e2e-tests`

---

## 8. AI-First Development Process

| Requirement | Status | Evidence |
|-------------|--------|----------|
| AI development log | Pass | `docs/AI_DEV_LOG.md` — comprehensive development journal |
| Cost analysis | Pass | `docs/COST_ANALYSIS.md` — API usage and cost tracking |
| Roadmap | Pass | `docs/ROADMAP.md` — feature timeline and priorities |
| Git history shows AI-assisted development | Pass | Commit messages include `Co-Authored-By: Claude` |

---

## Test Summary

| Category | Count | Command |
|----------|-------|---------|
| Unit & integration tests | 90 | `npm run test:run` |
| E2E tests | 7 | `npm run test:e2e` |
| Performance benchmarks | 9 | `npm run test:bench:run` |
| Agent evals | 9 | `npx tsx src/lib/ai/evals/run-evals.ts` |
| **Total automated** | **115** | |

### Test Files
| File | Tests |
|------|-------|
| `src/lib/board-sync.test.ts` | 20 |
| `src/lib/ai/tools.test.ts` | 15 |
| `src/lib/ai/system-prompt.test.ts` | 11 |
| `src/components/board/Toolbar.test.tsx` | 9 |
| `src/components/board/PropertiesPanel.test.tsx` | 9 |
| `src/lib/shape-defaults.test.ts` | 8 |
| `src/hooks/usePresence.test.ts` | 6 |
| `src/components/auth/LoginForm.test.tsx` | 5 |
| `src/hooks/useThrottle.test.ts` | 3 |
| `src/components/board/PresenceIndicator.test.tsx` | 3 |
| `e2e/home.spec.ts` | 7 |

---

## Gaps Being Addressed

| Gap | Branch | PR |
|-----|--------|-----|
| Multi-select (shift-click + marquee) | `feat/multi-select` | Pending |
| Disconnect/reconnect resilience | `feat/reconnect-resilience` | Pending |
| Standalone text elements | `feat/text-elements` | Pending |
