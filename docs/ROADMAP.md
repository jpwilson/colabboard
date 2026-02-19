# Orim Roadmap

## MVP Checklist (24-hour gate) — ALL DONE

- [x] Infinite board with pan/zoom
- [x] Sticky notes with editable text
- [x] At least one shape type (rectangle, circle, or line)
- [x] Create, move, and edit objects
- [x] Real-time sync between 2+ users
- [x] Multiplayer cursors with name labels
- [x] Presence awareness (who's online)
- [x] User authentication
- [x] Deployed and publicly accessible

## MVP Build Order

1. Auth (Supabase Auth + Google/GitHub OAuth + login page)
2. Cursor sync (Supabase Realtime Presence)
3. Object sync (Supabase Realtime Broadcast + Postgres Changes)
4. Conflict handling (Last-Write-Wins via updated_at)
5. State persistence (Supabase Postgres + board_objects table)
6. Board features (infinite canvas, sticky notes, rectangles, transforms)
7. Deploy to Vercel

## Early Submission Backlog (Day 4) — MOSTLY DONE

- [x] Landing page (hero, features, CTA, demo preview)
- [x] Dashboard (board list, create board)
- [x] Additional shapes (circle, triangle, diamond, star, arrow, line, hexagon, pentagon, ellipse)
- [x] Connectors (arrows between objects with edge snapping)
- [x] Frames (via AI createFrame tool)
- [x] Delete, duplicate, copy/paste
- [x] Board sharing with invite links
- [x] AI agent — basic commands (create, move, change color) — 11 tools
- [x] AI agent — complex commands (SWOT, retro, kanban, flowchart, timeline, mind map, decision matrix)
- [ ] Multi-select (shift-click, drag-to-select) — single select only

## Final Submission Backlog (Day 7)

- [ ] Stripe payments integration
- [x] Performance optimization (500+ objects, 5+ users — benchmarked)
- [x] AI Development Log (docs/AI_DEV_LOG.md)
- [x] AI Cost Analysis (docs/COST_ANALYSIS.md)
- [ ] Demo video (3-5 min)
- [ ] Social post (@GauntletAI)

## Future (post-submission)

- [ ] iOS app (Swift + Supabase Swift SDK)
- [ ] Android app (Kotlin + Supabase Kotlin SDK)
- [ ] CRDT for text layer (Yjs)
- [ ] Board templates marketplace
- [ ] Export (PNG, SVG, PDF)
- [ ] Board version history / snapshots

## Architecture Note: Mobile Readiness

Supabase is API-first. Same backend for web and native mobile. Only rendering layer changes.
