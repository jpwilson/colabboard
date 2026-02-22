/**
 * SVG generation service — creates vector illustrations via Claude.
 *
 * Called directly by AI tools (server-side), not through HTTP routes.
 * Uses Haiku for fast generation (~1-2s).
 */

import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

const SVG_SYSTEM_PROMPT = `You are an expert SVG artist. Generate clean, minimal SVG illustrations.

Rules:
- Use viewBox="0 0 200 200"
- Use 2-5 colors maximum
- Keep total SVG under 5KB
- Use simple shapes: rect, circle, ellipse, path, polygon, line
- No text elements, no embedded images, no filters, no animations
- No xmlns declaration (will be added)
- Output ONLY the <svg>...</svg> markup, no explanation`

export interface GenerateSvgResult {
  dataUrl: string
}

export async function generateSvg(
  concept: string,
  style?: string,
): Promise<GenerateSvgResult> {
  const prompt = style
    ? `Draw a ${concept} in ${style} style.`
    : `Draw a ${concept}.`

  console.log('[generateSvg] Starting SVG generation for:', concept)

  const result = await generateText({
    model: anthropic('claude-haiku-4-5-20251001'),
    system: SVG_SYSTEM_PROMPT,
    prompt,
    maxOutputTokens: 2000,
  })

  console.log('[generateSvg] Got response, length:', result.text.length)

  // Extract SVG from response (may be wrapped in markdown code blocks)
  let svg = result.text
  const svgMatch = svg.match(/<svg[\s\S]*?<\/svg>/)
  if (!svgMatch) {
    console.error('[generateSvg] No SVG found in response:', svg.slice(0, 200))
    throw new Error('No valid SVG found in AI response')
  }
  svg = svgMatch[0]

  // Ensure xmlns is present
  if (!svg.includes('xmlns')) {
    svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
  }

  // Convert to base64 data URL
  const base64 = Buffer.from(svg).toString('base64')
  const dataUrl = `data:image/svg+xml;base64,${base64}`

  console.log('[generateSvg] Success, SVG size:', svg.length, 'bytes')
  return { dataUrl }
}
