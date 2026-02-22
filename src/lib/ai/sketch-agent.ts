/**
 * SketchAgent — AI drawing via MIT CSAIL's sketching language.
 *
 * Adapts the SketchAgent approach (https://github.com/yael-vinker/SketchAgent)
 * to generate recognizable hand-drawn sketches on a Konva canvas.
 *
 * Pipeline: text prompt → Claude (50x50 grid coords) → Bezier fit → Konva points
 */

import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

// ── Grid config ──────────────────────────────────────────────────────────

const GRID_RES = 50

// ── System prompt (adapted from MIT SketchAgent prompts.py) ──────────────

const SKETCH_SYSTEM_PROMPT = `You are an expert artist specializing in drawing sketches that are visually appealing, expressive, and professional.
You will be provided with a blank grid. Your task is to specify where to place strokes on the grid to create a visually appealing sketch of the given textual concept.
The grid uses numbers (1 to ${GRID_RES}) along the bottom (x axis) and numbers (1 to ${GRID_RES}) along the left edge (y axis) to reference specific locations within the grid. Each cell is uniquely identified by a combination of the corresponding x axis numbers and y axis number (e.g., the bottom-left cell is 'x1y1', the cell to its right is 'x2y1').
You can draw on this grid by specifying where to draw strokes. You can draw multiple strokes to depict the whole object, where different strokes compose different parts of the object.
To draw a stroke on the grid, you need to specify the following:
Starting Point: Specify the starting point by giving the grid location (e.g., 'x1y1' for column 1, row 1).
Ending Point: Specify the ending point in the same way (e.g., 'x${GRID_RES}y${GRID_RES}' for column ${GRID_RES}, row ${GRID_RES}).
Intermediate Points: Specify at least two intermediate points that the stroke should pass through.
Parameter Values (t): For each point, specify a t value between 0 and 1 that defines the position along the stroke's path. t=0 for the starting point. t=1 for the ending point.
Examples:
To draw a smooth curve: Points = ['x8y6', 'x6y7', 'x6y10', 'x8y11'], t_values = [0.00,0.30,0.80,1.00]
To draw a large circle: Points = ['x25y44', 'x32y41', 'x35y35', 'x31y29', 'x25y27', 'x19y29', 'x15y35', 'x18y41', 'x25y44'], t_values = [0.00, 0.125, 0.25, 0.375, 0.50, 0.625, 0.75, 0.875, 1.00]
To draw corners (non-smooth), repeat the corner point with adjacent t values.
To draw a straight line: Points = ['x18y31', 'x35y14'], t_values = [0.00, 1.00]
To draw a single dot: Points = ['x15y31'], t_values = [0.00]
If you want to draw a big stroke, split it into multiple small curves.
Break down complex drawings into manageable steps. Begin with the most important part, then add detail.`

const SKETCH_USER_PROMPT = `I provide you with a blank grid. Your goal is to produce a visually appealing sketch of a {concept}.

Here is an example of a house:
<example>
<concept>House</concept>
<strokes>
    <s1>
        <points>'x13y27', 'x24y27', 'x24y27', 'x24y11', 'x24y11', 'x13y11', 'x13y11', 'x13y27'</points>
        <t_values>0.00,0.3,0.25,0.5,0.5,0.75,0.75,1.00</t_values>
        <id>house base rectangle</id>
    </s1>
    <s2>
        <points>'x13y27', 'x18y37','x18y37', 'x24y27'</points>
        <t_values>0.00,0.55,0.5,1.00</t_values>
        <id>roof triangle</id>
    </s2>
    <s3>
        <points>'x16y25', 'x19y25', 'x19y25', 'x19y21', 'x19y21', 'x16y21', 'x16y21', 'x16y25'</points>
        <t_values>0.00,0.3,0.25,0.5,0.5,0.75,0.75,1.00</t_values>
        <id>window</id>
    </s3>
    <s4>
        <points>'x20y11', 'x22y11', 'x22y11', 'x22y16', 'x22y16', 'x20y16', 'x20y16', 'x20y11'</points>
        <t_values>0.00,0.3,0.25,0.5,0.5,0.75,0.75,1.00</t_values>
        <id>door</id>
    </s4>
</strokes>
</example>

Now draw a {concept}. Think step-by-step about what parts to draw and where.

Provide your response in this format:
<answer>
<concept>The concept</concept>
<strokes>
    <s1>
        <points>coordinate list</points>
        <t_values>t value list</t_values>
        <id>description</id>
    </s1>
    ...more strokes...
</strokes>
</answer>`

