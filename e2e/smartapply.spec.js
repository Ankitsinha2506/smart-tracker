import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { mockApi } from './mockApi.js';

test('public login is accessible and signs an Admin into the dashboard', async ({ page }) => {
  await mockApi(page);
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.getByLabel('Email address').fill('admin@example.com');
  await page.locator('input[name="password"]').fill('Admin123!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText('Total Placed Students', { exact: true })).toBeVisible();
});

test('Admin manages students and sees calculated count feedback', async ({ page }) => {
  await mockApi(page, { initialRole: 'admin' });
  await page.goto('/students');
  await expect(page.getByRole('heading', { name: 'Students' })).toBeVisible();
  await expect(page.getByText('Asha Patil')).toBeVisible();
  await page.getByRole('button', { name: 'Update application total' }).click();
  await page.getByLabel('Current total applications').fill('910');
  await expect(page.getByText(/New applications:/)).toContainText('10');
  await page.getByRole('button', { name: 'Update total' }).click();
  await expect(page.getByText('10 applications recorded today')).toBeVisible();
});

test('Student sees only self-service navigation and updates own total', async ({
  page,
  isMobile,
}) => {
  await mockApi(page, { initialRole: 'student' });
  await page.goto('/my-profile');
  await expect(page.getByRole('heading', { name: 'My profile' })).toBeVisible();
  if (isMobile) await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByText('Users', { exact: true })).toHaveCount(0);
  if (isMobile) await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Update Naukri total' }).click();
  await page.getByLabel('Current total applications').fill('912');
  await page.getByRole('button', { name: 'Update total' }).click();
  await expect(page.getByText('12 applications recorded today')).toBeVisible();
});

test('authenticated Admin dashboard has no serious accessibility violations', async ({ page }) => {
  await mockApi(page, { initialRole: 'admin' });
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((item) => ['critical', 'serious'].includes(item.impact)),
  ).toEqual([]);
});
