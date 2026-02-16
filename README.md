# Orim

**Real-time collaborative whiteboard with AI-powered board manipulation.**

Orim is a multiplayer whiteboard platform where teams can brainstorm, map ideas, and run workshops simultaneously — with an AI agent that creates and arranges board content through natural language commands.

> *A simple, solid, multiplayer whiteboard with a working AI agent beats any feature-rich board with broken collaboration.*

## Live Demo

**Deployed URL:** _Coming soon_

## Features

### Core Whiteboard
- Infinite canvas with smooth pan/zoom
- Sticky notes — create, edit text, change colors
- Shapes — rectangles, circles, lines with solid colors
- Connectors — lines/arrows connecting objects
- Frames — group and organize content areas
- Standalone text elements
- Move, resize, rotate objects
- Single and multi-select (shift-click, drag-to-select)
- Delete, duplicate, copy/paste

### Real-Time Collaboration
- Multiplayer cursors with name labels
- Instant object sync across all connected users
- Presence awareness — see who's currently on the board
- Conflict handling via Last-Write-Wins
- Graceful disconnect/reconnect
- Full state persistence — board survives all users leaving

### AI Board Agent
Natural language commands to manipulate the board:

| Category | Example Commands |
|----------|-----------------|
| **Creation** | "Add a yellow sticky note that says 'User Research'" |
| **Manipulation** | "Move all the pink sticky notes to the right side" |
| **Layout** | "Arrange these sticky notes in a grid" |
| **Complex** | "Create a SWOT analysis template with four quadrants" |

6+ distinct command types with multi-step operation support.

### Authentication & Roles
- Google OAuth, GitHub OAuth, Email/Password
- Role-based access: Owner, Editor, Viewer
- Guest access via invite link

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js (TypeScript), React, Tailwind CSS |
| **Canvas** | Konva.js via react-konva |
| **Backend** | Supabase (Postgres + Realtime + Auth + RLS) |
| **AI** | Claude / OpenAI with function calling |
| **Testing** | Vitest (unit/integration), Playwright (E2E) |
| **CI/CD** | GitHub Actions, Vercel |
| **Payments** | Stripe (planned) |

## Performance Targets

| Metric | Target |
|--------|--------|
| Frame rate | 60 FPS during pan, zoom, manipulation |
| Object sync latency | < 100ms |
| Cursor sync latency | < 50ms |
| Object capacity | 500+ without performance drops |
| Concurrent users | 5+ without degradation |

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- A Supabase project ([create one free](https://supabase.com/dashboard))

### Setup

```bash
# Clone the repo
git clone https://github.com/jpwilson/colabboard.git
cd colabboard

# Install dependencies
npm install

# Copy environment template and fill in your Supabase credentials
cp .env.local.example .env.local

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Create `.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Running Tests

```bash
# Unit/integration tests (watch mode for TDD)
npm run test

# Single run
npm run test:run

# E2E tests
npm run test:e2e

# Full validation (typecheck + lint + tests)
npm run validate
```

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Next.js App                 │
│  ┌─────────────┐  ┌──────────────────────┐  │
│  │  App Router  │  │   react-konva Canvas │  │
│  │  (pages,     │  │   (infinite board,   │  │
│  │   layouts,   │  │    objects, cursors)  │  │
│  │   auth)      │  │                      │  │
│  └──────┬───────┘  └──────────┬───────────┘  │
│         │                     │              │
│  ┌──────┴─────────────────────┴───────────┐  │
│  │         Supabase Client (SSR)          │  │
│  └──────────────────┬─────────────────────┘  │
└─────────────────────┼───────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   ┌────┴────┐  ┌─────┴─────┐  ┌───┴───┐
   │Postgres │  │ Realtime  │  │ Auth  │
   │ (data,  │  │ (cursors, │  │(OAuth,│
   │  RLS)   │  │  presence,│  │ RBAC) │
   │         │  │  sync)    │  │       │
   └─────────┘  └───────────┘  └───────┘
                Supabase
```

### Database Schema

| Table | Purpose |
|-------|---------|
| `boards` | Board metadata (name, owner, timestamps) |
| `board_members` | Membership + roles (owner, editor, viewer) |
| `board_objects` | All canvas objects (sticky notes, shapes, text, etc.) |

### Build Priority

1. **Cursor sync** — multiplayer cursors via Supabase Realtime Presence
2. **Object sync** — real-time object CRUD via Broadcast + Postgres Changes
3. **Conflict handling** — Last-Write-Wins with `updated_at` timestamps
4. **State persistence** — board state survives refresh and reconnect
5. **Board features** — shapes, frames, connectors, transforms, selection
6. **AI commands (basic)** — single-step creation and manipulation
7. **AI commands (complex)** — multi-step templates (SWOT, retro boards, etc.)

## Project Structure

```
src/
  app/              # Next.js App Router (pages, layouts, API routes)
  components/
    ui/             # Shared UI primitives
    board/          # Whiteboard components (Canvas, Toolbar, ObjectLayer)
    providers/      # React context providers
  hooks/            # Custom hooks (useBoard, usePresence, useCursors)
  lib/
    supabase/       # Supabase client utilities (browser + server)
  types/            # TypeScript type definitions
  test/             # Test setup and helpers
e2e/                # Playwright E2E tests
```

## Development Approach

- **TDD** — tests first, then implementation
- **AI-First** — built using Claude Code + Supabase MCP
- **Vertical slices** — finish one layer before starting the next
- **Continuous multiplayer testing** — test with multiple browser windows throughout

## License

MIT
