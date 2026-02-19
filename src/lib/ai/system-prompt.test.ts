import { buildSystemPrompt } from './system-prompt'

describe('buildSystemPrompt', () => {
  const boardId = 'test-board-123'
  const prompt = buildSystemPrompt(boardId)

  it('includes the board ID', () => {
    expect(prompt).toContain(boardId)
  })

  it('lists available object types', () => {
    expect(prompt).toContain('sticky_note')
    expect(prompt).toContain('rectangle')
    expect(prompt).toContain('circle')
    expect(prompt).toContain('connector')
  })

  it('includes sticky note color palette', () => {
    expect(prompt).toContain('#fef08a')
    expect(prompt).toContain('yellow')
    expect(prompt).toContain('#bbf7d0')
    expect(prompt).toContain('green')
  })

  it('has SWOT template instructions', () => {
    expect(prompt).toContain('SWOT')
    expect(prompt).toContain('Strengths')
    expect(prompt).toContain('Weaknesses')
    expect(prompt).toContain('Opportunities')
    expect(prompt).toContain('Threats')
  })

  it('has Retrospective template instructions', () => {
    expect(prompt).toContain('Retrospective')
    expect(prompt).toContain('Went Well')
    expect(prompt).toContain('To Improve')
  })

  it('has Kanban template instructions', () => {
    expect(prompt).toContain('Kanban')
    expect(prompt).toContain('To Do')
    expect(prompt).toContain('In Progress')
    expect(prompt).toContain('Done')
  })

  it('instructs to call getBoardState first', () => {
    expect(prompt).toContain('getBoardState')
    expect(prompt).toContain('FIRST')
  })

  it('includes layout rules', () => {
    expect(prompt).toContain('170px')
    expect(prompt).toContain('20px gap')
  })
})
