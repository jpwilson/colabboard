# AI Cost Analysis

## Development & Testing Costs

| Metric | Value |
|--------|-------|
| LLM API costs (dev/test) | ~$0.50 |
| Total tokens consumed | ~150,000 |
| Input tokens | ~120,000 |
| Output tokens | ~30,000 |
| Number of API calls | ~50 traces |
| Observability (Langfuse) | $0 (free tier) |
| Hosting (Vercel) | $0 (hobby plan) |
| Database (Supabase) | $0 (free tier) |

**Source:** Langfuse dashboard (us.cloud.langfuse.com), project "orim-ai-agent"

## Per-Command Token Usage

| Command Type | Avg Input Tokens | Avg Output Tokens | Avg Cost |
|-------------|-----------------|------------------|----------|
| Simple (sticky note, shape) | ~1,500 | ~200 | $0.005 |
| Template (SWOT, Kanban) | ~1,800 | ~1,200 | $0.012 |
| Complex (flowchart, timeline) | ~2,000 | ~1,500 | $0.015 |
| Read (summarize board) | ~2,500 | ~300 | $0.008 |
| Layout (arrange, distribute) | ~2,200 | ~800 | $0.010 |

**Model:** Claude Sonnet 4.5 via `@ai-sdk/anthropic`
**Pricing:** $3/M input tokens, $15/M output tokens

## Production Cost Projections

### Assumptions
- Average AI commands per user per session: 5
- Average sessions per user per month: 10
- Average tokens per command: ~2,000 input + ~600 output
- Commands are 60% simple, 25% template, 15% complex
- Weighted avg cost per command: ~$0.009

### Projections

| Scale | Monthly Commands | Monthly Cost | Notes |
|-------|-----------------|-------------|-------|
| 100 users | 5,000 | ~$45/month | Free tier covers most infra |
| 1,000 users | 50,000 | ~$450/month | Supabase Pro ($25), Vercel Pro ($20) |
| 10,000 users | 500,000 | ~$4,500/month | Need caching, rate limiting |
| 100,000 users | 5,000,000 | ~$45,000/month | Model cost dominates; consider prompt caching |

### Cost Breakdown at 1,000 Users

| Service | Monthly Cost |
|---------|-------------|
| Claude API (AI agent) | ~$450 |
| Supabase (Pro plan) | $25 |
| Vercel (Pro plan) | $20 |
| Langfuse (observability) | $0-$59 |
| **Total** | **~$495-$554/month** |

### Cost Optimization Strategies

1. **Prompt caching** — Anthropic supports prompt caching for system prompts. Our ~2KB system prompt is sent with every request. Caching reduces input token costs by ~90% for repeated prefixes.

2. **Model tiering** — Use Claude Haiku for simple commands (create sticky note, change color) and Sonnet for complex ones (SWOT, flowcharts). Haiku is ~10x cheaper.

3. **Rate limiting** — Cap AI commands per user per hour (e.g., 20/hr) to prevent abuse.

4. **Response caching** — Template commands (SWOT, Kanban) always produce similar output. Cache tool call results for identical prompts.

5. **Batch operations** — The `arrangeObjects` tool moves multiple objects in one LLM call instead of N separate `moveObject` calls.

### Budget Guard Rails

| Scale | Monthly Budget Cap | Alert Threshold |
|-------|-------------------|-----------------|
| MVP (100 users) | $100 | $75 |
| Growth (1,000 users) | $750 | $500 |
| Scale (10,000 users) | $7,500 | $5,000 |

Hard MVP budget cap from PreSearch doc: $450 total development spend. Actual dev spend: ~$0.50 (well under budget).
