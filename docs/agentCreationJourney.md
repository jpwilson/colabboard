# Agent Creation Journey — Orim (CollabBoard)

> Master document for the AI Board Agent feature. Tracks requirements, architecture decisions, implementation approach, and evaluation criteria.

---

## 1. Requirements (G4 Week 1 Spec)

### Required Capabilities

The AI agent must support **at least 6 distinct commands** across these categories:

**Creation Commands**
- "Add a yellow sticky note that says 'User Research'"
- "Create a blue rectangle at position 100, 200"
- "Add a frame called 'Sprint Planning'"

**Manipulation Commands**
- "Move all the pink sticky notes to the right side"
- "Resize the frame to fit its contents"
- "Change the sticky note color to green"

**Layout Commands**
- "Arrange these sticky notes in a grid"
- "Create a 2x3 grid of sticky notes for pros and cons"
- "Space these elements evenly"

**Complex Commands**
- "Create a SWOT analysis template with four quadrants"
- "Build a user journey map with 5 stages"
- "Set up a retrospective board with What Went Well, What Didn't, and Action Items columns"

### Required Tool Schema (Minimum API)

```
createStickyNote(text, x, y, color)
createShape(type, x, y, width, height, color)
createFrame(title, x, y, width, height)
createConnector(fromId, toId, style)
moveObject(objectId, x, y)
resizeObject(objectId, width, height)
updateText(objectId, newText)
changeColor(objectId, color)
getBoardState()  // returns current board objects for context
```

### Evaluation Criteria

| Command | Expected Result |
|---------|----------------|
| "Create a SWOT analysis" | 4 labeled quadrants (Strengths, Weaknesses, Opportunities, Threats) |
| "Arrange in a grid" | Elements aligned with consistent spacing |
| Multi-step commands | AI plans steps and executes sequentially |

### Shared AI State

- All users see AI-generated results in real-time
- Multiple users can issue AI commands simultaneously without conflict

---

## 2. Performance Targets

| Metric | Target |
|--------|--------|
| Response latency | <2 seconds for single-step commands |
| Command breadth | 6+ command types |
| Complexity | Multi-step operation execution |
| Reliability | Consistent, accurate execution |

---

## 3. Testing Scenarios

These are the scenarios the evaluators will test:

1. **Single AI command execution** — User types a command, objects appear correctly
2. **Multiple concurrent AI commands** — Two users issue AI commands simultaneously, no conflicts
3. **AI command reliability** — Commands produce consistent results across multiple runs
4. **AI command latency** — Single-step commands complete in <2 seconds
5. **Persistence** — Objects created by AI persist after page refresh
6. **Real-time sync** — AI-created objects appear instantly for all connected users
7. **Multi-step decomposition** — "Create a SWOT analysis" produces multiple coordinated objects
8. **Board state awareness** — "Move all sticky notes to the right" correctly identifies and moves existing objects
9. **Network throttling** — AI commands still work under slow network conditions

---

## 4. Architecture Decision — Dual-Branch Evaluation

### Why Two Branches?

We're building the AI agent two ways to compare approaches on real metrics:

| Aspect | Branch A: Next.js API Routes | Branch B: Python Docker Microservice |
|--------|------------------------------|--------------------------------------|
| Branch | `feat/agent-nextjs` | `feat/agent-docker-python` |
| Language | TypeScript | Python |
| Framework | Vercel AI SDK | LangChain + FastAPI |
| Model | Claude Sonnet 4.5 via `@ai-sdk/anthropic` | Claude Sonnet 4.5 via `ChatAnthropic` |
| Observability | LangSmith via `langsmith/experimental/vercel` | LangSmith native (env vars only) |
| Deployment | Vercel (auto-deploy with app) | Docker → Railway/Fly.io |
| Streaming | `useChat()` React hook (native) | Custom SSE/NDJSON bridge |

### Shared Foundation (Both Branches)

Both branches share the same core architecture:

```
User types command in chat panel
    ↓
AI service receives message + boardId
    ↓
Claude Sonnet 4.5 with tool calling (structured function calls)
    ↓
Tool results stream back to client
    ↓
Client calls addObject() / updateObject() / deleteObject()
    ↓
Existing three-layer sync → all users see changes
```

**Key insight: Server-defines, Client-executes.** The AI service returns object *definitions* (data), not side effects. The client handles all board mutations through existing `useBoard()` functions. This means:
- AI objects flow through the same Broadcast → Postgres → Postgres Changes sync pipeline
- No new sync code needed
- LWW conflict resolution works automatically
- All connected users see AI changes in real-time

### What is Tool Calling?

Tool calling (also called function calling) makes the AI agent's behavior **deterministic and specific to our board**. Instead of generating free-text descriptions, Claude invokes structured functions with typed parameters:

