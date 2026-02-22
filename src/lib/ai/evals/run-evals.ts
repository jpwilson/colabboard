#!/usr/bin/env npx tsx
/**
 * Eval runner for the Orim AI board agent.
 *
 * Runs each test case from the dataset against streamText,
 * scores the results programmatically, and posts to Langfuse.
 *
 * Usage:
 *   npx tsx src/lib/ai/evals/run-evals.ts              # Run all
 *   npx tsx src/lib/ai/evals/run-evals.ts simple-create # Run one
 *   npx tsx src/lib/ai/evals/run-evals.ts --judge       # Run all with LLM-as-Judge
 *   npx tsx src/lib/ai/evals/run-evals.ts simple-create --judge  # One + judge
 *
 * Requires env vars:
 *   ANTHROPIC_API_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (for board seeding)
 *   LANGFUSE_PUBLIC_KEY  (optional, for score posting)
 *   LANGFUSE_SECRET_KEY  (optional, for score posting)
 */

import { streamText, convertToModelMessages, stepCountIs } from 'ai'
import type { UIMessage } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createClient } from '@supabase/supabase-js'
import { EVAL_DATASET, type EvalCase } from './dataset'
import { buildSystemPrompt } from '../system-prompt'
import { aiTools } from '../tools'
import { postScores } from '../langfuse-scores'
import { judgeResponse, type JudgeScores } from './judge'

// ── Config ────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const MODEL = 'claude-sonnet-4-5'
const EVAL_BOARD_PREFIX = 'eval-board-'

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// ── Helpers ───────────────────────────────────────────────────────────

interface EvalResult {
  caseId: string
  caseName: string
  passed: boolean
  scores: Record<string, number>
  failures: string[]
  toolsCalled: string[]
  responseText: string
  latencyMs: number
  judgeScores?: JudgeScores
}

async function createEvalBoard(evalCase: EvalCase): Promise<string> {
  // Find a test user to own the board (or use a fixed eval user)
  const { data: users } = await supabase.auth.admin.listUsers()
  const evalUser = users?.users?.[0]
  if (!evalUser) throw new Error('No users found for eval board creation')

  const boardName = `${EVAL_BOARD_PREFIX}${evalCase.id}`

  // Clean up any existing eval board
  const { data: existingBoard } = await supabase
    .from('boards')
    .select('id')
    .eq('name', boardName)
    .single()

  if (existingBoard) {
    await supabase
      .from('board_objects')
      .delete()
      .eq('board_id', existingBoard.id)
    await supabase.from('boards').delete().eq('id', existingBoard.id)
  }

  // Create new eval board
  const { data: board, error } = await supabase
    .from('boards')
    .insert({ name: boardName, owner_id: evalUser.id, slug: '' } as Record<
      string,
      unknown
    >)
    .select('id')
    .single()

  if (error || !board) throw new Error(`Failed to create eval board: ${error?.message}`)

  // Seed objects if specified
  if (evalCase.seedObjects?.length) {
    const objects = evalCase.seedObjects.map((obj) => ({
      board_id: board.id,
      type: obj.type,
      x: obj.x,
      y: obj.y,
      width: obj.width,
      height: obj.height,
      data: {
        text: obj.text,
        fill: obj.fill ?? '#EAB308',
      },
      z_index: 0,
      created_by: evalUser.id,
    }))

    const { error: seedErr } = await supabase
      .from('board_objects')
      .insert(objects)

    if (seedErr) throw new Error(`Failed to seed objects: ${seedErr.message}`)
  }

  return board.id
}

async function cleanupEvalBoard(boardId: string): Promise<void> {
  await supabase.from('board_objects').delete().eq('board_id', boardId)
  await supabase.from('boards').delete().eq('id', boardId)
}

function buildUserMessage(text: string): UIMessage[] {
  return [
    {
      id: crypto.randomUUID(),
      role: 'user' as const,
      parts: [{ type: 'text' as const, text }],
    },
  ]
}

// ── Scoring ───────────────────────────────────────────────────────────

