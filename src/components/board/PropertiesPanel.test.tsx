import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { PropertiesPanel } from './PropertiesPanel'
import type { CanvasObject } from '@/lib/board-sync'

vi.mock('./ColorPicker', () => ({
  ColorPicker: ({ label, value, onChange }: { label: string; value: string; onChange: (c: string) => void }) => (
    <button data-testid={`color-picker-${label}`} onClick={() => onChange('#ff0000')}>
      {label}: {value}
    </button>
  ),
}))

function makeObject(overrides: Partial<CanvasObject> = {}): CanvasObject {
  return {
    id: 'obj-1',
    type: 'rectangle',
    x: 0,
    y: 0,
    width: 120,
    height: 80,
    fill: '#e2e8f0',
    z_index: 0,
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('PropertiesPanel', () => {
  it('returns null when selectedObject is null', () => {
    const { container } = render(
      <PropertiesPanel selectedObject={null} onUpdate={vi.fn()} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows correct type label for sticky note', () => {
    render(
      <PropertiesPanel
        selectedObject={makeObject({ type: 'sticky_note', fill: '#fef08a' })}
        onUpdate={vi.fn()}
      />,
    )
    expect(screen.getByText('Sticky Note')).toBeInTheDocument()
  })

  it('shows correct type label for connector', () => {
    render(
      <PropertiesPanel
        selectedObject={makeObject({ type: 'connector', fill: 'transparent' })}
        onUpdate={vi.fn()}
      />,
    )
    expect(screen.getByText('Connector')).toBeInTheDocument()
  })

  it('shows arrow style buttons for connectors only', () => {
    const { rerender } = render(
      <PropertiesPanel
        selectedObject={makeObject({ type: 'connector', fill: 'transparent' })}
        onUpdate={vi.fn()}
      />,
    )
    expect(screen.getByText('Arrow style')).toBeInTheDocument()
    // 4 arrow style options: — → ← ↔
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByText('→')).toBeInTheDocument()
    expect(screen.getByText('←')).toBeInTheDocument()
    expect(screen.getByText('↔')).toBeInTheDocument()

    // Rectangle should NOT show arrow style
    rerender(
      <PropertiesPanel
        selectedObject={makeObject({ type: 'rectangle' })}
        onUpdate={vi.fn()}
      />,
    )
    expect(screen.queryByText('Arrow style')).not.toBeInTheDocument()
  })

  it('calls onUpdate with connectorStyle when arrow button clicked', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    render(
      <PropertiesPanel
        selectedObject={makeObject({ id: 'conn-1', type: 'connector', fill: 'transparent' })}
        onUpdate={onUpdate}
      />,
    )

    await user.click(screen.getByText('↔'))
    expect(onUpdate).toHaveBeenCalledWith('conn-1', { connectorStyle: 'arrow-both' })
  })

  it('shows fill color for shapes, hides for connectors/freedraw/lines', () => {
    const { rerender } = render(
      <PropertiesPanel
        selectedObject={makeObject({ type: 'rectangle' })}
        onUpdate={vi.fn()}
      />,
    )
    expect(screen.getByTestId('color-picker-Fill')).toBeInTheDocument()

    // Connector should NOT have fill
    rerender(
      <PropertiesPanel
        selectedObject={makeObject({ type: 'connector', fill: 'transparent' })}
        onUpdate={vi.fn()}
      />,
    )
    expect(screen.queryByTestId('color-picker-Fill')).not.toBeInTheDocument()

    // Freedraw should NOT have fill
    rerender(
      <PropertiesPanel
        selectedObject={makeObject({ type: 'freedraw', fill: 'transparent' })}
        onUpdate={vi.fn()}
      />,
    )
    expect(screen.queryByTestId('color-picker-Fill')).not.toBeInTheDocument()
  })

  it('opacity slider maps 0-100 to 0-1', () => {
    const onUpdate = vi.fn()
    render(
      <PropertiesPanel
        selectedObject={makeObject({ opacity: 0.5 })}
        onUpdate={onUpdate}
      />,
    )

    const slider = screen.getByRole('slider')
    expect(slider).toHaveValue('50')
    expect(screen.getByText('50%')).toBeInTheDocument()

    // Change to 75
    fireEvent.change(slider, { target: { value: '75' } })
    expect(onUpdate).toHaveBeenCalledWith('obj-1', { opacity: 0.75 })
  })

  it('hides stroke controls for sticky notes, shows for shapes', () => {
    const { rerender } = render(
      <PropertiesPanel
        selectedObject={makeObject({ type: 'rectangle' })}
        onUpdate={vi.fn()}
      />,
    )
    expect(screen.getByText('Stroke width')).toBeInTheDocument()
    expect(screen.getByTestId('color-picker-Stroke')).toBeInTheDocument()

    rerender(
      <PropertiesPanel
        selectedObject={makeObject({ type: 'sticky_note', fill: '#fef08a' })}
        onUpdate={vi.fn()}
      />,
    )
    expect(screen.queryByText('Stroke width')).not.toBeInTheDocument()
    expect(screen.queryByTestId('color-picker-Stroke')).not.toBeInTheDocument()
  })

  it('shows size buttons for sticky notes and calls onUpdate on L click', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    render(
      <PropertiesPanel
        selectedObject={makeObject({ id: 'sticky-1', type: 'sticky_note', fill: '#fef08a', width: 150, height: 150 })}
        onUpdate={onUpdate}
      />,
    )

    expect(screen.getByText('Size')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'S' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'M' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'L' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'L' }))
    expect(onUpdate).toHaveBeenCalledWith('sticky-1', { width: 200, height: 200 })
  })

  it('shows font selector for sticky notes only', () => {
    const { rerender } = render(
      <PropertiesPanel
        selectedObject={makeObject({ type: 'sticky_note', fill: '#fef08a' })}
        onUpdate={vi.fn()}
      />,
    )
    expect(screen.getByText('Font')).toBeInTheDocument()

    rerender(
      <PropertiesPanel
        selectedObject={makeObject({ type: 'rectangle' })}
        onUpdate={vi.fn()}
      />,
    )
    expect(screen.queryByText('Font')).not.toBeInTheDocument()
  })
})
