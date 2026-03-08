import { test, expect } from '@playwright/test';

test('verify logs and versioning', async ({ page }) => {
  await page.goto('http://localhost:8788');

  // Login
  await page.fill('#cf-account-id', 'test-account-id');
  await page.fill('#cf-token', 'test-token');

  // Mock API responses
  await page.route('**/api/cloudflare/account', async route => {
    await route.fulfill({ json: { result: { id: 'test-account-id', name: 'Test Account' } } });
  });
  await page.route('**/api/cloudflare/workers', async route => {
    await route.fulfill({ json: { result: [{ id: 'test-worker', usage_model: 'standard' }] } });
  });
  await page.route('**/api/cloudflare/dns', async route => {
    await route.fulfill({ json: { result: [] } });
  });
  await page.route('**/api/cloudflare/workers/test-worker/content', async route => {
    await route.fulfill({ body: 'console.log("hello");', contentType: 'text/javascript' });
  });
  await page.route('**/api/cloudflare/workers/test-worker/logs', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: [{ timestamp: new Date().toISOString(), action: 'analyze', summary: 'Testing logs' }] });
    } else {
      await route.fulfill({ json: { success: true } });
    }
  });

  // Handle prompt for master key
  page.on('dialog', async dialog => {
    await dialog.dismiss();
  });

  await page.click('button:has-text("GET STARTED")');

  // Verify Dashboard
  await expect(page.locator('#cf-account-name')).toHaveText('Test Account');

  // Open Sidebar and select worker
  await page.click('button i.fa-bars');
  await page.click('text=test-worker');

  // Verify Editor is open
  await expect(page.locator('#editor-worker-name')).toHaveText('test-worker');

  // Verify Logs can be toggled and show content
  await page.click('button:has-text("LIHAT LOG AKTIVASI")');
  await expect(page.locator('#logs-list')).toContainText('ANALYZE');
  await expect(page.locator('#logs-list')).toContainText('Testing logs');

  // Verify Preview Versioning
  // Manually trigger preview with some code
  await page.evaluate(() => {
    (window as any).state.lastGeneratedCode = 'console.log("updated");';
    (window as any).togglePreview();
  });

  await expect(page.locator('#preview-code')).toContainText('console.log("updated");');
  await expect(page.locator('#preview-deploy-name')).toHaveValue('test-worker_v2');

  // Test with already versioned worker
  await page.evaluate(() => {
    (window as any).state.currentWorker = 'test-worker_v2';
    (window as any).togglePreview(); // Close
    (window as any).togglePreview(); // Open again to refresh name
  });
  await expect(page.locator('#preview-deploy-name')).toHaveValue('test-worker_v3');
});