```
User: "Create a SWOT analysis"

Claude's response (not free text, but structured tool calls):
  1. getBoardState() → reads current board
  2. createFrame("Strengths", x=50, y=50, w=350, h=300, fill="#bbf7d0")
  3. createFrame("Weaknesses", x=420, y=50, w=350, h=300, fill="#fecaca")
  4. createFrame("Opportunities", x=50, y=370, w=350, h=300, fill="#bfdbfe")
  5. createFrame("Threats", x=420, y=370, w=350, h=300, fill="#fde68a")
  6. createStickyNote("Add strengths here", x=100, y=120, color="#bbf7d0")
  7. createStickyNote("Add weaknesses here", x=470, y=120, color="#fecaca")
  8. createStickyNote("Add opportunities here", x=100, y=440, color="#bfdbfe")
  9. createStickyNote("Add threats here", x=470, y=440, color="#fde68a")
```

Each tool call has a schema (Zod in TypeScript, Pydantic in Python) enforcing exact parameter types. The LLM cannot call functions that don't exist or pass invalid parameters.

---

## 5. Tool Schema (Shared Across Both Branches)

### 10 Tools — Full Specification

| # | Tool | Category | Parameters | Return Format |
|---|------|----------|------------|---------------|
| 1 | `createStickyNote` | Creation | `text: string, x?: number, y?: number, color?: string, width?: number, height?: number` | `{ action: 'create', object: CanvasObject }` |
| 2 | `createShape` | Creation | `type: ShapeType, x?: number, y?: number, width?: number, height?: number, fill?: string, stroke?: string, strokeWidth?: number` | `{ action: 'create', object: CanvasObject }` |
| 3 | `createFrame` | Creation | `title: string, x?: number, y?: number, width?: number, height?: number, fill?: string` | `{ action: 'create', object: CanvasObject }` |
| 4 | `createConnector` | Creation | `fromId: string, toId: string, style?: ConnectorStyle` | `{ action: 'create', object: CanvasObject }` |
| 5 | `moveObject` | Manipulation | `objectId: string, x: number, y: number` | `{ action: 'update', id: string, updates: Partial<CanvasObject> }` |
| 6 | `resizeObject` | Manipulation | `objectId: string, width: number, height: number` | `{ action: 'update', id: string, updates: Partial<CanvasObject> }` |
| 7 | `updateText` | Manipulation | `objectId: string, newText: string` | `{ action: 'update', id: string, updates: Partial<CanvasObject> }` |
| 8 | `changeColor` | Manipulation | `objectId: string, color: string` | `{ action: 'update', id: string, updates: Partial<CanvasObject> }` |
| 9 | `deleteObject` | Manipulation | `objectId: string` | `{ action: 'delete', id: string }` |
| 10 | `getBoardState` | Read | *(none)* | `{ action: 'read', objects: [...], count: number }` |

### How Tools Map to Board Operations

- **Creation tools** (1-4): Return `{ action: 'create', object }` → client calls `addObject(object)`
- **Manipulation tools** (5-9): Return `{ action: 'update'/'delete', id, updates }` → client calls `updateObject(id, updates)` or `deleteObject(id)`
- **Read tool** (10): Returns board state for LLM context — no board mutation

### Layout & Complex Commands Are Emergent

These aren't separate tools — the LLM decomposes them into sequences of existing tools:
- "Arrange in a grid" → `getBoardState()` + N × `moveObject()`
- "Create SWOT" → `getBoardState()` + 4 × `createFrame()` + 4 × `createStickyNote()`
- "Space evenly" → `getBoardState()` + calculate positions + N × `moveObject()`

### Supported Shape Types

```
sticky_note | rectangle | rounded_rectangle | circle | ellipse
triangle | diamond | star | arrow | line | hexagon | pentagon
freedraw | connector
```

### Sticky Note Colors

```
#fef08a (yellow) | #bbf7d0 (green) | #bfdbfe (blue) | #fbcfe8 (pink)
#fde68a (amber)  | #c4b5fd (purple) | #fed7aa (orange) | #fecaca (red)
```

---

## 6. Observability — Langfuse

### Why Langfuse?

The G4 spec requires an **AI Cost Analysis** deliverable with:
- LLM API costs (actual spend during development)
- Total tokens consumed (input/output breakdown)
- Number of API calls made
- Production cost projections at 100 / 1,000 / 10,000 / 100,000 users

Initially planned LangSmith, but switched to **Langfuse** for simpler OpenTelemetry-based integration.

### Branch A: Langfuse via OpenTelemetry + observe()

