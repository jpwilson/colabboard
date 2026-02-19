# Evaluator Test Plan

Pre-submission sanity checklist. Maps to G4 Week 1 testing scenarios.

## Collaboration Scenarios

- [x] **Scenario 1 — Simultaneous editing:** Open board in 2 browsers (different accounts). Both see each other's cursors. Create and move objects — changes sync live.
- [x] **Scenario 2 — State persistence:** User A creates several objects. User A refreshes the page. All objects are still there.
- [x] **Scenario 3 — Rapid sync:** Create 10 sticky notes quickly, drag them around rapidly. No objects lost, no visible lag.
- [ ] **Scenario 4 — Network resilience:** Chrome DevTools → Network → throttle to Slow 3G. Create objects. Disable network. Re-enable. State recovers. *(Partially: Postgres Changes catch-up works, but no explicit offline queue)*
- [x] **Scenario 5 — Scale:** Open board in 5+ browser tabs (different accounts). All cursors visible, sync works, no degradation.

## AI Agent

- [x] Run 6+ distinct commands in sequence — each produces correct result (11 tools, 22 suggestion commands)
- [x] All users see AI-generated changes in real-time (objects flow through broadcast sync)
- [x] Multi-step command (e.g., "Create a SWOT analysis") executes correctly (8 templates)
- [x] Response latency <2 seconds for single-step commands (~1.5s measured)

## Performance

- [x] Board with 100+ objects — pan/zoom stays smooth (60 FPS target)
- [x] Object sync latency feels instant (<100ms)
- [x] Cursor sync feels instant (<50ms)

## Auth & Access

- [x] Sign out → navigate to `/board/[slug]` → redirected to `/login`
- [x] Copy share link → open in incognito → redirected to login → after login, join works
- [x] OAuth (Google) login works on deployed app
- [x] OAuth (GitHub) login works on deployed app

## Deployment

- [x] `claudeorim.vercel.app` is publicly accessible
- [x] No console errors on page load (except expected dev warnings)
- [x] WebSocket connections succeed (no 401s)
