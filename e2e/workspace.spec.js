import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockApi } from './mockApi.js';

for (const role of ['admin', 'staff', 'student']) {
  test(`${role} dashboard supports direct updates with role-specific actions`, async ({ page }, testInfo) => {
    await mockApi(page, { initialRole: role });
    let update;
    await page.route('**/api/v1/students/**/application-count', async route => {
      update = { url: route.request().url(), body: route.request().postDataJSON() };
      await route.fulfill({ json: { success: true, data: {} } });
    });
    await page.goto(role === 'student' ? '/dashboard' : '/workspace');
    await expect(page.getByText('Last refreshed', { exact: false })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.getByRole('button', { name: role === 'student' ? 'Update application total' : 'Update count', exact: true }).click();
    await page.getByLabel('Current total applications').fill('910');
    await page.getByRole('button', { name: 'Update total', exact: true }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    expect(update.body.currentTotalApplicationCount).toBe(910);
    expect(update.url).toContain(role === 'student' ? '/students/me/application-count' : '/students/507f1f77bcf86cd799439011/application-count');
    if (role === 'student') {
      await expect(page.getByRole('link', { name: 'Add candidate', exact: true })).toHaveCount(0);
    } else {
      await expect(page.getByRole('link', { name: 'Add candidate', exact: true })).toHaveAttribute('href', '/students?action=add');
    }
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations.filter(item => ['critical', 'serious'].includes(item.impact))).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`${role}-dashboard.png`), fullPage: true });
  });
}
