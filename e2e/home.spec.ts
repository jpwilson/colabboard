import { test, expect } from '@playwright/test'

test('homepage shows landing page', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: /get started/i }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible()
})

test('login page shows sign-in form', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Orim' })).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Password')).toBeVisible()
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
})

test('login page shows OAuth buttons', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('button', { name: /google/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /github/i })).toBeVisible()
})

test('login page toggles between sign-in and sign-up', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  await page.getByRole('button', { name: /sign up/i }).click()
  await expect(page.getByText('Create a new account')).toBeVisible()
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
