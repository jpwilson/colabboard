# Leveling Up — Saturday 21 Feb PM Onwards

## Context
After completing analytics refactor + UI polish on `feat/analytics-refactor`, we're building new features to differentiate Orim from Miro and productize the platform. Staying on the same branch until the previous work is graded and merged.

---

## Miro Gap Analysis Summary

### What We Have (Strong Foundation)
- Infinite canvas, 15 shape types, real-time cursors/presence, 3-layer sync
- AI agent with 11 tools + 8 templates, undo/redo
- RBAC (owner/editor/viewer/guest), board sharing, properties panel
- Admin dashboard with Langfuse analytics, dark/light theme, Google OAuth + email auth

### Biggest Gaps (Prioritized)
| Gap | Impact | Effort |
|-----|--------|--------|
| Only 8 templates, no domain packs | High | Medium |
| No GDPR cookie consent | High (legal) | Small |
| No template browser / domain selector | High | Medium |
| No minimap | Medium | Medium |
| No keyboard shortcuts | Medium | Small |
| No comments/threads | Medium | Medium |
| No voting/reactions | Medium | Small |
| No timer widget | Low | Small |
| No image upload | Medium | Medium |
| No export (PNG/PDF) | Medium | Medium |
| No search across board | Medium | Small |
| No presentation mode | Medium | Large |
| No integrations | Low (for now) | Large |
| No video/audio chat | Low | Very Large |

---

## Phase 1: Current Sprint (Saturday 21 Feb PM)

### Feature 1: GDPR Cookie Consent Banner
**Files:**
- New: `src/components/ui/CookieConsentBanner.tsx`
- Modified: `src/app/layout.tsx` (mount banner)
- Modified: `src/app/globals.css` (slideUp keyframe)
- New: `src/components/ui/CookieConsentBanner.test.tsx`

**Design:**
- Fixed bottom banner, translucent glass-morphism style
- Three buttons: "Accept All" (accent), "Essential Only" (secondary), "Reject All" (ghost)
- Cookie icon + brief text + Cookie Policy link
- Only shows on public pages (landing, login) — not on authenticated routes
- localStorage key: `orim-cookie-consent` → `{ level, timestamp }`
- Slide-up animation, dark mode support
- Mobile responsive (stack buttons vertically)

### Feature 2: Template Registry + Domain Packs
**Files:**
- New: `src/lib/ai/template-registry.ts` (core registry)
- New: `src/lib/ai/template-registry.test.ts`
- Modified: `src/lib/ai/system-prompt.ts` (accept domain param)
- Modified: `src/lib/ai/agent-adapter.ts` (add domain to interface)
- Modified: `src/lib/ai/adapters/nextjs-adapter.ts` (pass domain)
- Modified: `src/lib/ai/adapters/docker-adapter.ts` (pass domain)
- Modified: `src/app/api/ai/chat/route.ts` (extract domain from body)
- Modified: `src/lib/ai/classify-command.ts` (dynamic template regex)
- Modified: `src/components/ui/AiAgentButton.tsx` (domain selector UI)

**6 Domain Packs (~36 templates):**

| Domain | Templates |
|--------|-----------|
| **General** (existing 8) | SWOT, Kanban, Retro, Mind Map, Flowchart, Timeline, Pros/Cons, Decision Matrix |
| **Business & Strategy** | Business Model Canvas, Lean Canvas, PESTLE, Porter's Five Forces, Stakeholder Map, Competitive Analysis, OKR Board |
| **Product & UX** | User Journey Map, Empathy Map, Feature Prioritization (RICE), User Story Map, Sprint Planning, Design Critique |
| **Engineering** | System Architecture, Database ER Diagram, API Design, Incident Postmortem, Technical Decision Record, Sprint Board |
| **Education** | Lesson Plan, Concept Map, Study Guide, Rubric Builder, KWL Chart |
| **Science** | Experiment Planning, Lab Report Layout, Hypothesis Board, Research Poster |

**Architecture:**
```
template-registry.ts
├── TemplateDefinition { id, name, domain, description, prompt, instructions }
├── DomainPack { id, name, icon, templates[], editPrompts[], layoutPrompts[] }
├── getAllDomains() → DomainPack[]
├── getDomainPack(id) → DomainPack
├── getTemplateInstructions(id) → string (for system prompt injection)
└── getAllTemplateNames() → string[] (for command classification)
```

**UI:** Domain selector pill bar above suggestion categories in AI chat panel. Stored in localStorage (`orim-chat-domain`). Domain passed through chat API → system prompt.

---

## Phase 2: Next Sprint (Future)

### Quick Wins
- **Keyboard shortcuts** — Ctrl+Z/Y undo/redo, Delete, Ctrl+C/V copy/paste, arrow keys nudge
- **Minimap** — Small overview panel in bottom-right corner
- **Search** — Find text across all objects on board
- **Timer widget** — Countdown timer visible to all collaborators
- **Voting/reactions** — Dot voting on sticky notes

### Medium Features
- **Comments** — Location-anchored threaded discussions
- **Image upload** — Drag-and-drop images onto canvas
- **Export** — PNG/PDF export of board or selected area
- **Object locking** — Prevent accidental moves
- **Presentation mode** — Use frames as slides, navigate with arrows

### Large Features
- **Domain-specific shape packs** — SVG icon libraries (AWS, UML, circuit symbols, etc.)
- **Multiple AI sidekicks** — Different AI agents for different tasks
- **Mind map tool** — Dedicated auto-layout mind mapping
- **Tables** — Structured data on canvas with multiple views
- **Integrations** — Slack, GitHub, Jira notifications

### Business Features (Phase 4+)
- **Version history** — Board snapshots with restore
- **Billing** — Stripe integration, tiered pricing
- **Video/audio** — Built-in conferencing or deep Zoom/Meet integration
- **Mobile app** — React Native or PWA approach (see iPhone App section below)

---

## iPhone App Considerations

### Approach Options
| Option | Pros | Cons |
|--------|------|------|
| **PWA (Progressive Web App)** | Same codebase, instant deploy, no App Store review | Limited iOS support (no push notifications until iOS 16.4+), no native gestures |
| **React Native + react-native-skia** | Native performance, App Store distribution, full gesture API | Separate codebase, can't reuse react-konva, significant effort |
| **Capacitor/Ionic wrapper** | Wraps existing Next.js app in native shell, some native APIs | Performance concerns with canvas, hybrid feel |
| **Expo + react-native-skia** | Best DX for React Native, Skia gives canvas-like rendering | Still a separate codebase, learning curve |

### Recommended: PWA First, React Native Later
1. **Short term:** Make the current web app a PWA with `manifest.json`, service worker, touch gesture support
2. **Medium term:** Optimize for touch — pinch-to-zoom, two-finger pan, tap-to-select, long-press context menus
3. **Long term:** React Native app with `react-native-skia` for the canvas layer, sharing the business logic (AI tools, templates, sync) via a shared TypeScript package

### Mobile Design Considerations
- **Screen space:** Toolbar collapses to bottom sheet / floating action button
- **Touch targets:** Minimum 44x44pt for all interactive elements
- **Gestures:** Pinch zoom, two-finger pan, tap select, long-press for context menu, swipe for undo
- **Properties panel:** Bottom sheet instead of side panel
- **AI chat:** Full-screen overlay or bottom sheet, not floating panel
- **Offline:** Cache board state locally, sync when reconnected
- **Same repo or different:** Share `src/lib/` (AI tools, templates, sync logic) as a package, separate `apps/mobile` for React Native
