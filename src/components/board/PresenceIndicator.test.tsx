import { render, screen } from '@testing-library/react'
import { PresenceIndicator } from './PresenceIndicator'
import type { PresenceUser } from '@/hooks/usePresence'

describe('PresenceIndicator', () => {
  it('shows only the current user when no others are present', () => {
    render(<PresenceIndicator users={[]} currentUserName="Alice" />)

    expect(screen.getByTitle('Alice (you)')).toBeInTheDocument()
    expect(screen.queryByText(/online/)).not.toBeInTheDocument()
  })

  it('shows other users with online count', () => {
    const others: PresenceUser[] = [
      { userId: 'user-2', userName: 'Bob', cursor: null, color: '#3b82f6' },
      { userId: 'user-3', userName: 'Charlie', cursor: null, color: '#22c55e' },
    ]

    render(<PresenceIndicator users={others} currentUserName="Alice" />)

    expect(screen.getByTitle('Alice (you)')).toBeInTheDocument()
    expect(screen.getByTitle('Bob')).toBeInTheDocument()
    expect(screen.getByTitle('Charlie')).toBeInTheDocument()
    expect(screen.getByText('3 online')).toBeInTheDocument()
  })

  it('displays the first letter of each user name', () => {
    const others: PresenceUser[] = [
      { userId: 'user-2', userName: 'Bob', cursor: null, color: '#3b82f6' },
    ]

    render(<PresenceIndicator users={others} currentUserName="Alice" />)

    expect(screen.getByTitle('Alice (you)')).toHaveTextContent('A')
    expect(screen.getByTitle('Bob')).toHaveTextContent('B')
  })
})