// ── Parsing ──────────────────────────────────────────────────────────────

interface ParsedStroke {
  points: string[] // e.g. ['x13y27', 'x24y27']
  tValues: number[]
  id: string
}

/** Parse SketchAgent XML response into stroke data */
export function parseSketchResponse(text: string): ParsedStroke[] {
  const strokesMatch = text.match(/<strokes>([\s\S]*?)<\/strokes>/)
  if (!strokesMatch) return []

  const strokesXml = strokesMatch[1]
  const strokes: ParsedStroke[] = []

  // Match each <sN>...</sN> block
  const strokeRegex = /<s(\d+)>\s*<points>([\s\S]*?)<\/points>\s*<t_values>([\s\S]*?)<\/t_values>\s*<id>([\s\S]*?)<\/id>\s*<\/s\1>/g
  let match
  while ((match = strokeRegex.exec(strokesXml)) !== null) {
    const pointsStr = match[2].trim()
    const tValuesStr = match[3].trim()
    const id = match[4].trim()

    // Parse points: 'x13y27', 'x24y27' → ['x13y27', 'x24y27']
    const points = pointsStr
      .split(',')
      .map((p) => p.trim().replace(/'/g, ''))
      .filter((p) => /^x\d+y\d+$/.test(p))

    // Parse t_values: 0.00, 0.30, 0.80, 1.00 → [0, 0.3, 0.8, 1]
    const tValues = tValuesStr
      .split(',')
      .map((t) => parseFloat(t.trim()))
      .filter((t) => !isNaN(t))

    if (points.length > 0 && tValues.length > 0) {
      // Clamp grid coordinates to [1, GRID_RES]
      const clampedPoints = points.map((p) => {
        const m = p.match(/^x(\d+)y(\d+)$/)
        if (!m) return p
        const cx = Math.max(1, Math.min(GRID_RES, parseInt(m[1])))
        const cy = Math.max(1, Math.min(GRID_RES, parseInt(m[2])))
        return `x${cx}y${cy}`
      })
      strokes.push({ points: clampedPoints, tValues, id })
    }
  }

  return strokes
}

// ── Coordinate mapping ───────────────────────────────────────────────────

/** Map grid coordinate to pixel position, flipping Y for canvas (y=0 at top) */
export function gridToPixels(
  coord: string,
  canvasW: number,
  canvasH: number,
): [number, number] {
  const m = coord.match(/^x(\d+)y(\d+)$/)
  if (!m) return [0, 0]
  const gx = parseInt(m[1])
  const gy = parseInt(m[2])
  // Map grid [1..50] to pixel [0..canvasW/H], flip Y
  const px = ((gx - 0.5) / GRID_RES) * canvasW
  const py = ((GRID_RES - gy + 0.5) / GRID_RES) * canvasH // flip Y
  return [px, py]
}

// ── Bezier fitting ───────────────────────────────────────────────────────

type Point = [number, number]

/** Evaluate cubic Bezier at parameter t */
function bezierPoint(P: Point[], t: number): Point {
  if (P.length === 2) {
    // Linear
    return [P[0][0] + t * (P[1][0] - P[0][0]), P[0][1] + t * (P[1][1] - P[0][1])]
  }
  if (P.length === 3) {
    // Quadratic
    const u = 1 - t
    return [
      u * u * P[0][0] + 2 * u * t * P[1][0] + t * t * P[2][0],
      u * u * P[0][1] + 2 * u * t * P[1][1] + t * t * P[2][1],
    ]
  }
  // Cubic
  const u = 1 - t
  return [
    u * u * u * P[0][0] + 3 * u * u * t * P[1][0] + 3 * u * t * t * P[2][0] + t * t * t * P[3][0],
    u * u * u * P[0][1] + 3 * u * u * t * P[1][1] + 3 * u * t * t * P[2][1] + t * t * t * P[3][1],
  ]
}

/**
 * Solve least-squares Bezier fit: A * P = B
 * Returns control points for the best-fit Bezier curve.
 */
function fitBezierControlPoints(
  sampledPoints: Point[],
  tValues: number[],
): Point[] {
  const n = sampledPoints.length

  if (n === 1) {
    // Single dot
    return [sampledPoints[0], [sampledPoints[0][0] + 0.1, sampledPoints[0][1] + 0.1]]
  }
  if (n === 2) {
    return sampledPoints
  }
  if (n === 3) {
    // Quadratic: 3 control points
    // Build 3x3 matrix and solve
    const A: number[][] = tValues.map((t) => {
      const u = 1 - t
      return [u * u, 2 * u * t, t * t]
    })
    return solveLS(A, sampledPoints)
  }

  // Cubic: 4 control points
  const A: number[][] = tValues.map((t) => {
    const u = 1 - t
    return [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t]
  })
  return solveLS(A, sampledPoints)
}

/** Solve A * X = B via normal equations: X = (A^T A)^-1 A^T B */
function solveLS(A: number[][], B: Point[]): Point[] {
  const m = A.length
  const n = A[0].length

  // A^T A (n×n)
  const AtA: number[][] = Array.from({ length: n }, () => Array(n).fill(0))
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < m; k++) {
        AtA[i][j] += A[k][i] * A[k][j]
      }
    }
  }

  // A^T B (n×2)
  const AtBx: number[] = Array(n).fill(0)
  const AtBy: number[] = Array(n).fill(0)
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < m; k++) {
      AtBx[i] += A[k][i] * B[k][0]
      AtBy[i] += A[k][i] * B[k][1]
    }
  }

  // Solve via Gaussian elimination
  const solveGauss = (M: number[][], rhs: number[]): number[] => {
    const sz = M.length
    const aug = M.map((row, i) => [...row, rhs[i]])

    for (let col = 0; col < sz; col++) {
      // Partial pivoting
      let maxRow = col
      for (let row = col + 1; row < sz; row++) {
        if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row
      }
      ;[aug[col], aug[maxRow]] = [aug[maxRow], aug[col]]

      if (Math.abs(aug[col][col]) < 1e-12) continue

      for (let row = col + 1; row < sz; row++) {
        const factor = aug[row][col] / aug[col][col]
        for (let j = col; j <= sz; j++) {
          aug[row][j] -= factor * aug[col][j]
        }
      }
    }

    const result = Array(sz).fill(0)
    for (let i = sz - 1; i >= 0; i--) {
      let sum = aug[i][sz]
      for (let j = i + 1; j < sz; j++) {
        sum -= aug[i][j] * result[j]
      }
      result[i] = Math.abs(aug[i][i]) > 1e-12 ? sum / aug[i][i] : 0
    }
    return result
  }

  const xCoords = solveGauss(
    AtA.map((r) => [...r]),
    [...AtBx],
  )
  const yCoords = solveGauss(
    AtA.map((r) => [...r]),
    [...AtBy],
  )

  return xCoords.map((x, i) => [x, yCoords[i]] as Point)
}

