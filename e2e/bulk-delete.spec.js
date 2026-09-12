import { expect, test } from '@playwright/test';
import { mockApi } from './mockApi.js';
test('selected and all candidate deletion require confirmation', async ({ page }) => {
  await mockApi(page, { initialRole: 'admin' });
  const deleted = [];
  await page.route('**/api/v1/students/bulk-delete', async route => {
    deleted.push(route.request().postDataJSON());
    await route.fulfill({ json: { success: true, data: { deletedCount: 1 } } });
  });
  await page.goto('/students');
  await page.getByRole('button', { name: 'Candidate Directory' }).click();
  await page.getByLabel('Select this page').check();
  await page.getByRole('button', { name: 'Delete selected', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
  expect(deleted).toEqual([]);
  await page.getByRole('button', { name: 'Delete selected', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete selected candidates' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(deleted[0]).toEqual({ scope: 'selected', ids: ['507f1f77bcf86cd799439011'] });
  await page.getByRole('button', { name: 'Delete all candidates', exact: true }).click();
  const confirm = page.getByRole('dialog').getByRole('button', { name: 'Delete all candidates' });
  await expect(confirm).toBeDisabled();
  await page.getByLabel('Type DELETE ALL to confirm').fill('DELETE ALL');
  await confirm.click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(deleted[1]).toEqual({ scope: 'all', confirmation: 'DELETE ALL' });
});

test('tracker has aligned columns and no deletion controls; directory has aligned selection', async ({ page }, testInfo) => {
  await mockApi(page, { initialRole: 'admin' });
  let removed = false;
  await page.route('**/api/v1/dashboard/daily-matrix*', async route => {
    await route.fulfill({ json: { success: true, data: {
      days: [{ key: '2026-09-12', label: '12 Sept', day: 'Sat' }],
      students: removed ? [] : [{ _id: '507f1f77bcf86cd799439011', candidateName: 'Asha Patil', personalEmail: 'asha@example.com', technology: { name: 'MERN Stack' }, startingCount: 10, periodCount: 2, endingCount: 12, dailyCounts: { '2026-09-12': 2 } }],
      totals: { totalStudents: removed ? 0 : 1, startingTotal: 10, periodTotal: 2, endingTotal: 12, dailyTotals: {} },
    } } });
  });
  await page.route('**/api/v1/students/bulk-delete', async route => {
    removed = true;
    await route.fulfill({ json: { success: true, data: { deletedCount: 1 } } });
  });
  await page.goto('/students');
  const tracker = page.getByRole('table', { name: 'Daily application activity' });
  await expect(tracker).toBeVisible();
  await expect(tracker.getByRole('checkbox')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Delete/ })).toHaveCount(0);
  expect(await tracker.locator('thead tr th').count()).toEqual(await tracker.locator('tbody tr').first().locator('td').count());
  await page.getByRole('button', { name: 'Candidate Directory' }).click();
  const directory = page.getByRole('table', { name: 'Candidate directory', exact: true });
  expect(await directory.locator('thead tr th').count()).toEqual(await directory.locator('tbody tr').first().locator('td').count());
  await page.screenshot({ path: testInfo.outputPath('directory.png'), fullPage: true });
  await page.getByLabel('Select this page').check();
  await page.getByRole('button', { name: 'Delete selected', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete selected candidates' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Daily Tracker' }).click();
  await expect(page.getByText('No candidates found')).toBeVisible();
});
