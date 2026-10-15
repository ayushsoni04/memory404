import { expect, test } from "@playwright/test";

test("signed-out visitors land on the login page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("login form is keyboard reachable and links to signup and reset", async ({ page }) => {
  await page.goto("/login");
  await page.keyboard.press("Tab");
  const email = page.getByLabel("Email address");
  await email.focus();
  await expect(email).toBeFocused();
  await page.keyboard.press("Tab");
  const password = page.getByRole("textbox", { name: "Password", exact: true });
  await expect(password).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Show password" })).toBeFocused();
  await expect(page.getByRole("link", { name: "Forgot password?" })).toHaveAttribute(
    "href",
    "/forgot-password",
  );
  await expect(page.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/signup");
});

test("signup explains the password rules", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await expect(page.getByText(/uppercase letter/i)).toBeVisible();
});

test("forgot password stays on a generic confirmation", async ({ page }) => {
  await page.route("**/api/auth/forgot-password", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
  await page.goto("/forgot-password");
  await page.getByLabel("Email address").fill("person@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText(/If an account exists/)).toBeVisible();
});

test("reset password rejects a missing token before calling the network", async ({ page }) => {
  await page.goto("/reset-password");
  await page.getByLabel("New password", { exact: true }).fill("Memory404");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByText("This reset link is invalid or expired.")).toBeVisible();
});

test("login layout holds together on a phone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  const heading = page.getByRole("heading", { name: "Sign in" });
  await expect(heading).toBeVisible();
  const box = await heading.boundingBox();
  expect(box?.x ?? 0).toBeGreaterThanOrEqual(0);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);
});

test("protected pages send signed-out visitors to login", async ({ page }) => {
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login\?redirect=/);
  await page.goto("/trash");
  await expect(page).toHaveURL(/\/login\?redirect=/);
  await page.goto("/workspace");
  await expect(page).toHaveURL(/\/login\?redirect=/);
});

test("unknown private routes send signed-out visitors to login", async ({ page }) => {
  await page.goto("/this-page-does-not-exist");
  await expect(page).toHaveURL(/\/login\?redirect=/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("unknown public routes show the not-found state", async ({ page }) => {
  const response = await page.goto("/brand/this-page-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});
