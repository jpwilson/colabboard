export interface ChangelogEntry {
  date: string
  title: string
  description: string
  tag: 'feature' | 'fix' | 'infra' | 'docs'
}

export const CHANGELOG: ChangelogEntry[] = [
  // Newest first
  {
    date: '2026-02-22',
    title: 'AI Drawing with SketchAgent + perfect-freehand',
    description:
      'Integrated MIT CSAIL\'s SketchAgent approach to generate recognizable hand-drawn sketches from text prompts ("draw a horse", "sketch a sailboat"). Added perfect-freehand library for pressure-sensitive, tapered stroke rendering. New Drawing Tools section in AI panel with domain-specific drawing prompts. Fixed domain strip label truncation by stacking text below icons.',
    tag: 'feature',
  },
  {
    date: '2026-02-21',
    title: 'Bold Color Palette & Vertical Domain Strip',
    description:
      'Replaced pastel sticky note colors with bold vivid palette (Golden, Electric Blue, Crimson, Emerald, Hot Orange, Royal Purple, Magenta, Teal). Added dynamic text contrast for readability on dark backgrounds. Moved domain selectors to vertical strip on right edge of AI panel. Replaced tab-based suggestions with always-expanded accordion.',
    tag: 'feature',
  },
  {
    date: '2026-02-21',
    title: 'Analytics Refactor, Domain Packs & GDPR Banner',
    description:
      'Refactored admin analytics to use direct Langfuse API for accurate cost and latency metrics. Added 6 domain template packs (General, Business, Product, Engineering, Education, Science) with domain-specific templates, edit prompts, and layout prompts. Added GDPR-compliant cookie consent banner.',
    tag: 'feature',
  },
  {
    date: '2026-02-20',
    title: 'AI Panel UX Overhaul',
    description:
      'Auto-centers AI panel on open with smart positioning. Resizable panel with drag handles. Follow-up suggestions after AI actions. Concise/verbose mode toggle. Gold accent theme. System prompt improvements for better template placement.',
    tag: 'feature',
  },
  {
    date: '2026-02-19',
    title: 'Admin Portal — Users, Boards & Sortable Tables',
    description:
      'Added admin users page with sortable columns, superuser toggle (with self-protection), and last active timestamps. Admin boards overview. Refined admin button styling. Central Time display for user activity.',
    tag: 'feature',
  },
  {
    date: '2026-02-18',
    title: 'AI Cost Analysis & Production Projections',
    description:
      'Added cost analysis dashboard showing token usage, model costs, per-user consumption, and daily trends. Production projections estimating costs at 100/1K/10K/100K user scales with optimization recommendations.',
    tag: 'feature',
  },
  {
    date: '2026-02-17',
    title: 'UX Polish — Admin Links, Sharing Info, Dark Mode, Undo/Redo',
    description:
      'Added admin panel quick links on dashboard. Board sharing information display. Dark mode support. Undo/redo for AI actions. AI hub with template suggestions. Verbose/concise response toggle.',
    tag: 'feature',
  },
  {
    date: '2026-02-16',
    title: 'Standalone Text Elements',
    description:
      'Added text type as a first-class board object — standalone labels, headings, and annotations without colored backgrounds. AI createText tool. Double-click editing with font size control.',
    tag: 'feature',
  },
  {
    date: '2026-02-15',
    title: 'Multi-Select & Group Operations',
    description:
      'Shift-click and marquee (rubber-band) selection for selecting multiple objects. Group move, resize, delete, and color change operations. Multi-object transformer.',
    tag: 'feature',
  },
  {
    date: '2026-02-15',
    title: 'Connection Resilience',
    description:
      'Added disconnect/reconnect handling with visual connection status indicator. Automatic retry on network interruption. Graceful degradation when Supabase Realtime is unavailable.',
    tag: 'feature',
  },
  {
    date: '2026-02-14',
    title: 'AI Agent — 11 Tools, Templates, Langfuse Observability',
    description:
      'Launched AI board assistant with 11 tools (create sticky notes, shapes, connectors, text, freedraw; move, resize, recolor, delete objects; arrange layouts; read board state). 8 built-in templates. Langfuse integration for tracing and cost monitoring. Eval framework with programmatic + LLM-as-Judge scoring.',
    tag: 'feature',
  },
  {
    date: '2026-02-13',
    title: 'Admin Panel & Agent Configuration',
    description:
      'Superuser-only admin portal with overview dashboard, agent backend selector (Vercel AI SDK vs Docker/Python), model picker, and health checks. App config stored in Supabase.',
    tag: 'feature',
  },
  {
    date: '2026-02-12',
    title: 'Enhanced Drawing Tools',
    description:
      'Added 15 shape types (rectangle, rounded rectangle, circle, ellipse, triangle, diamond, star, hexagon, pentagon, arrow, line, and more). Properties panel for color, stroke, opacity, font. Freedraw tool with smooth curves. Connectors between objects.',
    tag: 'feature',
  },
  {
    date: '2026-02-11',
    title: 'Board Sharing & Magic Link Auth',
    description:
      'Share boards via invite link with role-based access (owner, editor, viewer). Magic link passwordless authentication as default sign-in method. Email + password still available.',
    tag: 'feature',
  },
  {
    date: '2026-02-10',
    title: 'Unified Branding & Dashboard Redesign',
    description:
      'New Orim branding with robot mascot. Redesigned dashboard with board cards, member avatars, and quick actions. Split sign-in layout with illustration.',
    tag: 'feature',
  },
  {
    date: '2026-02-09',
    title: 'MVP Polish',
    description:
      'Fixed cursor lag with world-coordinate tracking. Added zoom controls (+/-/fit). Board rename in-place. Grid toggle. Auto-fit to content on board load. Cursor interpolation for smoother remote movement.',
    tag: 'fix',
  },
  {
    date: '2026-02-08',
    title: 'Landing Page',
    description:
      'Added landing page with glassmorphism design, feature highlights, and call-to-action. Fixed login page theme consistency.',
    tag: 'feature',
  },
  {
    date: '2026-02-07',
    title: 'Dashboard Polish',
    description:
      'Polished dashboard UI with board previews and improved navigation. Added window resize handler for responsive layout. Debounced New Board button to prevent duplicates.',
    tag: 'feature',
  },
  {
    date: '2026-02-06',
    title: 'Real-Time Object Sync',
    description:
      'Three-layer sync: Supabase Broadcast for instant updates, Postgres for persistence, Postgres Changes for catch-up. Last-Write-Wins conflict resolution via updated_at timestamps.',
    tag: 'feature',
  },
  {
    date: '2026-02-05',
    title: 'Real-Time Cursor Sync',
    description:
      'Live cursor tracking using Supabase Realtime Presence. See other users\' cursors in real-time with name labels and smooth movement. Throttled at 50ms for performance.',
    tag: 'feature',
  },
  {
    date: '2026-02-04',
    title: 'Performance Benchmarks',
    description:
      'Added Vitest bench framework for canvas operations. Benchmarks for object creation, rendering, and sync operations. CI integration for performance regression detection.',
    tag: 'infra',
  },
  {
    date: '2026-02-03',
    title: 'Authentication System',
    description:
      'Email/password and Google/GitHub OAuth via Supabase Auth. Login page, protected routes, session management with Next.js 16 proxy pattern. Dashboard and board routes with auth guards.',
    tag: 'feature',
  },
  {
    date: '2026-02-02',
    title: 'Interactive Canvas',
    description:
      'Built the core canvas with react-konva — infinite pan/zoom, sticky notes, rectangle shapes, drag-to-move, resize transforms, and text editing via HTML textarea overlay.',
    tag: 'feature',
  },
  {
    date: '2026-02-01',
    title: 'Project Bootstrap',
    description:
      'Initialized Next.js 16 with TypeScript, Tailwind CSS v4, App Router. Configured Vitest, Playwright, ESLint flat config, Prettier. Set up Supabase SSR clients and CI pipeline with GitHub Actions.',
    tag: 'infra',
  },
]
