# AI Development Log

## Tools & Workflow

**Primary tool:** Claude Code (Anthropic CLI) — used for all implementation, debugging, testing, and deployment.

Claude Code operated as the primary development agent across the entire project lifecycle:
- Architecture decisions (three-layer sync, LWW conflict resolution, dual-branch evaluation)
- Full-stack implementation (Next.js 16, Supabase, react-konva, Tailwind v4)
- Database schema design with RLS policies
- AI agent creation (tool schemas, system prompts, template patterns)
- CI/CD pipeline setup (GitHub Actions, Vercel deployment)
- Debugging and error resolution (tracked in ERROR_FIX_LOG.md)

**Secondary tools:** Supabase MCP, Vercel MCP (integrated via Claude Code's MCP server system).

## MCP Usage

### Supabase MCP
- **Schema management:** Created tables (boards, board_members, board_objects) with migrations
- **SQL execution:** RLS policies, PostgreSQL functions (slug generation trigger), security helpers
- **Advisors:** Ran security and performance advisors after DDL changes — caught missing `SET search_path` on functions
- **Type generation:** Generated TypeScript types from live schema

### Vercel MCP
- **Deployment:** Preview and production deploys directly from CLI
- **Environment variables:** Set Supabase, Anthropic, and Langfuse keys for preview/production
- **Build logs:** Debugged deployment failures (model ID validation, missing env vars)
- **Runtime logs:** Investigated 401 WebSocket errors (traced to trailing newlines in env vars)

## Effective Prompts

### 1. Three-Layer Sync Architecture
> "Design a real-time sync system for board objects using Supabase Realtime. It needs to be instant for the user making changes, persist to Postgres, and handle missed updates when a user reconnects. Use Broadcast for instant delivery, Postgres for persistence, and Postgres Changes as a catch-up layer."

**Why it worked:** Specific constraints (instant + persistent + catch-up) led to a clear three-layer architecture that Claude implemented correctly in one pass.

### 2. AI Tool Schema Design
> "Design 10 tools for an AI board agent. The tools should return data (not side effects) — the client will call addObject/updateObject/deleteObject. Each tool returns { action: 'create'|'update'|'delete'|'read', ... }. Creation tools return the full object. Manipulation tools return the ID + partial updates."

**Why it worked:** The "server-defines, client-executes" constraint meant tools were pure functions returning data, which made them testable and composable.

### 3. System Prompt Template Patterns
> "Add template patterns to the system prompt with exact pixel coordinates. When someone asks for a SWOT analysis, the AI should create 4 frames in a 2x2 grid with colored backgrounds and title labels. Include coordinates, dimensions, and colors for each template."

**Why it worked:** Giving the LLM exact coordinates in the system prompt produced consistent, pixel-perfect layouts on every invocation.

### 4. Langfuse Integration
> "Switch from LangSmith to Langfuse for tracing. Use @langfuse/otel with LangfuseSpanProcessor in src/instrumentation.ts, and the observe() wrapper from @langfuse/tracing around the API route handler. Enable experimental_telemetry on streamText."

**Why it worked:** Specific library names and file paths prevented Claude from guessing the integration pattern.

### 5. Error-Driven Debugging
> "Check ERROR_FIX_LOG.md for known issues before debugging. The model ID 'claude-sonnet-4-5-20250514' keeps failing. Read node_modules/@ai-sdk/anthropic/dist/index.d.ts to find the valid model ID type union."

**Why it worked:** Directing Claude to read actual SDK type definitions instead of guessing from memory resolved a frustrating recurring error.

## Code Analysis

| Category | Estimate |
|----------|----------|
| AI-generated (Claude Code) | ~90% |
| Human-reviewed and modified | ~10% |
| Human-written from scratch | <1% |

All output was reviewed. Key human interventions:
- Corrected model IDs after SDK type verification
- Reverted incorrect AI SDK v6 type assumptions (tool part property names)
- Guided architecture decisions (dual-branch evaluation, Langfuse over LangSmith)
- UX feedback (friendly error messages, persistent suggestion pills, verbose toggle)

## Strengths & Limitations

### Where AI Excelled
- **Boilerplate generation:** Supabase client setup, Next.js routes, component scaffolding
- **Database schema:** Tables, RLS policies, PostgreSQL functions, migration SQL
- **Tool schema design:** Zod schemas for 11 AI tools with proper types
- **System prompt engineering:** Template patterns with exact coordinates
- **Test writing:** 90 unit/component tests across 10 files
- **CSS animations:** Keyframe definitions for alien mascot states

### Where AI Struggled
- **Model ID validation:** Repeatedly guessed wrong model IDs for `@ai-sdk/anthropic`. The SDK type union includes `(string & {})` as a fallback, so TypeScript accepts any string at compile time but the API rejects invalid IDs at runtime.
- **AI SDK v6 types:** Assumed tool part properties (`tool-invocation`, `result`, `toolInvocationId`) when the actual SDK uses (`tool-${name}`, `output-available`, `toolCallId`). Required reading source types to fix.
- **Vercel env vars:** Used `echo` to pipe values, which added trailing newlines that broke WebSocket auth. Had to switch to `printf`.
- **Dependency version compatibility:** Tried jsdom v28 which requires Node 22+; our CI runs Node 20.9.0.

## Key Learnings

1. **Always verify SDK type definitions** — don't guess from memory or documentation. Read `node_modules/.../dist/index.d.ts` directly.

2. **ERROR_FIX_LOG is invaluable** — maintaining a running log of errors and fixes prevents repeat debugging. Check it first, add to it after resolving.

3. **"Server-defines, Client-executes"** is the right pattern for AI board agents — tools return data, the client handles mutations through existing sync infrastructure. No new sync code needed.

4. **Dual-branch evaluation** reveals tradeoffs early — comparing Next.js (Branch A) vs Python Docker (Branch B) architectures before committing.

5. **System prompts with exact coordinates** produce deterministic template layouts — the LLM follows pixel positions reliably.

6. **Langfuse over LangSmith** for observability — simpler integration via OpenTelemetry span processor, no wrapper functions needed.
