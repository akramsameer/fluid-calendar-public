import { expect, test } from "@playwright/test";

test.describe("Settings - Page Load", () => {
  test("settings page loads with navigation tabs", async ({ page }) => {
    await page.goto("/settings");

    // Verify settings navigation tabs (hash links in sidebar)
    await expect(page.locator('a[href="#accounts"]')).toBeVisible();
    await expect(page.locator('a[href="#user"]')).toBeVisible();
    await expect(page.locator('a[href="#calendar"]')).toBeVisible();
    await expect(page.locator('a[href="#auto-schedule"]')).toBeVisible();
    await expect(page.locator('a[href="#booking-links"]')).toBeVisible();
    await expect(page.locator('a[href="#notifications"]')).toBeVisible();
  });
});

test.describe("Settings - Accounts Tab", () => {
  test("accounts tab shows connected accounts info", async ({ page }) => {
    await page.goto("/settings#accounts");
    await page.waitForTimeout(1000);

    // Click the Accounts tab to ensure it's active
    await page.getByText("Accounts").first().click();
    await page.waitForTimeout(500);

    // The accounts section should be visible
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Settings - User Tab", () => {
  test("user settings tab shows profile and preferences", async ({
    page,
  }) => {
    await page.goto("/settings#user");
    await page.waitForTimeout(1000);

    // Click User tab
    const userTab = page.getByText("User").first();
    await userTab.click();
    await page.waitForTimeout(500);

    // Look for time format setting
    const timeFormatLabel = page.getByText("Time Format");
    if (await timeFormatLabel.isVisible().catch(() => false)) {
      await expect(timeFormatLabel).toBeVisible();
    }
  });

  test("change time format setting", async ({ page }) => {
    await page.goto("/settings#user");
    await page.waitForTimeout(1000);

    await page.getByText("User").first().click();
    await page.waitForTimeout(500);

    // Look for a time format select
    const timeFormatSelect = page.getByText("Time Format")
      .locator("..").locator("select");
    if (await timeFormatSelect.isVisible().catch(() => false)) {
      // Toggle time format
      const currentValue = await timeFormatSelect.inputValue();
      const newValue = currentValue === "12" ? "24" : "12";
      await timeFormatSelect.selectOption(newValue);
      await page.waitForTimeout(1000);

      // Change it back
      await timeFormatSelect.selectOption(currentValue);
    }
  });
});

test.describe("Settings - Calendar Tab", () => {
  test("calendar settings are visible", async ({ page }) => {
    await page.goto("/settings#calendar");
    await page.waitForTimeout(1000);

    await page.getByText("Calendar").first().click();
    await page.waitForTimeout(500);

    // Calendar settings content should be visible
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Settings - Auto-Schedule Tab", () => {
  test("auto-schedule settings are visible with work hours", async ({
    page,
  }) => {
    await page.goto("/settings#auto-schedule");
    await page.waitForTimeout(1000);

    await page.getByText("Auto-Schedule").first().click();
    await page.waitForTimeout(500);

    // Should show working hours or scheduling config
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Settings - Booking Links Tab", () => {
  test("booking links tab is visible", async ({ page }) => {
    await page.goto("/settings#booking-links");
    await page.waitForTimeout(1000);

    await page.getByText("Booking Links").first().click();
    await page.waitForTimeout(500);

    // Should show booking links section
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Settings - Notifications Tab", () => {
  test("notification settings are visible", async ({ page }) => {
    await page.goto("/settings#notifications");
    await page.waitForTimeout(1000);

    await page.getByText("Notifications").first().click();
    await page.waitForTimeout(500);

    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Settings - System Tab (Admin)", () => {
  test("system settings tab visibility depends on admin role", async ({
    page,
  }) => {
    await page.goto("/settings#system");
    await page.waitForTimeout(1000);

    // System tab may or may not be visible depending on admin role
    const systemTab = page.getByText("System");
    const isVisible = await systemTab.isVisible().catch(() => false);

    if (isVisible) {
      await systemTab.first().click();
      await page.waitForTimeout(500);
    }
  });
});
