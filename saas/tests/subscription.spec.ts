import { expect, test } from "@playwright/test";

test.describe("Subscription Success Pages", () => {
  test("subscription success page loads without 500", async ({ page }) => {
    const response = await page.goto("/subscription/success");

    // Without a valid session_id, the page may redirect to home
    // but should NOT return a 500 server error
    expect(response?.status()).toBeLessThan(500);
  });

  test("lifetime success page loads without 500", async ({ page }) => {
    const response = await page.goto("/subscription/lifetime/success");

    // Without a valid session_id, the page may redirect to home
    // but should NOT return a 500 server error
    expect(response?.status()).toBeLessThan(500);
  });
});
