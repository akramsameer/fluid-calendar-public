import { expect, test } from "@playwright/test";

test.describe("Pricing Page", () => {
  test("pricing page loads without server error", async ({ page }) => {
    const response = await page.goto("/pricing");

    // Should return 200, not a 500 server error
    expect(response?.status()).toBe(200);
  });

  test("pricing page with upgrade_required param loads without error", async ({
    page,
  }) => {
    const response = await page.goto("/pricing?error=upgrade_required");

    // Should still load without server error
    expect(response?.status()).toBe(200);
  });
});
