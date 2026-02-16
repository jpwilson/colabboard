---
name: component
description: Generate a new React component with its test file following project conventions
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Glob, Bash(npm run test:run)
argument-hint: [ComponentName] [board|ui]
---

# Component Skill — Scaffold a React Component

## Rules

1. Create `$1.tsx` and `$1.test.tsx` in the appropriate directory.
2. If the second argument is `board`, put files in `src/components/board/`.
3. If the second argument is `ui` or not specified, put files in `src/components/ui/`.
4. Use **named exports** (not default exports).
5. Use a functional component with a typed props interface.
6. Follow project conventions: no `any`, use `interface` for props.
7. The test file should have at least one rendering test.
8. Run `npm run test:run` to verify.

## Component Template

```tsx
interface $1Props {
  // props here
}

export function $1({ ...props }: $1Props) {
  return (
    <div>
      {/* component content */}
    </div>
  )
}
```

## Test Template

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { $1 } from './$1'

describe('$1', () => {
  it('renders without crashing', () => {
    render(<$1 />)
    // assertion here
  })
})
```
