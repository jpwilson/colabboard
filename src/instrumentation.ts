import { LangfuseSpanProcessor } from '@langfuse/otel'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'

export const langfuseSpanProcessor = new LangfuseSpanProcessor()

const tracerProvider = new NodeTracerProvider({
  spanProcessors: [langfuseSpanProcessor],
})

tracerProvider.register()
