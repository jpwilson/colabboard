/**
 * Eval dataset for the Orim AI board agent.
 *
 * Each test case defines:
 * - input: the user message
 * - expectedTools: tool names that SHOULD be called
 * - forbiddenTools: tool names that should NOT be called
 * - assertions: programmatic checks on the agent's behavior
 */

export interface EvalAssertion {
  /** Minimum number of tool calls expected */
  minToolCalls?: number
  /** Maximum number of tool calls expected */
  maxToolCalls?: number
  /** Agent should call getBoardState before acting */
  shouldGetBoardState?: boolean
  /** Agent should NOT modify the board (query-only) */
  readOnly?: boolean
  /** Minimum number of objects the agent should create */
  minObjectsCreated?: number
  /** Expected object types to be created */
  expectedObjectTypes?: string[]
  /** Agent should ask a follow-up question (ambiguous input) */
  shouldAskFollowUp?: boolean
  /** Response text should contain these substrings */
  responseContains?: string[]
}

export interface EvalCase {
  id: string
  name: string
  description: string
  commandType: string
  input: string
  expectedTools: string[]
  forbiddenTools?: string[]
  assertions: EvalAssertion
  /** Optional board state to seed before running (empty board by default) */
  seedObjects?: Array<{
    type: string
    text?: string
    x: number
    y: number
    width: number
    height: number
    fill?: string
  }>
}

export const EVAL_DATASET: EvalCase[] = [
  {
    id: 'simple-create',
    name: 'Simple Create',
    description:
      'Create a single sticky note with specific text and color',
    commandType: 'create',
    input: 'Add a yellow sticky note that says Hello',
    expectedTools: ['createStickyNote'],
    assertions: {
      minToolCalls: 1,
      maxToolCalls: 1,
      minObjectsCreated: 1,
      expectedObjectTypes: ['sticky_note'],
    },
  },
  {
    id: 'multi-create',
    name: 'Multi Create',
    description: 'Create multiple objects in a single request',
    commandType: 'create',
    input: 'Add 3 green sticky notes',
    expectedTools: ['createStickyNote'],
    assertions: {
      minToolCalls: 3,
      maxToolCalls: 3,
      minObjectsCreated: 3,
      expectedObjectTypes: ['sticky_note'],
    },
  },
  {
    id: 'template-swot',
    name: 'SWOT Template',
    description:
      'Create a SWOT analysis template with 4 quadrants',
    commandType: 'template',
    input: 'Create a SWOT analysis',
    expectedTools: ['createFrame'],
    assertions: {
      minToolCalls: 4,
      minObjectsCreated: 4,
      responseContains: ['SWOT'],
    },
  },
  {
    id: 'color-change',
    name: 'Color Change',
    description:
      'Change the color of existing objects — requires getBoardState first',
    commandType: 'modify',
    input: 'Make all sticky notes blue',
    expectedTools: ['getBoardState', 'changeColor'],
    assertions: {
      shouldGetBoardState: true,
      minToolCalls: 2,
    },
    seedObjects: [
      {
        type: 'sticky_note',
        text: 'Note A',
        x: 100,
        y: 100,
        width: 150,
        height: 150,
        fill: '#EAB308',
      },
      {
        type: 'sticky_note',
        text: 'Note B',
        x: 270,
        y: 100,
        width: 150,
        height: 150,
        fill: '#EAB308',
      },
    ],
  },
  {
    id: 'layout-grid',
    name: 'Arrange in Grid',
    description:
      'Arrange existing objects in a grid layout',
    commandType: 'layout',
    input: 'Arrange everything in a grid',
    expectedTools: ['getBoardState', 'arrangeObjects'],
    assertions: {
      shouldGetBoardState: true,
      minToolCalls: 2,
    },
    seedObjects: [
      {
        type: 'sticky_note',
        text: 'A',
        x: 500,
        y: 500,
        width: 150,
        height: 150,
      },
      {
        type: 'sticky_note',
        text: 'B',
        x: 200,
        y: 800,
        width: 150,
        height: 150,
      },
      {
        type: 'sticky_note',
        text: 'C',
        x: 900,
        y: 100,
        width: 150,
        height: 150,
      },
    ],
  },
  {
    id: 'delete-object',
    name: 'Delete Object',
    description:
      'Delete a specific object — requires getBoardState first',
    commandType: 'delete',
    input: 'Remove the first sticky note',
    expectedTools: ['getBoardState', 'deleteObject'],
    assertions: {
      shouldGetBoardState: true,
      minToolCalls: 2,
      maxToolCalls: 3,
    },
    seedObjects: [
      {
        type: 'sticky_note',
        text: 'First note',
        x: 100,
        y: 100,
        width: 150,
        height: 150,
      },
      {
        type: 'sticky_note',
        text: 'Second note',
        x: 270,
        y: 100,
        width: 150,
        height: 150,
      },
    ],
  },
  {
    id: 'query-board',
    name: 'Query Board',
    description:
      'Ask about board contents without modifying anything',
    commandType: 'query',
    input: "What's on the board?",
    expectedTools: ['getBoardState'],
    forbiddenTools: [
      'createStickyNote',
      'createShape',
      'createFrame',
      'deleteObject',
      'moveObject',
      'changeColor',
    ],
    assertions: {
      shouldGetBoardState: true,
      readOnly: true,
      minToolCalls: 1,
      maxToolCalls: 1,
    },
    seedObjects: [
      {
        type: 'sticky_note',
        text: 'Existing note',
        x: 100,
        y: 100,
        width: 150,
        height: 150,
      },
    ],
  },
  {
    id: 'ambiguous-command',
    name: 'Ambiguous Command',
    description:
      'An unclear command that should prompt a follow-up question',
    commandType: 'ambiguous',
    input: 'Make it better',
    expectedTools: [],
    forbiddenTools: [
      'createStickyNote',
      'createShape',
      'deleteObject',
      'moveObject',
    ],
    assertions: {
      shouldAskFollowUp: true,
      readOnly: true,
    },
  },
  {
    id: 'complex-kanban',
    name: 'Complex Kanban',
    description:
      'Create a Kanban board with 3 columns: To Do, In Progress, Done',
    commandType: 'template',
    input:
      'Create a Kanban board with 3 columns: To Do, In Progress, Done',
    expectedTools: ['createFrame'],
    assertions: {
      minToolCalls: 3,
      minObjectsCreated: 3,
      responseContains: ['Kanban'],
    },
  },
  {
    id: 'edge-empty-board',
    name: 'Edge: Empty Board',
    description:
      'Resize all objects on an empty board — should report nothing to resize',
    commandType: 'modify',
    input: 'Resize all objects to be larger',
    expectedTools: ['getBoardState'],
    forbiddenTools: ['resizeObject'],
    assertions: {
      shouldGetBoardState: true,
      readOnly: true,
      maxToolCalls: 1,
    },
  },
]
