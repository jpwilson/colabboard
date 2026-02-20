/**
 * LLM-as-Judge for eval scoring.
 *
 * Uses Claude Haiku to grade agent responses on quality criteria
 * that can't be checked programmatically.
 */

import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import type { EvalCase } from './dataset'

export interface JudgeScores {
  /** Did the agent do what was asked? (1-5) */
  correctness: number
  /** Did it use the minimum tool calls needed? (1-5) */
  efficiency: number
  /** For modify/delete: did it call getBoardState first? (0 or 1) */
  safety: number
  /** For ambiguous commands: did it ask a good follow-up? (0 or 1) */
  helpfulness: number
  /** Brief explanation of the scores */
  reasoning: string
}

const JUDGE_PROMPT = `You are an eval judge for an AI whiteboard assistant called "Orim".

You will receive:
- The user's command
- The test case description and expected behavior
- The tools the agent called
- The agent's text response

Score the agent on these criteria:

1. **correctness** (1-5): Did the agent accomplish what was asked?
   5 = perfectly correct, 4 = mostly correct with minor issues,
   3 = partially correct, 2 = mostly wrong, 1 = completely wrong

2. **efficiency** (1-5): Did it use the minimum necessary tool calls?
   5 = optimal, 4 = one extra call, 3 = a few unnecessary calls,
   2 = many unnecessary calls, 1 = wildly inefficient

3. **safety** (0 or 1): For commands that modify/delete existing objects,
   did the agent call getBoardState FIRST? If the command is creation-only
   (no existing objects needed), score 1.

4. **helpfulness** (0 or 1): For ambiguous commands, did the agent ask a
   clarifying question instead of guessing? For clear commands, did it
   respond helpfully? Score 1 for good behavior, 0 for bad.

Respond with ONLY a JSON object (no markdown, no explanation outside JSON):
{
  "correctness": <1-5>,
  "efficiency": <1-5>,
  "safety": <0-1>,
  "helpfulness": <0-1>,
  "reasoning": "<brief explanation>"
}`

export async function judgeResponse(
  evalCase: EvalCase,
  toolsCalled: string[],
  responseText: string,
): Promise<JudgeScores> {
  const input = `## User Command
"${evalCase.input}"

## Test Case
Name: ${evalCase.name}
Description: ${evalCase.description}
Command Type: ${evalCase.commandType}
Expected Tools: [${evalCase.expectedTools.join(', ')}]

## Agent Behavior
Tools Called: [${toolsCalled.join(', ')}]
Tool Call Count: ${toolsCalled.length}

## Agent Response
${responseText || '[no text response]'}`

  try {
    const result = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      system: JUDGE_PROMPT,
      prompt: input,
      maxOutputTokens: 300,
    })

    const parsed = JSON.parse(result.text) as JudgeScores
    return {
      correctness: clamp(parsed.correctness, 1, 5),
      efficiency: clamp(parsed.efficiency, 1, 5),
      safety: clamp(parsed.safety, 0, 1),
      helpfulness: clamp(parsed.helpfulness, 0, 1),
      reasoning: parsed.reasoning || '',
    }
  } catch {
    return {
      correctness: 0,
      efficiency: 0,
      safety: 0,
      helpfulness: 0,
      reasoning: 'Judge failed to produce valid scores',
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
