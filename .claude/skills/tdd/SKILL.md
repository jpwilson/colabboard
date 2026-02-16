---
name: tdd
description: Enforce TDD RED-GREEN-REFACTOR cycle for implementing features
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(npm run test:run), Bash(npm run test)
argument-hint: [feature description]
---

# TDD Skill — RED-GREEN-REFACTOR

## Rules

1. You MUST write a failing test FIRST before any implementation code.
2. Workflow: **RED** (write test, verify it fails) -> **GREEN** (write minimum code to pass) -> **REFACTOR** (clean up while keeping tests green).
3. If you catch yourself writing implementation before a test, STOP, delete the implementation, and write the test first.
4. Always run `npm run test:run` after each phase to verify.
5. Test files live alongside source: `Component.tsx` + `Component.test.tsx`.
6. For E2E flows, create tests in `e2e/` directory.
7. Do NOT unit test async Server Components — use Playwright E2E for those.

## Usage

The argument `$ARGUMENTS` describes the feature to implement.

### Phase 1 — RED
- Write a test that describes the expected behavior of the feature.
- Run `npm run test:run` and confirm the test **fails**.

### Phase 2 — GREEN
- Write the **minimum** implementation code to make the test pass.
- Run `npm run test:run` and confirm the test **passes**.

### Phase 3 — REFACTOR
- Clean up the code (extract helpers, rename variables, remove duplication).
- Run `npm run test:run` and confirm all tests still **pass**.
