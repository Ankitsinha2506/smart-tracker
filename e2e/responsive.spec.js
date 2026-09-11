import { expect, test } from '@playwright/test';
import { mockApi } from './mockApi.js';

const sizes = [[320, 640], [390, 844], [768, 1024], [1024, 768], [1366, 768], [1920, 1080], [2560, 1440]];
async function fits(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
}
for (const [width, height] of sizes) {
  test(`all sections fit ${width}x${height}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    await mockApi(page, { initialRole: 'admin' });
    for (const route of ['/dashboard', '/students', '/history', '/reports', '/technologies', '/users', '/settings']) {
      await page.goto(route);
      await expect(page.locator('main h1')).toBeVisible();
      await fits(page);
      const heading = await page.locator('main h1').boundingBox();
      expect(heading.y).toBeLessThan(200);
      if (route === '/dashboard') await page.screenshot({ path: testInfo.outputPath('dashboard.png'), fullPage: true });
      if (route === '/users' || route === '/technologies') {
        await page.getByRole('button', { name: route === '/users' ? 'Add staff user' : 'Add technology', exact: true }).click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        const bounds = await dialog.boundingBox();
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 1);
        await page.keyboard.press('Escape');
      }
      if (route === '/settings') {
        const field = await page.locator('input').first().boundingBox();
        expect(field.y - heading.y).toBeLessThan(240);
      }
    }
    await page.getByRole('button', { name: 'Use dark theme' }).click();
    await fits(page);
    if (width < 1200) {
      await page.getByRole('button', { name: 'Open navigation' }).click();
      await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).toBeVisible();
      await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
      await expect(page).toHaveURL(/dashboard$/);
    }
  });
  test(`authentication and profile fit ${width}x${height}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    await mockApi(page);
    for (const route of ['/login', '/forgot-password', '/reset-password']) {
      await page.goto(route);
      await expect(page.locator('form').getByRole('heading')).toBeVisible();
      if (route === '/login') await page.screenshot({ path: testInfo.outputPath('login.png'), fullPage: true });
      await fits(page);
    }
    await page.unroute('**/api/v1/**');
    await mockApi(page, { initialRole: 'student' });
    await page.goto('/my-profile');
    await expect(page.getByRole('heading', { name: 'My profile' })).toBeVisible();
    await fits(page);
    await page.getByRole('button', { name: 'Update Naukri total' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const bounds = await dialog.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 1);
    await expect(dialog.getByRole('button', { name: 'Update total' })).toBeInViewport();
  });
}

test('candidate directory uses two readable columns at 781px', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 781, height: 725 });
  await mockApi(page, { initialRole: 'admin' });
  await page.route('**/api/v1/students?*', async (route) => {
    const students = ['Sanjay Wadatkar', 'Ankit Lal Sinha', 'Abhishek Ghorpade'].map((name, index) => ({
      _id: `candidate-${index}`, candidateName: name, personalEmail: 'candidate.long.email@example.com',
      mobileNumber: '9876543210', technology: { name: 'SQL Support / Developer' },
      createdBy: { name: 'SmartApply Administrator' }, status: 'active', membershipType: 'paid',
      membershipPaidMonth: '2026-06', currentTotalApplicationCount: 230, periodApplicationCount: 20,
    }));
    await route.fulfill({ json: { success: true, data: students, meta: { pagination: { page: 1, limit: 20, total: 3, pages: 1 } } } });
  });
  const invalidRequests = [];
  page.on('request', request => { if (request.url().includes('/students/daily-matrix')) invalidRequests.push(request.url()); });
  await page.goto('/students');
  await page.getByRole('button', { name: 'Candidate Directory' }).click();
  const cards = page.getByTestId('candidate-cards').locator(':scope > div');
  await expect(cards).toHaveCount(3);
  const first = await cards.nth(0).boundingBox();
  const second = await cards.nth(1).boundingBox();
  expect(first.y).toEqual(second.y);
  expect(second.x).toBeGreaterThan(first.x + first.width);
  await fits(page);
  await page.screenshot({ path: testInfo.outputPath('tablet-directory.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileFirst = await cards.nth(0).boundingBox();
  const mobileSecond = await cards.nth(1).boundingBox();
  expect(mobileSecond.y).toBeGreaterThanOrEqual(mobileFirst.y + mobileFirst.height);
  await fits(page);
  expect(invalidRequests).toEqual([]);
});
