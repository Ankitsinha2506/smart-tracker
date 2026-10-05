import { expect, test } from '@playwright/test';
import XlsxPopulate from 'xlsx-populate';
import JSZip from 'jszip';
import { mockApi } from './mockApi.js';

async function workbookBuffer(omitFormatting = false) {
  const workbook = await XlsxPopulate.fromBlankAsync();
  workbook.sheet(0).cell('A1').value([
    ['Candidate Name', 'Mobile Number', 'Personal Email', 'Technology', 'Naukri Email', 'Naukri Password'],
    ['Test Student', '09876543210', 'student@example.com', 'Java', 'jobs@example.com', ' secret '],
  ]);
  const buffer = await workbook.outputAsync();
  if (!omitFormatting) return buffer;
  const zip = await JSZip.loadAsync(buffer);
  const styles = await zip.file('xl/styles.xml').async('string');
  zip.file('xl/styles.xml', styles.replace(/<fills\b[^>]*>[\s\S]*?<\/fills>/, ''));
  return zip.generateAsync({ type: 'nodebuffer' });
}

for (const omitFormatting of [false, true]) {
  test(`imports Excel with ${omitFormatting ? 'missing' : 'normal'} formatting sections`, async ({ page }) => {
    const buffer = await workbookBuffer(omitFormatting);
    if (omitFormatting) {
      // Verify this fixture reproduces the original reader's attributes crash.
      await expect(XlsxPopulate.fromDataAsync(buffer)).rejects.toThrow(/attributes/);
    }
    await mockApi(page, { initialRole: 'admin' });
    let submitted;
    await page.route('**/api/v1/students/import', async route => {
      submitted = route.request().postDataJSON();
      await route.fulfill({ json: { success: true, data: {
        imported: 1, failed: 0, results: [], createdTechnologies: [],
      } } });
    });
    await page.goto('/students?action=import');
    const dialog = page.getByRole('dialog');
    await dialog.locator('input[type=file]').setInputFiles({
      name: 'students.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer,
    });
    await expect(dialog.getByText('1 imported, 0 failed.')).toBeVisible();
    expect(submitted.rows).toEqual([expect.objectContaining({
      candidateName: 'Test Student', mobileNumber: '09876543210',
      personalEmail: 'student@example.com', technology: 'Java',
      naukriEmail: 'jobs@example.com', naukriPassword: ' secret ', sourceRow: 2,
    })]);
  });
}

test('unreadable Excel shows actionable guidance without submitting students', async ({ page }) => {
  await mockApi(page, { initialRole: 'admin' });
  let submitted = false;
  await page.route('**/api/v1/students/import', async route => {
    submitted = true;
    await route.abort();
  });
  await page.goto('/students?action=import');
  const dialog = page.getByRole('dialog');
  await dialog.locator('input[type=file]').setInputFiles({
    name: 'broken.xlsx', mimeType: 'application/octet-stream', buffer: Buffer.from('not a workbook'),
  });
  await expect(dialog.getByRole('alert')).toContainText('Could not read this Excel file');
  expect(submitted).toBe(false);
});