/**
 * Fit Bezier curve(s) to sampled points with recursive splitting.
 * Returns an array of control-point arrays (1 or 2 segments).
 */
export function fitBezier(
  sampledPoints: Point[],
  tValues: number[],
): Point[][] {
  // Ensure tValues length matches
  const tv =
    tValues.length === sampledPoints.length
      ? tValues
      : sampledPoints.map((_, i) => i / Math.max(sampledPoints.length - 1, 1))

  const P = fitBezierControlPoints(sampledPoints, tv)

  // Check fit quality for long strokes
  if (sampledPoints.length > 4) {
    let totalError = 0
    for (let i = 0; i < sampledPoints.length; i++) {
      const Bt = bezierPoint(P, tv[i])
      const dx = Bt[0] - sampledPoints[i][0]
      const dy = Bt[1] - sampledPoints[i][1]
      totalError += Math.sqrt(dx * dx + dy * dy)
    }
    const meanError = totalError / sampledPoints.length

    // Split if error too large and enough points
    if (meanError > 5 && sampledPoints.length >= 7) {
      const mid = Math.floor(sampledPoints.length / 2)
      const leftPts = sampledPoints.slice(0, mid + 1)
      const rightPts = sampledPoints.slice(mid)

      // Normalize t-values for each half
      const leftTv = tv.slice(0, mid + 1)
      const rightTv = tv.slice(mid)
      const normT = (arr: number[]) => {
        const min = arr[0]
        const range = arr[arr.length - 1] - min
        return range > 0 ? arr.map((t) => (t - min) / range) : arr.map((_, i) => i / Math.max(arr.length - 1, 1))
      }

      const leftCP = fitBezierControlPoints(leftPts, normT(leftTv))
      const rightCP = fitBezierControlPoints(rightPts, normT(rightTv))
      // Ensure continuity
      rightCP[0] = leftCP[leftCP.length - 1]
      return [leftCP, rightCP]
    }
  }

  return [P]
}

