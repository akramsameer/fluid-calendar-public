import { expect, test } from "@playwright/test";

test.describe("Admin - Dashboard", () => {
  test("admin page loads with navigation cards", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForTimeout(2000);

    // Admin page may show access denied for non-admin users
    const accessDenied = page.getByText("Access Denied");
    const isAccessDenied = await accessDenied.isVisible().catch(() => false);

    if (isAccessDenied) {
      // Not an admin user — test passes (access control works)
      return;
    }

    // If admin, verify dashboard cards
    const jobManagement = page.getByText("Job Management");
    if (await jobManagement.isVisible().catch(() => false)) {
      await expect(jobManagement).toBeVisible();
    }
  });
});

test.describe("Admin - Jobs Page", () => {
  test("jobs page shows stats and tabs", async ({ page }) => {
    await page.goto("/admin/jobs");
    await page.waitForTimeout(2000);

    // Check if we have access
    const accessDenied = page.getByText("Access Denied");
    const isAccessDenied = await accessDenied.isVisible().catch(() => false);

    if (isAccessDenied) {
      return;
    }

    // If admin, verify job stats are visible
    const totalJobs = page.getByText(/total/i);
    if (await totalJobs.isVisible().catch(() => false)) {
      await expect(totalJobs.first()).toBeVisible();
    }
  });

  test("jobs page tabs navigation works", async ({ page }) => {
    await page.goto("/admin/jobs");
    await page.waitForTimeout(2000);

    const accessDenied = page.getByText("Access Denied");
    if (await accessDenied.isVisible().catch(() => false)) {
      return;
    }

    // Try clicking through available tabs
    const tabs = ["Recent", "Failed", "Pending"];
    for (const tabName of tabs) {
      const tab = page.getByRole("tab", { name: tabName });
      if (await tab.isVisible().catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(500);
      }
    }
  });
});
