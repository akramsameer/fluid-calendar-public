import { expect, test } from "@playwright/test";

/**
 * Open-Source Build Tests
 *
 * These tests verify that SaaS-only features are NOT present in the open-source build.
 * To run these tests:
 * 1. Build the OS version: `npm run build:os`
 * 2. Start it on a different port: `PORT=3001 npm start`
 * 3. Run: `TEST_BASE_URL=http://localhost:3001 npx playwright test tests/open-source.spec.ts`
 *
 * By default, these tests run against the normal dev server (which has SaaS features),
 * so they are skipped unless TEST_OS_BUILD=true is set.
 */

const isOsBuild = process.env.TEST_OS_BUILD === "true";

test.describe("Open-Source Build - SaaS Routes Missing", () => {
  test.skip(!isOsBuild, "Skipped: set TEST_OS_BUILD=true to run OS tests");

  test("pricing page returns 404", async ({ page }) => {
    const response = await page.goto("/pricing");
    expect(response?.status()).toBe(404);
  });

  test("admin page returns 404", async ({ page }) => {
    const response = await page.goto("/admin");
    expect(response?.status()).toBe(404);
  });

  test("beta page returns 404", async ({ page }) => {
    const response = await page.goto("/beta");
    expect(response?.status()).toBe(404);
  });

  test("subscription API returns 404", async ({ request }) => {
    const response = await request.get("/api/subscription/status");
    expect(response.status()).toBe(404);
  });

  test("admin jobs API returns 404", async ({ request }) => {
    const response = await request.get("/api/admin/jobs/stats");
    expect(response.status()).toBe(404);
  });
});

test.describe("Open-Source Build - Core Routes Work", () => {
  test.skip(!isOsBuild, "Skipped: set TEST_OS_BUILD=true to run OS tests");

  test("landing page renders", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page.locator("body")).toBeVisible();
  });

  test("sign-in page works", async ({ page }) => {
    const response = await page.goto("/auth/signin");
    expect(response?.status()).toBe(200);
    await expect(page.locator("#email")).toBeVisible();
  });

  test("protected calendar route redirects to sign-in", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForURL(/\/auth\/signin/);
    expect(page.url()).toContain("/auth/signin");
  });

  test("protected tasks route redirects to sign-in", async ({ page }) => {
    await page.goto("/tasks");
    await page.waitForURL(/\/auth\/signin/);
    expect(page.url()).toContain("/auth/signin");
  });
});
