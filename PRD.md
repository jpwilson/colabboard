# PRD — Orim (CollabBoard)

> Source of truth: `G4 Week 1 - CollabBoard.pdf`
> Direction (not binding): `Orim_PreSearch_Document.pdf`

## Project Context

G4 Week 1 gate project. **Required for Austin admission.**

Real-time collaborative whiteboard with AI board manipulation. Build production-scale collaborative infrastructure, then extend with an AI agent that manipulates the board through natural language.

> "A simple whiteboard with bulletproof multiplayer beats a feature-rich board with broken sync."

## Staged Deadlines

| Stage | Deadline | Focus | Status |
|-------|----------|-------|--------|
| Pre-Search | Monday (1hr in) | Architecture, Planning | DONE |
| MVP | Tuesday (24hrs) | Collaborative infrastructure | FEATURES DONE — POLISHING |
| Early Submission | Friday (4 days) | Full feature set | NOT STARTED |
| Final | Sunday 10:59 PM CT | Polish, documentation, deployment | NOT STARTED |

## Current Work Plan

1. **Today (first half):** Polish MVP — harden what's built. Test against 5 evaluator scenarios. Fix rough edges.
2. **Today (second half):** Begin Early Submission features — prioritize by impact.
3. **Wed–Fri:** Build remaining board features + AI Board Agent (60% of time → AI Agent).
4. **Sat–Sun:** Final polish, documentation (AI Dev Log, Cost Analysis), demo video, social post.

---

## STAGE 1 — MVP (DONE)

**Hard gate. All items required to pass. All complete.**

- [x] Infinite board with pan/zoom
- [x] Sticky notes with editable text
- [x] At least one shape type (rectangle, circle, or line)
- [x] Create, move, and edit objects
- [x] Real-time sync between 2+ users
- [x] Multiplayer cursors with name labels
- [x] Presence awareness (who's online)
- [x] User authentication
- [x] Deployed and publicly accessible

---

## STAGE 2 — Early Submission / Full Feature Set (due Friday)

### Board Features

| Feature | Requirement | Status |
|---------|-------------|--------|
| Workspace | Infinite board with smooth pan/zoom | DONE |
| Sticky Notes | Create, edit text, change colors | DONE |
| Shapes | Rectangles, circles, lines with solid colors | DONE (+ extras) |
| Connectors | Lines/arrows connecting objects | **TODO** |
| Text | Standalone text elements | **TODO** |
| Frames | Group and organize content areas | **TODO** |
| Transforms | Move, resize, rotate objects | PARTIAL (no rotate) |
| Selection | Single and multi-select (shift-click, drag-to-select) | PARTIAL (single only) |
| Operations | Delete, duplicate, copy/paste | PARTIAL (delete only) |

### Real-Time Collaboration

| Feature | Requirement | Status |
|---------|-------------|--------|
| Cursors | Multiplayer cursors with names, real-time movement | DONE |
| Sync | Object creation/modification appears instantly for all users | DONE |
| Presence | Clear indication of who's currently on the board | DONE |
| Conflicts | Handle simultaneous edits (LWW documented) | DONE |
| Resilience | Graceful disconnect/reconnect handling | **TODO** |
| Persistence | Board state survives all users leaving and returning | DONE |

### AI Board Agent (NOT STARTED)

**Required: 6+ distinct commands across these categories:**

**Creation Commands:**
- "Add a yellow sticky note that says 'User Research'"
- "Create a blue rectangle at position 100, 200"
- "Add a frame called 'Sprint Planning'"

**Manipulation Commands:**
- "Move all the pink sticky notes to the right side"
- "Resize the frame to fit its contents"
- "Change the sticky note color to green"

**Layout Commands:**
- "Arrange these sticky notes in a grid"
- "Create a 2x3 grid of sticky notes for pros and cons"
- "Space these elements evenly"

**Complex Commands:**
- "Create a SWOT analysis template with four quadrants"
- "Build a user journey map with 5 stages"
- "Set up a retrospective board with What Went Well, What Didn't, and Action Items columns"

**Tool Schema (minimum):**
```
createStickyNote(text, x, y, color)
createShape(type, x, y, width, height, color)
createFrame(title, x, y, width, height)
createConnector(fromId, toId, style)
moveObject(objectId, x, y)
resizeObject(objectId, width, height)
updateText(objectId, newText)
changeColor(objectId, color)
getBoardState()
```

**AI Agent Performance Targets:**

| Metric | Target |
|--------|--------|
| Response latency | <2 seconds for single-step commands |
| Command breadth | 6+ command types |
| Complexity | Multi-step operation execution |
| Reliability | Consistent, accurate execution |

**Shared AI State:** All users see AI-generated results in real-time. Multiple users can issue AI commands simultaneously without conflict.

---

## STAGE 3 — Final Submission (due Sunday 10:59 PM CT)

### Testing Scenarios (evaluators will test these)

1. 2 users editing simultaneously in different browsers
2. One user refreshing mid-edit (state persistence check)
3. Rapid creation and movement of sticky notes and shapes (sync performance)
4. Network throttling and disconnection recovery
5. 5+ concurrent users without degradation

### Performance Targets

| Metric | Target |
|--------|--------|
| Frame rate | 60 FPS during pan, zoom, object manipulation |
| Object sync latency | <100ms |
| Cursor sync latency | <50ms |
| Object capacity | 500+ objects without performance drops |
| Concurrent users | 5+ without degradation |

### Required Submissions

- [ ] **GitHub Repository:** Setup guide, architecture overview, deployed link
- [ ] **Demo Video (3-5 min):** Real-time collaboration, AI commands, architecture explanation
- [x] **Pre-Search Document:** `Orim_PreSearch_Document.pdf`
- [ ] **AI Development Log:** 1-page (template at `docs/AI_DEV_LOG.md`)
- [ ] **AI Cost Analysis:** Dev spend + projections for 100/1K/10K/100K users (template at `docs/COST_ANALYSIS.md`)
- [ ] **Deployed Application:** Publicly accessible, supports 5+ users with auth
- [ ] **Social Post:** X or LinkedIn — description, features, demo/screenshots, tag @GauntletAI

### AI-First Development Requirements

**Required tools (use at least 2 of):** Claude Code, Cursor, Codex, MCP integrations

**AI Development Log sections:**
| Section | Content |
|---------|---------|
| Tools & Workflow | Which AI coding tools, how integrated |
| MCP Usage | Which MCPs, what they enabled |
| Effective Prompts | 3-5 prompts that worked well (actual prompts) |
| Code Analysis | Rough % AI-generated vs hand-written |
| Strengths & Limitations | Where AI excelled, where it struggled |
| Key Learnings | Insights about working with coding agents |

**AI Cost Analysis:** Track dev spend (LLM API costs, tokens, API calls). Project monthly costs at 100 / 1,000 / 10,000 / 100,000 users.

---

## PreSearch Direction (not binding)

From `Orim_PreSearch_Document.pdf`:
- Launch: 10 users, 2-5 concurrent per board; 6-month: 10K users
- Hard MVP budget cap: $450
- GDPR-ready, SOC2-aligned posture
- LWW for MVP, CRDT planned for text layer (stretch)
- Stripe integration (post-submission)
- Adaptive input detection — mouse + touchscreen (stretch)