/** Sample a Bezier curve at N uniform intervals → flat [x,y,...] array */
export function sampleBezier(controlPoints: Point[], numSamples: number = 30): number[] {
  const result: number[] = []
  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples
    const [x, y] = bezierPoint(controlPoints, t)
    result.push(x, y)
  }
  return result
}

// ── Main orchestrator ────────────────────────────────────────────────────

interface FreedrawObject {
  id: string
  type: 'freedraw'
  x: number
  y: number
  width: number
  height: number
  fill: string
  stroke: string
  strokeWidth: number
  points: number[]
  z_index: number
  updated_at: string
}

/**
 * Generate a sketch of a concept using the SketchAgent approach.
 * Returns an array of freedraw objects (one per stroke).
 */
export async function generateSketch(
  concept: string,
  targetX: number,
  targetY: number,
  targetWidth: number,
  targetHeight: number,
): Promise<FreedrawObject[]> {
  // Call Claude with SketchAgent prompt
  const prompt = SKETCH_USER_PROMPT.replace(/\{concept\}/g, concept)

  const result = await generateText({
    model: anthropic('claude-sonnet-4-5-20250514'),
    system: SKETCH_SYSTEM_PROMPT,
    prompt,
    maxOutputTokens: 4000,
    stopSequences: ['</answer>'],
  })

  const responseText = result.text + '</answer>'

  // Parse strokes
  const strokes = parseSketchResponse(responseText)
  if (strokes.length === 0) {
    return []
  }

  // Convert each stroke to a freedraw object
  const objects: FreedrawObject[] = []

  for (const stroke of strokes) {
    // Map grid coordinates to pixel positions in target area
    const pixelPoints: Point[] = stroke.points.map((coord) =>
      gridToPixels(coord, targetWidth, targetHeight),
    )

    // Fit Bezier curves
    const segments = fitBezier(pixelPoints, stroke.tValues)

    // Sample all segments into a single point array
    const allPoints: number[] = []
    for (const seg of segments) {
      const sampled = sampleBezier(seg, 30)
      // Skip first point of subsequent segments (overlap with previous)
      const start = allPoints.length > 0 ? 2 : 0
      for (let i = start; i < sampled.length; i++) {
        allPoints.push(sampled[i])
      }
    }

    if (allPoints.length < 4) continue

    // Compute bounding box of this stroke
    const xs = allPoints.filter((_, i) => i % 2 === 0)
    const ys = allPoints.filter((_, i) => i % 2 === 1)
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    const maxX = Math.max(...xs)
    const maxY = Math.max(...ys)

    // Normalize points relative to bounding box top-left
    const normalizedPoints = allPoints.map((val, i) =>
      i % 2 === 0 ? val - minX : val - minY,
    )

    objects.push({
      id: crypto.randomUUID(),
      type: 'freedraw',
      x: targetX + minX,
      y: targetY + minY,
      width: Math.max(maxX - minX, 1),
      height: Math.max(maxY - minY, 1),
      fill: 'transparent',
      stroke: '#1f2937',
      strokeWidth: 3,
      points: normalizedPoints,
      z_index: 0,
      updated_at: new Date().toISOString(),
    })
  }

  return objects
}
