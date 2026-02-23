/**
 * Image generation service — creates raster images via OpenAI DALL-E 3.
 *
 * Called directly by AI tools (server-side), not through HTTP routes.
 * Requires OPENAI_API_KEY environment variable.
 */

const MAX_BASE64_SIZE = 300 * 1024 // 300KB hard cap

export interface GenerateImageResult {
  dataUrl: string
}

export async function generateImage(
  prompt: string,
): Promise<GenerateImageResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY is not set. Image generation requires an OpenAI API key.',
    )
  }

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
      quality: 'standard',
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error')
    throw new Error(`DALL-E API error (${response.status}): ${errorBody}`)
  }

  const data = (await response.json()) as {
    data: Array<{ b64_json: string }>
  }

  const b64 = data.data?.[0]?.b64_json
  if (!b64) {
    throw new Error('No image data returned from DALL-E API')
  }

  // Hard size cap — fail fast rather than bloat DB/broadcast
  if (b64.length > MAX_BASE64_SIZE) {
    throw new Error(
      `Generated image exceeds size limit (${Math.round(b64.length / 1024)}KB > ${MAX_BASE64_SIZE / 1024}KB)`,
    )
  }

  const dataUrl = `data:image/png;base64,${b64}`
  return { dataUrl }
}
