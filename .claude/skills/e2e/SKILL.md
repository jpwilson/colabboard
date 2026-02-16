---
name: e2e
description: Write a Playwright E2E test for a user flow
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(npm run test:e2e *)
argument-hint: [test description]
---

# E2E Skill — Playwright End-to-End Test

## Rules

1. Create the test in the `e2e/` directory with a descriptive filename.
2. Use Page Object Model pattern where appropriate.
3. For collaborative testing, use multiple browser contexts:

```typescript
const context1 = await browser.newContext()
const context2 = await browser.newContext()
const page1 = await context1.newPage()
const page2 = await context2.newPage()
```

4. Base URL is `http://localhost:3000` (configured in `playwright.config.ts`).
5. Use accessible selectors (`getByRole`, `getByText`, `getByLabel`).

## Usage

The argument `$ARGUMENTS` describes the user flow to test.

## Test Template

```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/')
    // test steps here
  })
})
```

## Multi-User Test Template

```typescript
import { test, expect, Browser } from '@playwright/test'

test.describe('Collaborative Feature', () => {
  test('should sync between users', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    await page1.goto('/')
    await page2.goto('/')

    // collaborative test steps here

    await context1.close()
    await context2.close()
  })
})
```
