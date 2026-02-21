import { buildSystemPrompt } from './system-prompt'

describe('buildSystemPrompt', () => {
  const boardId = 'test-board-123'

  describe('concise mode (default)', () => {
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

    it('has Flowchart template instructions', () => {
      expect(prompt).toContain('Flowchart')
      expect(prompt).toContain('Decision')
    })

    it('has Timeline template instructions', () => {
      expect(prompt).toContain('Timeline')
      expect(prompt).toContain('Milestone')
    })

    it('has Decision Matrix template instructions', () => {
      expect(prompt).toContain('Decision Matrix')
      expect(prompt).toContain('Impact')
      expect(prompt).toContain('Effort')
    })

    it('instructs to call getBoardState first', () => {
      expect(prompt).toContain('getBoardState')
      expect(prompt).toContain('FIRST')
    })

    it('includes layout rules', () => {
      expect(prompt).toContain('170px')
      expect(prompt).toContain('20px gap')
    })

    it('instructs concise responses by default', () => {
      expect(prompt).toContain('1-2 short sentences')
    })

    it('does not include verbose instructions', () => {
      expect(prompt).not.toContain('Explain what you are about to do')
    })
  })

  describe('verbose mode', () => {
    const prompt = buildSystemPrompt(boardId, true)

    it('includes verbose instructions', () => {
      expect(prompt).toContain('Explain what you are about to do')
      expect(prompt).toContain('bullet points')
    })

    it('does not include concise instructions', () => {
      expect(prompt).not.toContain('1 sentence')
    })

    it('still includes board ID and templates', () => {
      expect(prompt).toContain(boardId)
      expect(prompt).toContain('SWOT')
      expect(prompt).toContain('Flowchart')
    })
  })
})
