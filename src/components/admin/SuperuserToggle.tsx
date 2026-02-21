'use client'

import { useState, useTransition } from 'react'

interface SuperuserToggleProps {
  userId: string
  initialValue: boolean
  disabled?: boolean
}

export function SuperuserToggle({
  userId,
  initialValue,
  disabled,
}: SuperuserToggleProps) {
  const [isSuper, setIsSuper] = useState(initialValue)
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    if (disabled) return
    const newValue = !isSuper

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/users/${userId}/superuser`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_superuser: newValue }),
        })

        if (res.ok) {
          setIsSuper(newValue)
        }
      } catch {
        // Toggle stays at previous value on failure
      }
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={disabled || isPending}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        disabled
          ? 'cursor-not-allowed bg-slate-200'
          : isSuper
            ? 'bg-amber-500 hover:bg-amber-600'
            : 'bg-slate-300 hover:bg-slate-400'
      }`}
      title={
        disabled
          ? 'Permanent superuser (cannot be changed)'
          : isSuper
            ? 'Click to revoke superuser'
            : 'Click to grant superuser'
      }
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          isSuper ? 'translate-x-6' : 'translate-x-1'
        } ${isPending ? 'opacity-50' : ''}`}
      />
    </button>
  )
}
