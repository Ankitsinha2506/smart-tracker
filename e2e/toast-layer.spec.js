import { expect, test } from '@playwright/test';
import { mockApi } from './mockApi.js';
test('copy toast appears above the open profile dialog', async ({ page }) => {
  await mockApi(page, { initialRole: 'admin' });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} }, configurable: true });
  });
  await page.route('**/api/v1/students/507f1f77bcf86cd799439011', route => route.fulfill({ json: { success: true, data: {
    _id: '507f1f77bcf86cd799439011', candidateName: 'Asha Patil', personalEmail: 'asha@example.com', naukriEmail: 'asha.jobs@example.com', status: 'active', membershipType: 'free',
  } } }));
  await page.goto('/students');
  await page.getByRole('button', { name: 'Candidate Directory' }).click();
  await page.getByRole('button', { name: 'View Full Profile', exact: false }).first().click();
  await page.getByRole('button', { name: 'Copy email' }).click();
  const toast = page.getByText('Naukri email copied', { exact: true });
  await expect(toast).toBeVisible();
  await expect.poll(() => toast.evaluate(el => {
    const rect = el.getBoundingClientRect();
    const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return el.contains(top) || top?.contains(el);
  })).toBeTruthy();
  await expect(page.getByRole('dialog')).toBeVisible();
});