function scoreResult(
  evalCase: EvalCase,
  toolsCalled: string[],
  responseText: string,
): { passed: boolean; scores: Record<string, number>; failures: string[] } {
  const a = evalCase.assertions
  const failures: string[] = []
  const scores: Record<string, number> = {}

  // Tool call count checks
  if (a.minToolCalls !== undefined && toolsCalled.length < a.minToolCalls) {
    failures.push(
      `Expected >= ${a.minToolCalls} tool calls, got ${toolsCalled.length}`,
    )
  }
  if (a.maxToolCalls !== undefined && toolsCalled.length > a.maxToolCalls) {
    failures.push(
      `Expected <= ${a.maxToolCalls} tool calls, got ${toolsCalled.length}`,
    )
  }
  scores.tool_call_count = toolsCalled.length

  // Expected tools
  for (const tool of evalCase.expectedTools) {
    if (!toolsCalled.includes(tool)) {
      failures.push(`Expected tool "${tool}" was not called`)
    }
  }
  scores.expected_tools_called =
    evalCase.expectedTools.length === 0
      ? 1
      : evalCase.expectedTools.filter((t) => toolsCalled.includes(t)).length /
        evalCase.expectedTools.length

  // Forbidden tools
  if (evalCase.forbiddenTools) {
    for (const tool of evalCase.forbiddenTools) {
      if (toolsCalled.includes(tool)) {
        failures.push(`Forbidden tool "${tool}" was called`)
      }
    }
  }
  scores.no_forbidden_tools = evalCase.forbiddenTools
    ? evalCase.forbiddenTools.every((t) => !toolsCalled.includes(t))
      ? 1
      : 0
    : 1

  // getBoardState check
  if (a.shouldGetBoardState) {
    const gotIt = toolsCalled.includes('getBoardState')
    if (!gotIt) failures.push('Expected getBoardState to be called first')
    // Check it was called FIRST
    if (gotIt && toolsCalled[0] !== 'getBoardState') {
      failures.push('getBoardState should be called before other tools')
    }
    scores.got_board_state = gotIt ? 1 : 0
  }

  // Read-only check
  if (a.readOnly) {
    const mutatingTools = [
      'createStickyNote',
      'createShape',
      'createFrame',
      'createConnector',
      'moveObject',
      'resizeObject',
      'updateText',
      'changeColor',
      'deleteObject',
      'arrangeObjects',
    ]
    const mutated = toolsCalled.some((t) => mutatingTools.includes(t))
    if (mutated) failures.push('Expected read-only but board was mutated')
    scores.read_only_respected = mutated ? 0 : 1
  }

  // Object creation count
  const createTools = [
    'createStickyNote',
    'createShape',
    'createFrame',
    'createConnector',
  ]
  const created = toolsCalled.filter((t) => createTools.includes(t)).length
  if (a.minObjectsCreated !== undefined && created < a.minObjectsCreated) {
    failures.push(
      `Expected >= ${a.minObjectsCreated} objects created, got ${created}`,
    )
  }
  scores.objects_created = created

  // Response text checks
  if (a.responseContains) {
    for (const substring of a.responseContains) {
      if (!responseText.toLowerCase().includes(substring.toLowerCase())) {
        failures.push(`Response should contain "${substring}"`)
      }
    }
  }

  // Follow-up question check
  if (a.shouldAskFollowUp) {
    const hasQuestion = responseText.includes('?')
    if (!hasQuestion) failures.push('Expected follow-up question')
    scores.asked_followup = hasQuestion ? 1 : 0
  }

  const passed = failures.length === 0
  scores.passed = passed ? 1 : 0

  return { passed, scores, failures }
}

// ── Runner ────────────────────────────────────────────────────────────

async function runEvalCase(evalCase: EvalCase): Promise<EvalResult> {
  const startTime = Date.now()
  let boardId: string | null = null

  try {
    // Create and seed the eval board
    boardId = await createEvalBoard(evalCase)

    // Build messages
    const messages = buildUserMessage(evalCase.input)

    // Run the agent
    const result = streamText({
      model: anthropic(MODEL),
      system: buildSystemPrompt(boardId, false),
      messages: await convertToModelMessages(messages),
      tools: aiTools(boardId, supabase),
      stopWhen: stepCountIs(10),
    })

    // Collect results
    const steps = await result.steps
    const text = await result.text

    const toolsCalled = steps.flatMap(
      (s: { toolCalls?: Array<{ toolName: string }> }) =>
        (s.toolCalls ?? []).map((tc) => tc.toolName),
    )

    const latencyMs = Date.now() - startTime

    // Score
    const { passed, scores, failures } = scoreResult(
      evalCase,
      toolsCalled,
      text,
    )
    scores.latency_ms = latencyMs

    return {
      caseId: evalCase.id,
      caseName: evalCase.name,
      passed,
      scores,
      failures,
      toolsCalled,
      responseText: text,
      latencyMs,
    }
  } catch (err) {
    const latencyMs = Date.now() - startTime
    return {
      caseId: evalCase.id,
      caseName: evalCase.name,
      passed: false,
      scores: { passed: 0, error: 1, latency_ms: latencyMs },
      failures: [`Error: ${err instanceof Error ? err.message : String(err)}`],
      toolsCalled: [],
      responseText: '',
      latencyMs,
    }
  } finally {
    if (boardId) await cleanupEvalBoard(boardId).catch(() => {})
  }
}

