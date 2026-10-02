import { test, expect } from "@playwright/test";

test.describe("JIMMO App Navigation & Auth Guards", () => {
  test("redirects unauthenticated user from /dashboard to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator("h2")).toContainText("Iniciar sesión");
  });

  test("renders login form correctly with submit button", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("input[name='email']")).toBeVisible();
    await expect(page.locator("input[name='password']")).toBeVisible();
    await expect(page.locator("button[type='submit']")).toBeVisible();
  });
});
