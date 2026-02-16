import { test, expect } from '@playwright/test'

test('homepage loads and shows canvas toolbar', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Orim')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Select' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sticky Note' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Rectangle' })).toBeVisible()
})

test('homepage has correct title', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Orim/)
})

test('can select sticky note tool', async ({ page }) => {
  await page.goto('/')
  const stickyBtn = page.getByRole('button', { name: 'Sticky Note' })
  await stickyBtn.click()
  await expect(stickyBtn).toHaveClass(/bg-yellow/)
})
