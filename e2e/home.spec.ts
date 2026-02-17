import { test, expect } from '@playwright/test'

test('homepage shows landing page', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: /get started/i }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible()
})

test('login page shows magic link form by default', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByRole('button', { name: /send magic link/i })).toBeVisible()
})

test('login page shows password form when tab clicked', async ({ page }) => {
  await page.goto('/login')
  // Click the "Password" tab (not the form label)
  const passwordTab = page.locator('button', { hasText: 'Password' }).first()
  await passwordTab.click()
  await expect(page.getByLabel('Password')).toBeVisible({ timeout: 5000 })
})

test('login page shows OAuth buttons', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('button', { name: /google/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /github/i })).toBeVisible()
})

test('login page toggles between sign-in and sign-up', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByText('Sign in to continue to Orim')).toBeVisible()
  await page.getByRole('button', { name: /sign up/i }).click()
  await expect(page.getByText('Get started with Orim for free')).toBeVisible()
})

test('dashboard redirects to login when not authenticated', async ({ page }) => {
  await page.goto('/dashboard')
  await page.waitForURL('**/login**')
  await expect(page).toHaveURL(/\/login/)
})

test('board page redirects to login when not authenticated', async ({ page }) => {
  await page.goto('/board/test-board')
  await page.waitForURL('**/login**')
  await expect(page).toHaveURL(/\/login/)
})
