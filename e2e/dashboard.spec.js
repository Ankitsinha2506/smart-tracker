import { expect, test } from '@playwright/test';
import { mockApi } from './mockApi.js';

test('dashboard filters, exports, activity inbox and sidebar remain interactive', async ({
  page,
  isMobile,
}, testInfo) => {
  await mockApi(page, { initialRole: 'admin' });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Open workspace activity inbox', exact: true }),
  ).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Open activity inbox', exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByText('Auto-refresh · 15 sec', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
  ).toBeTruthy();
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await page.getByRole('combobox', { name: 'Candidate status' }).click();
  await page.getByRole('option', { name: 'Placed', exact: true }).click();
  const filtered = page.waitForRequest(
    (request) =>
      new URL(request.url()).pathname.endsWith('/dashboard') &&
      new URL(request.url()).searchParams.get('status') === 'placed',
  );
  await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
  await filtered;
  await page.getByRole('button', { name: 'Clear filters' }).click();
  const allTime = page.waitForRequest(
    (request) =>
      new URL(request.url()).pathname.endsWith('/dashboard') &&
      new URL(request.url()).searchParams.get('allTime') === 'true',
  );
  await page.getByRole('button', { name: 'All time', exact: true }).click();
  await allTime;
  await page.getByRole('button', { name: 'Export Report', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV', exact: false }).click();
  expect((await download).suggestedFilename()).toBe('smartapply-dashboard.csv');
  await page.getByRole('button', { name: 'Close export panel' }).click();
  await page.getByRole('button', { name: 'Open workspace activity inbox', exact: true }).click();
  await expect(page.getByText('1 unread')).toBeVisible();
  await page.getByRole('button', { name: 'Mark all as read' }).click();
  await expect(page.getByText('0 unread')).toBeVisible();
  await page.getByRole('button', { name: 'Clear all' }).click();
  await expect(page.getByText("You're all caught up")).toBeVisible();
  await page.getByRole('button', { name: 'Close activity inbox' }).click();
  if (!isMobile) {
    await page.getByRole('button', { name: 'Collapse sidebar' }).click();
    await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();
    await page.getByRole('button', { name: 'Expand sidebar' }).click();
  }
  await page.screenshot({ path: testInfo.outputPath('dashboard-light.png'), fullPage: true });
  await page.getByRole('button', { name: 'Use dark theme' }).click();
  await page.screenshot({ path: testInfo.outputPath('dashboard-dark.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('dashboard shows honest empty states when there are no records', async ({ page }) => {
  await mockApi(page, { initialRole: 'staff' });
  await page.route('**/api/v1/dashboard?*', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: {
          cards: { totalStudents: 0, totalRecruiters: 1 },
          charts: { dailyTrend: [], technologyWise: [], recentActivity: [] },
        },
      },
    }),
  );
  await page.route('**/api/v1/students?*', (route) =>
    route.fulfill({ json: { success: true, data: [], meta: { pagination: { total: 0 } } } }),
  );
  await page.goto('/dashboard');
  await expect(page.getByText('No candidates yet', { exact: true })).toBeVisible();
  await expect(page.getByText('No application activity', { exact: true })).toBeVisible();
  await expect(page.getByText('No candidates found', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export Report' })).toBeEnabled();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
  ).toBeTruthy();
});

test('dashboard refreshes after 15 seconds and KPI navigation preserves candidate status', async ({
  page,
}) => {
  await mockApi(page, { initialRole: 'admin' });
  await page.clock.install();
  let requests = 0;
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.endsWith('/dashboard')) requests += 1;
  });
  await page.goto('/dashboard');
  await expect(page.getByText('Auto-refresh · 15 sec', { exact: true })).toBeVisible();
  const before = requests;
  await page.clock.fastForward(16_000);
  await expect.poll(() => requests).toBeGreaterThan(before);
  await page.getByRole('link', { name: /^Inactive Candidates:/ }).click();
  await expect(page).toHaveURL(/status=inactive/);
  await expect(page.getByRole('combobox', { name: 'Status', exact: true })).toContainText(
    'Inactive',
  );
});

test('dashboard stays within narrow phone, tablet and large desktop screens', async ({
  page,
}, testInfo) => {
  await mockApi(page, { initialRole: 'admin' });
  await page.goto('/dashboard');
  await expect(page.getByText('Auto-refresh · 15 sec', { exact: true })).toBeVisible();
  for (const width of [320, 768, 1920]) {
    await page.setViewportSize({ width, height: 1080 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
      .toBeTruthy();
    await page.screenshot({ path: testInfo.outputPath(`dashboard-${width}.png`), fullPage: true });
  }
});

test('dashboard supports keyboard and accessible semantics', async ({ page }) => {
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  await mockApi(page, { initialRole: 'admin' });
  await page.goto('/dashboard');
  await expect(page.getByText('Auto-refresh · 15 sec', { exact: true })).toBeVisible();
  await expect(page.locator('main section').first()).toHaveCSS('opacity', '1');
  await page.getByRole('button', { name: 'Export Report', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  const results = await new AxeBuilder({ page }).include('main').analyze();
  expect(
    results.violations.map((item) => ({
      id: item.id,
      nodes: item.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
  await page.getByRole('button', { name: 'Use dark theme' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.ats-welcome-chip')).toHaveCSS('background-color', 'rgb(32, 54, 87)');
  const dark = await new AxeBuilder({ page }).include('main').analyze();
  expect(
    dark.violations.map((item) => ({
      id: item.id,
      nodes: item.nodes.map((node) => ({ target: node.target, details: node.failureSummary })),
    })),
  ).toEqual([]);
});

test('dashboard distinguishes an unavailable API from an empty workspace and retries', async ({
  page,
}) => {
  await mockApi(page, { initialRole: 'admin' });
  let unavailable = true;
  await page.route('**/api/v1/dashboard?*', (route) =>
    unavailable
      ? route.fulfill({ status: 503, json: { success: false, message: 'Temporarily unavailable' } })
      : route.fallback(),
  );
  await page.goto('/dashboard');
  await expect(page.getByText('Workspace data unavailable', { exact: true })).toBeVisible();
  await expect(page.getByText('No candidates yet', { exact: true })).toHaveCount(0);
  unavailable = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByText('Auto-refresh · 15 sec', { exact: true })).toBeVisible();
});
