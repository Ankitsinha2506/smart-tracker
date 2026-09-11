import { expect, test } from '@playwright/test';
import { mockApi } from './mockApi.js';

test('glass search, filters and navigation work across themes', async ({ page, isMobile }, testInfo) => {
  await mockApi(page, { initialRole: 'admin' });
  await page.goto('/students');
  await page.getByRole('button', { name: 'Candidate Directory' }).click();
  const search = page.getByRole('textbox', { name: 'Search candidates' });
  await search.fill('Asha');
  await page.getByRole('button', { name: 'Clear search candidates' }).click();
  await expect(search).toHaveValue('');
  await expect(page.getByRole('region', { name: 'Refine your view' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('directory-light.png') });
  await page.getByRole('button', { name: 'Use dark theme' }).click();
  await page.screenshot({ path: testInfo.outputPath('directory-dark.png') });
  if (isMobile) await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: /Dashboard/ })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('dashboard-dark.png') });
});
