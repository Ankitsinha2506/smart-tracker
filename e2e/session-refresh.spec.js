import { expect, test } from '@playwright/test';
import { mockApi } from './mockApi.js';

test('production API uses same-origin cookie to restore login after reload', async ({ page }) => {
  await mockApi(page, { initialRole: 'admin' });
  const user = { _id: '507f1f77bcf86cd799439001', name: 'Placement Admin', email: 'admin@example.com', role: 'admin' };
  const requests = [];
  await page.route('**/api/v1/auth/**', async route => {
    const request = route.request();
    requests.push(request.url());
    const isLogin = request.url().endsWith('/login');
    const hasCookie = (await request.allHeaders()).cookie?.includes('refreshToken=test-session');
    if (!isLogin && !hasCookie) return route.fulfill({ status: 401, json: { message: 'Refresh token is required' } });
    await route.fulfill({
      headers: isLogin ? { 'set-cookie': 'refreshToken=test-session; HttpOnly; Path=/api/v1/auth; SameSite=Lax' } : {},
      json: { success: true, data: { user, accessToken: 'test-access-token' } },
    });
  });
  await page.goto('/login');
  await page.getByLabel('Registered email address').fill('admin@example.com');
  await page.locator('input[name="password"]').fill('TestPassword123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/);
  await page.reload();
  await expect(page.getByRole('heading', { name: /Dashboard/ })).toBeVisible();
  await expect(page).toHaveURL(/dashboard$/);
  expect(requests.every(url => new URL(url).origin === new URL(page.url()).origin)).toBeTruthy();
});
