import { expect, test } from "@playwright/test";

test.describe("Learn Page", () => {
  test("learn page loads without server error", async ({ page }) => {
    const response = await page.goto("/learn/learn");

    // Should return 200, not a 500 server error
    expect(response?.status()).toBe(200);
  });

  test("learn root returns 404 (content is at /learn/learn)", async ({
    page,
  }) => {
    const response = await page.goto("/learn");

    // /learn is a layout route; actual page is at /learn/learn
    expect(response?.status()).toBe(404);
  });
});