async function postResultToLangfuse(result: EvalResult): Promise<void> {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY
  const secretKey = process.env.LANGFUSE_SECRET_KEY
  const baseUrl =
    process.env.LANGFUSE_BASE_URL || 'https://us.cloud.langfuse.com'

  if (!publicKey || !secretKey) return

  const auth = `Basic ${Buffer.from(`${publicKey}:${secretKey}`).toString('base64')}`

  // Create a trace for this eval run
  const traceRes = await fetch(`${baseUrl}/api/public/ingestion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify({
      batch: [
        {
          id: crypto.randomUUID(),
          type: 'trace-create',
          timestamp: new Date().toISOString(),
          body: {
            id: crypto.randomUUID(),
            name: `eval:${result.caseId}`,
            input: result.caseId,
            output: result.responseText || '[no response]',
            tags: [
              'eval',
              `eval:${result.passed ? 'pass' : 'fail'}`,
              `case:${result.caseId}`,
            ],
            metadata: {
              caseName: result.caseName,
              toolsCalled: result.toolsCalled,
              failures: result.failures,
              latencyMs: result.latencyMs,
            },
          },
        },
      ],
    }),
  }).catch(() => null)

  // Also post numeric scores if we have a traceId
  if (traceRes?.ok) {
    const traceData = await traceRes.json().catch(() => null)
    // The ingestion API returns successes array
    const traceId =
      traceData?.successes?.[0]?.id ??
      traceData?.batch?.[0]?.body?.id

    if (traceId) {
      await postScores(
        traceId,
        Object.fromEntries(
          Object.entries(result.scores).filter(
            ([, v]) => typeof v === 'number',
          ),
        ),
      )
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const useJudge = args.includes('--judge')
  const filterArg = args.find((a) => !a.startsWith('--'))

  const cases = filterArg
    ? EVAL_DATASET.filter((c) => c.id === filterArg)
    : EVAL_DATASET

  if (cases.length === 0) {
    console.error(`No eval case found with id: ${filterArg}`)
    console.error(
      'Available:',
      EVAL_DATASET.map((c) => c.id).join(', '),
    )
    process.exit(1)
  }

  console.log(`\nRunning ${cases.length} eval case(s)${useJudge ? ' with LLM-as-Judge' : ''}...\n`)
  console.log('─'.repeat(60))

  const results: EvalResult[] = []
  let passCount = 0

  for (const evalCase of cases) {
    process.stdout.write(`  ${evalCase.name}...`)

    const result = await runEvalCase(evalCase)

    // Optionally run LLM-as-Judge
    if (useJudge && result.toolsCalled.length > 0) {
      process.stdout.write(' judging...')
      const judge = await judgeResponse(
        evalCase,
        result.toolsCalled,
        result.responseText,
      )
      result.judgeScores = judge
      result.scores.judge_correctness = judge.correctness
      result.scores.judge_efficiency = judge.efficiency
      result.scores.judge_safety = judge.safety
      result.scores.judge_helpfulness = judge.helpfulness
    }

    results.push(result)

    if (result.passed) {
      passCount++
      console.log(` PASS (${result.latencyMs}ms)`)
    } else {
      console.log(` FAIL (${result.latencyMs}ms)`)
      for (const f of result.failures) {
        console.log(`    - ${f}`)
      }
    }

    console.log(`    Tools: [${result.toolsCalled.join(', ')}]`)
    if (result.judgeScores) {
      const j = result.judgeScores
      console.log(
        `    Judge: correctness=${j.correctness}/5 efficiency=${j.efficiency}/5 safety=${j.safety} helpfulness=${j.helpfulness}`,
      )
      console.log(`    Reasoning: ${j.reasoning}`)
    }

    // Post to Langfuse
    await postResultToLangfuse(result)
  }

  console.log('─'.repeat(60))
  console.log(
    `\nResults: ${passCount}/${results.length} passed (${Math.round((passCount / results.length) * 100)}%)\n`,
  )

  // Summary table
  const header = useJudge
    ? 'Case ID              | Pass | Tools | Latency  | Correct | Efficient'
    : 'Case ID              | Pass | Tools | Latency'
  console.log(header)
  console.log('─'.repeat(useJudge ? 75 : 55))
  for (const r of results) {
    const status = r.passed ? 'PASS' : 'FAIL'
    const base = `${r.caseId.padEnd(20)} | ${status} | ${String(r.toolsCalled.length).padStart(5)} | ${String(r.latencyMs).padStart(6)}ms`
    if (useJudge && r.judgeScores) {
      console.log(
        `${base} | ${r.judgeScores.correctness}/5     | ${r.judgeScores.efficiency}/5`,
      )
    } else {
      console.log(base)
    }
  }

  // Exit with failure if any cases failed
  if (passCount < results.length) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
