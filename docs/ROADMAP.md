# Orim Roadmap

## MVP Checklist (24-hour gate)

- [ ] Infinite board with pan/zoom
- [ ] Sticky notes with editable text
- [ ] At least one shape type (rectangle, circle, or line)
- [ ] Create, move, and edit objects
- [ ] Real-time sync between 2+ users
- [ ] Multiplayer cursors with name labels
- [ ] Presence awareness (who's online)
- [ ] User authentication
- [ ] Deployed and publicly accessible

## MVP Build Order

1. Auth (Supabase Auth + Google/GitHub OAuth + login page)
2. Cursor sync (Supabase Realtime Presence)
3. Object sync (Supabase Realtime Broadcast + Postgres Changes)
4. Conflict handling (Last-Write-Wins via updated_at)
5. State persistence (Supabase Postgres + board_objects table)
6. Board features (infinite canvas, sticky notes, rectangles, transforms)
7. Deploy to Vercel

## Early Submission Backlog (Day 4)

- [ ] Landing page (hero, features, CTA, demo preview)
- [ ] Dashboard (board list, create board)
- [ ] Additional shapes (circle, line, connectors, frames)
- [ ] Text elements (standalone)
- [ ] Multi-select (shift-click, drag-to-select)
- [ ] Delete, duplicate, copy/paste
- [ ] Board member management (invite, roles)
- [ ] Guest view via invite link
- [ ] AI agent — basic commands (create, move, change color)
- [ ] AI agent — complex commands (SWOT, retro board, grid layout)

## Final Submission Backlog (Day 7)

- [ ] Stripe payments integration
- [ ] Graceful disconnect/reconnect handling
- [ ] Performance optimization (500+ objects, 5+ users)
- [ ] AI Development Log (docs/AI_DEV_LOG.md)
- [ ] AI Cost Analysis (docs/COST_ANALYSIS.md)
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
