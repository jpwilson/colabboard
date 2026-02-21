/**
 * Classifies a user message into a command category for Langfuse tagging.
 */
import { getAllTemplateNames } from '@/lib/ai/template-registry'

export type CommandType =
  | 'create'
  | 'template'
  | 'layout'
  | 'modify'
  | 'delete'
  | 'query'
  | 'ambiguous'

// Build template regex dynamically from registry
const templatePattern = getAllTemplateNames()
  .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '.?'))
  .join('|')
const templateRegex = new RegExp(`\\b(${templatePattern}|template|retro)\\b`, 'i')

const patterns: Array<{ type: CommandType; regex: RegExp }> = [
  // Templates (check before create — "create a SWOT" is a template)
  {
    type: 'template',
    regex: templateRegex,
  },
  // Delete
  { type: 'delete', regex: /\b(delete|remove|clear|erase|get rid of)\b/i },
  // Layout / arrange
  {
    type: 'layout',
    regex: /\b(arrange|grid|organize|align|layout|sort|group|spread)\b/i,
  },
  // Query / read
  {
    type: 'query',
    regex:
      /\b(what('s| is)|how many|list|show me|describe|count|tell me about)\b/i,
  },
  // Modify (color, size, text, move)
  {
    type: 'modify',
    regex:
      /\b(change|update|modify|resize|make .*(larger|smaller|bigger|green|blue|red|yellow|pink|purple)|move|rename|recolor|edit)\b/i,
  },
  // Create
  {
    type: 'create',
    regex: /\b(add|create|make|put|place|insert|draw|new|build|generate)\b/i,
  },
]

export function classifyCommand(message: string): CommandType {
  for (const { type, regex } of patterns) {
    if (regex.test(message)) {
      return type
    }
  }
  return 'ambiguous'
}
