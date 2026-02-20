import { LangfuseSpanProcessor } from '@langfuse/otel'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'

export const langfuseSpanProcessor = new LangfuseSpanProcessor({
  // Only export AI-related spans to Langfuse — filter out noisy page loads
  shouldExportSpan: ({ otelSpan }) => {
    const spanName = otelSpan.name
    // Keep: AI chat requests, streamText calls, tool calls, Langfuse-created spans
    if (spanName.includes('ai.') || spanName.includes('ai-chat')) return true
    if (spanName.includes('/api/ai/')) return true
    if (spanName.includes('langfuse')) return true
    // Keep spans from @langfuse/tracing (observe wrapper)
    const attrs = otelSpan.attributes
    if (attrs?.['next.route'] === '/api/ai/chat') return true
    // Drop everything else (RSC page loads, static assets, etc.)
    return false
  },
})

const tracerProvider = new NodeTracerProvider({
  spanProcessors: [langfuseSpanProcessor],
})

tracerProvider.register()