```typescript
// src/instrumentation.ts — registers span processor at startup
import { LangfuseSpanProcessor } from '@langfuse/otel'
const tracerProvider = new NodeTracerProvider({ spanProcessors: [new LangfuseSpanProcessor()] })
tracerProvider.register()

// src/app/api/ai/chat/route.ts — wraps handler
import { observe } from '@langfuse/tracing'
export const POST = observe(handler, { name: 'ai-chat', endOnExit: false })

// streamText call — enables telemetry
streamText({ ..., experimental_telemetry: { isEnabled: true } })
```

Traces include: model name, token counts (input/output), latency per step, tool calls, system prompt, cost estimation.

### Branch B: Langfuse Native (Python) — Planned

```python
from langfuse.callback import CallbackHandler
handler = CallbackHandler()
# Pass to LangChain agent as callback
```

### Metrics Tracked

| Metric | Purpose |
|--------|---------|
| Tokens per command type | Cost estimation |
| Input vs output token ratio | Optimization opportunities |
| Latency per step | Performance targets |
| Tool call frequency | Usage patterns |
| Error rate | Reliability measurement |
| Cost per user session | Production projections |

---

## 7. Extra Credit Goals

### Creative Commands (DONE)
- **Brainstorming / Mind Map**: "Create a mind map with 6 branching ideas" → radial sticky note layout with varied colors
- **Board summarization**: "Describe what's on the board" → LLM reads state and provides text analysis
- **Flowchart**: "Create a flowchart" → vertical flow with Start, Process, Decision, End + connectors
- **Timeline**: "Create a timeline with 5 milestones" → horizontal sticky notes with connecting line
- **Decision Matrix**: "Create an Eisenhower matrix" → 2×2 grid with Impact vs Effort axes

### Smart Layout Tool (DONE)
- `arrangeObjects(objectIds, layout, spacing)` — arrange in grid/horizontal/vertical patterns
- Enables: "Arrange in a grid" / "Stack vertically" / "Line up horizontally"

### Template Library (DONE — 8 templates)
- SWOT Analysis (4 quadrants, color-coded)
- Retrospective (3 columns: Went Well / To Improve / Actions)
- Kanban Board (To Do / In Progress / Done)
- Pros and Cons (2-column layout)
- Mind Map (central node with radial branches)
- Flowchart (vertical flow with connectors)
- Timeline (horizontal milestones)
- Decision Matrix / Eisenhower (2×2 labeled grid)

### UX Polish (DONE)
- Verbose/Concise toggle — user chooses between brief confirmations and detailed explanations
- Undo for AI actions — undo stack tracks creates/updates/deletes per message, reverses in order
- Persistent suggestion pills — Create/Edit/Layout categories with 7-8 commands each
- Animated alien mascot — state-driven CSS animations (idle, writing, thinking, error)

---

## 8. Evaluation — Branch Comparison

After both branches are built and deployed, we'll measure:

| Metric | Branch A (Next.js) | Branch B (Python Docker) | Winner |
|--------|-------------------|--------------------------|--------|
| First-tool latency | ~1.5s | TBD | |
| Multi-step latency (SWOT) | ~3-4s | TBD | |
| Token usage per command | ~2,600 avg (Langfuse) | TBD | |
| Deployment complexity | 1 deploy (Vercel) | 2 deploys (Vercel + Docker) | |
| Developer experience | TS throughout | Python AI + TS frontend | |
| Observability quality | Langfuse (OpenTelemetry) | Langfuse native | |
| Streaming smoothness | useChat() native | Custom bridge | |
| Hosting cost | $0 (Vercel) | ~$5-7/mo (Railway) | |

Branch A results populated from Langfuse. Branch B pending.

---

## 9. Implementation Timeline

| Phase | Description | Status |
|-------|-------------|--------|
| Step 0 | This document + branch creation | DONE |
| A1 | Foundation: API route, 2 tools, chat panel | DONE |
| A2 | Complete all 11 tools (+ arrangeObjects) | DONE |
| A3 | Langfuse observability (switched from LangSmith) | DONE |
| A4 | Template patterns + system prompt polish (8 templates) | DONE |
| A5 | Chat UI polish (suggestions, verbose toggle, undo, animations) | DONE |
| A6 | Testing (90 tests across 10 files) | DONE |
| A-Deploy | Deploy Branch A on Vercel preview | DONE |
| B1 | FastAPI + single tool | Pending |
| B2 | Next.js proxy route | Pending |
| B3 | Complete tools + Docker | Pending |
| B4 | Langfuse dashboard | Pending |
| B-Deploy | Deploy Branch B on Railway | Pending |
| Eval | Compare branches, pick winner, merge to main | Pending |

---

*Last updated: 2026-02-19*
