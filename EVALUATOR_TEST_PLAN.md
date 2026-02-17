# Evaluator Test Plan

Pre-submission sanity checklist. Maps to G4 Week 1 testing scenarios.

## Collaboration Scenarios

- [ ] **Scenario 1 — Simultaneous editing:** Open board in 2 browsers (different accounts). Both see each other's cursors. Create and move objects — changes sync live.
- [ ] **Scenario 2 — State persistence:** User A creates several objects. User A refreshes the page. All objects are still there.
- [ ] **Scenario 3 — Rapid sync:** Create 10 sticky notes quickly, drag them around rapidly. No objects lost, no visible lag.
- [ ] **Scenario 4 — Network resilience:** Chrome DevTools → Network → throttle to Slow 3G. Create objects. Disable network. Re-enable. State recovers.
- [ ] **Scenario 5 — Scale:** Open board in 5+ browser tabs (different accounts). All cursors visible, sync works, no degradation.

## AI Agent

- [ ] Run 6+ distinct commands in sequence — each produces correct result
- [ ] All users see AI-generated changes in real-time
- [ ] Multi-step command (e.g., "Create a SWOT analysis") executes correctly
- [ ] Response latency <2 seconds for single-step commands

## Performance

- [ ] Board with 100+ objects — pan/zoom stays smooth (60 FPS target)
- [ ] Object sync latency feels instant (<100ms)
- [ ] Cursor sync feels instant (<50ms)

## Auth & Access

- [ ] Sign out → navigate to `/board/[slug]` → redirected to `/login`
- [ ] Copy share link → open in incognito → redirected to login → after login, join works
- [ ] OAuth (Google) login works on deployed app
- [ ] OAuth (GitHub) login works on deployed app

## Deployment

- [ ] `claudeorim.vercel.app` is publicly accessible
- [ ] No console errors on page load (except expected dev warnings)
- [ ] WebSocket connections succeed (no 401s)
