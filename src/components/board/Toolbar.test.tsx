import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Toolbar } from './Toolbar'
import type { Tool, ShapeTool } from './Toolbar'

vi.mock('@/components/ui/OrimLogo', () => ({
  OrimLogo: () => <span data-testid="orim-logo">Logo</span>,
}))

function defaultProps(overrides: Partial<Parameters<typeof Toolbar>[0]> = {}) {
  return {
    tool: 'select' as Tool,
    shapeTool: 'rectangle' as ShapeTool,
    stickyColor: '#fef08a',
    selectedId: null as string | null,
    onToolChange: vi.fn(),
    onShapeToolChange: vi.fn(),
    onStickyColorChange: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  }
}

describe('Toolbar', () => {
  it('calls onToolChange with select when select button clicked', async () => {
    const user = userEvent.setup()
    const props = defaultProps({ tool: 'sticky_note' })
    render(<Toolbar {...props} />)

    // Select button has an SVG cursor icon
    const selectBtn = screen.getAllByRole('button').find((btn) =>
      btn.querySelector('svg path[d*="15.042"]'),
    )
    expect(selectBtn).toBeDefined()
    await user.click(selectBtn!)
    expect(props.onToolChange).toHaveBeenCalledWith('select')
  })

  it('calls onToolChange with sticky_note when Note button clicked', async () => {
    const user = userEvent.setup()
    const props = defaultProps()
    render(<Toolbar {...props} />)

    await user.click(screen.getByRole('button', { name: /note/i }))
    expect(props.onToolChange).toHaveBeenCalledWith('sticky_note')
  })

  it('calls onToolChange with connector when connector button clicked', async () => {
    const user = userEvent.setup()
    const props = defaultProps()
    render(<Toolbar {...props} />)

    const connectorBtn = screen.getByTitle('Connect objects')
    await user.click(connectorBtn)
    expect(props.onToolChange).toHaveBeenCalledWith('connector')
  })

  it('calls onToolChange with freedraw when draw button clicked', async () => {
    const user = userEvent.setup()
    const props = defaultProps()
    render(<Toolbar {...props} />)

    const drawBtn = screen.getByTitle('Free draw')
    await user.click(drawBtn)
    expect(props.onToolChange).toHaveBeenCalledWith('freedraw')
  })

  it('hides delete button when selectedId is null', () => {
    render(<Toolbar {...defaultProps({ selectedId: null })} />)

    // Delete button has a trash icon SVG with a specific path
    const deleteBtn = screen.queryAllByRole('button').find((btn) =>
      btn.querySelector('svg path[d*="14.74"]'),
    )
    expect(deleteBtn).toBeUndefined()
  })

  it('shows and handles delete button when selectedId is set', async () => {
    const user = userEvent.setup()
    const props = defaultProps({ selectedId: 'obj-1' })
    render(<Toolbar {...props} />)

    const deleteBtn = screen.getAllByRole('button').find((btn) =>
      btn.querySelector('svg path[d*="14.74"]'),
    )
    expect(deleteBtn).toBeDefined()
    await user.click(deleteBtn!)
    expect(props.onDelete).toHaveBeenCalled()
  })

  it('shows all 11 shape options when dropdown toggle clicked', async () => {
    const user = userEvent.setup()
    render(<Toolbar {...defaultProps()} />)

    // Click the shape dropdown toggle (the ▾ button next to the shape name)
    const dropdownToggles = screen.getAllByRole('button', { name: '▾' })
    // The second ▾ is the shape dropdown (first is sticky color dropdown)
    await user.click(dropdownToggles[1])

    // Verify shape options appear in the dropdown (use getAllBy for labels that also appear in toolbar button)
    const dropdownPanel = screen.getByText('Shapes').closest('div')!
    expect(dropdownPanel).toBeInTheDocument()
    // Check for shapes that only appear in the dropdown (not duplicated in the toolbar button)
    expect(screen.getByText('Circle')).toBeInTheDocument()
    expect(screen.getByText('Triangle')).toBeInTheDocument()
    expect(screen.getByText('Diamond')).toBeInTheDocument()
    expect(screen.getByText('Star')).toBeInTheDocument()
    expect(screen.getByText('Hexagon')).toBeInTheDocument()
    expect(screen.getByText('Pentagon')).toBeInTheDocument()
    expect(screen.getByText('Ellipse')).toBeInTheDocument()
    expect(screen.getByText('Rounded Rect')).toBeInTheDocument()
    // Rectangle, Arrow, Line appear both in toolbar button and dropdown — use getAllByText
    expect(screen.getAllByText('Rectangle').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Arrow').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Line').length).toBeGreaterThanOrEqual(1)
  })

  it('shows correct help text per tool', () => {
    const { rerender } = render(<Toolbar {...defaultProps({ tool: 'select' })} />)
    expect(screen.getByText('Click to select, scroll to zoom')).toBeInTheDocument()

    rerender(<Toolbar {...defaultProps({ tool: 'connector' })} />)
    expect(screen.getByText('Click source, then target object')).toBeInTheDocument()

    rerender(<Toolbar {...defaultProps({ tool: 'freedraw' })} />)
    expect(screen.getByText('Click and drag to draw')).toBeInTheDocument()
  })
})
