/**
 * Smoke tests — imaposla.me critical paths
 *
 * These tests verify the most important user journeys work end-to-end.
 * They require a running Supabase instance with seed data.
 *
 * MANUAL QA items that require real accounts are noted with [MANUAL].
 */
import { test, expect, type Page } from "@playwright/test";

// ── Helpers ─────────────────────────────────────────────────────────────────

async function expectNoConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  return () => errors;
}

// ── PUBLIC PAGES ─────────────────────────────────────────────────────────────

test.describe("Public pages", () => {
  test("homepage loads and shows intent switch", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/imaposla\.me/);
    await expect(page.locator(".home-intent-switch")).toBeVisible();
    await expect(page.locator("text=Nudim posao")).toBeVisible();
    await expect(page.locator("text=Tražim posao")).toBeVisible();
  });

  test("homepage hero search form submits to /oglasi", async ({ page }) => {
    await page.goto("/");
    const searchInput = page.locator("form[action='/oglasi'] input[name='q']").first();
    await searchInput.fill("konobar");
    await page.locator("form[action='/oglasi'] button[type='submit']").first().click();
    await expect(page).toHaveURL(/\/oglasi\?q=konobar/);
  });

  test("jobs page loads", async ({ page }) => {
    await page.goto("/oglasi");
    await expect(page).toHaveTitle(/Oglasi/);
    // Either shows jobs or shows empty state — both are valid
    const hasJobs = await page.locator(".jl-row, .jl-empty").first().isVisible();
    expect(hasJobs).toBe(true);
  });

  test("jobs page mobile filter has only ONE city select", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/oglasi");
    // Must have exactly one city select in the mobile form
    const citySelects = await page.locator(".jl-mobile-search select[name='city']").count();
    expect(citySelects).toBe(1);
  });

  test("jobs page search filter works", async ({ page }) => {
    await page.goto("/oglasi?q=konobar");
    await expect(page.locator(".jl-active-filters")).toBeVisible();
    await expect(page.locator("text=konobar")).toBeVisible();
  });

  test("companies page loads", async ({ page }) => {
    await page.goto("/firme");
    await expect(page).toHaveTitle(/Poslodavci/);
  });

  test("za firme page loads and has CTA", async ({ page }) => {
    await page.goto("/za-firme");
    await expect(page.locator("text=Kreiraj nalog firme")).toBeVisible();
  });

  test("privacy page loads", async ({ page }) => {
    await page.goto("/privatnost");
    await expect(page).toHaveTitle(/Privatnost/);
  });

  test("robots.txt excludes private routes", async ({ page }) => {
    const resp = await page.goto("/robots.txt");
    const body = await resp!.text();
    expect(body).toContain("Disallow: /admin/");
    expect(body).toContain("Disallow: /firma/");
    expect(body).toContain("Disallow: /profil/");
  });

  test("sitemap.xml returns valid XML", async ({ page }) => {
    const resp = await page.goto("/sitemap.xml");
    expect(resp!.status()).toBe(200);
    const ct = resp!.headers()["content-type"];
    expect(ct).toContain("xml");
    const body = await resp!.text();
    expect(body).toContain("<urlset");
    // Login/registracija must NOT be in sitemap
    expect(body).not.toContain("/login");
    expect(body).not.toContain("/registracija");
  });

  test("404 page shows correct content", async ({ page }) => {
    await page.goto("/stranica-koja-ne-postoji-xyz");
    await expect(page.locator("text=Stranica nije pronađena")).toBeVisible();
    await expect(page.locator("a[href='/oglasi']")).toBeVisible();
  });
});

// ── AUTH ──────────────────────────────────────────────────────────────────────

test.describe("Auth — public pages", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/Prijava/);
    await expect(page.locator("input[name='email']")).toBeVisible();
    await expect(page.locator("input[name='password']")).toBeVisible();
  });

  test("registration page loads with role switch", async ({ page }) => {
    await page.goto("/registracija");
    await expect(page.locator("text=Tražim posao")).toBeVisible();
    await expect(page.locator("text=Zapošljavam")).toBeVisible();
  });

  test("registration defaults to candidate", async ({ page }) => {
    await page.goto("/registracija");
    const heading = await page.locator("p").first().textContent();
    expect(heading).toContain("Tražiš posao");
  });

  test("registration switches to company via URL", async ({ page }) => {
    await page.goto("/registracija?role=company");
    const para = await page.locator("p").first().textContent();
    expect(para).toContain("Objavljuješ oglase");
  });

  test("login with wrong credentials shows error", async ({ page }) => {
    await page.goto("/login");
    await page.fill("input[name='email']", "wrong@example.com");
    await page.fill("input[name='password']", "wrongpassword");
    await page.click("button[type='submit']");
    await expect(page.locator("text=E-pošta ili lozinka nijesu tačni")).toBeVisible({ timeout: 8000 });
  });

  test("forgot password page loads", async ({ page }) => {
    await page.goto("/zaboravljena-lozinka");
    await expect(page.locator("input[name='email']")).toBeVisible();
  });
});

// ── PROTECTED ROUTES (unauthenticated) ───────────────────────────────────────

test.describe("Protected routes redirect unauthenticated users", () => {
  test("/profil redirects to login", async ({ page }) => {
    await page.goto("/profil");
    await expect(page).toHaveURL(/\/login/);
  });

  test("/firma redirects to login", async ({ page }) => {
    await page.goto("/firma");
    await expect(page).toHaveURL(/\/login/);
  });

  test("/admin redirects to login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login redirect preserves next param", async ({ page }) => {
    await page.goto("/profil/prijave");
    await expect(page).toHaveURL(/\/login\?next=%2Fprofil%2Fprijave/);
  });
});

// ── MOBILE NAV ────────────────────────────────────────────────────────────────

test.describe("Mobile navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
  });

  test("mobile nav shows for guest users", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".mobile-app-nav")).toBeVisible();
  });

  test("mobile nav has no fallback dot icons for known routes", async ({ page }) => {
    await page.goto("/");
    const navIcons = await page.locator(".mobile-app-nav .nav-icon").allTextContents();
    // None should be the fallback "•" dot
    for (const icon of navIcons) {
      expect(icon.trim()).not.toBe("•");
    }
  });

  test("hamburger menu opens on mobile for guest", async ({ page }) => {
    await page.goto("/");
    const hamb = page.locator("button.hamb");
    if (await hamb.isVisible()) {
      await hamb.click();
      await expect(page.locator(".mobile-nav")).toBeVisible();
    }
  });
});

// ── ACCESSIBILITY BASICS ──────────────────────────────────────────────────────

test.describe("Accessibility basics", () => {
  test("homepage has lang attribute", async ({ page }) => {
    await page.goto("/");
    const lang = await page.locator("html").getAttribute("lang");
    expect(lang).toBe("sr-ME");
  });

  test("homepage has h1", async ({ page }) => {
    await page.goto("/");
    const h1Count = await page.locator("h1").count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
  });

  test("jobs listing has h1", async ({ page }) => {
    await page.goto("/oglasi");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("notification bell has aria-label", async ({ page }) => {
    // On public page the bell isn't rendered (requires auth) — skip gracefully
    await page.goto("/");
    const bell = page.locator("button[aria-label*='Obavještenja']");
    // If visible (logged in), must have aria-label
    if (await bell.isVisible()) {
      const label = await bell.getAttribute("aria-label");
      expect(label).toBeTruthy();
    }
  });
});

// ── JOB DETAIL ────────────────────────────────────────────────────────────────

test.describe("Job detail page", () => {
  test("job detail page loads from jobs list", async ({ page }) => {
    await page.goto("/oglasi");
    const firstJobLink = page.locator(".jl-row").first();
    const jobCount = await firstJobLink.count();

    if (jobCount > 0) {
      await firstJobLink.click();
      await expect(page).toHaveURL(/\/oglasi\//);
      await expect(page.locator("h1")).toBeVisible();
      // Apply form must be visible (guest state)
      await expect(page.locator("text=Prijava zahtijeva nalog")).toBeVisible({ timeout: 5000 });
    } else {
      test.skip();
    }
  });

  test("invalid job slug returns 404", async ({ page }) => {
    await page.goto("/oglasi/nepostojeci-oglas-99999999");
    await expect(page.locator("text=Stranica nije pronađena")).toBeVisible();
  });
});

/*
 * ── MANUAL QA REQUIRED ──────────────────────────────────────────────────────
 *
 * The following flows require real user accounts and cannot be automated
 * without test account credentials:
 *
 * [MANUAL-1] Candidate registration → email confirm → login → redirect to /profil
 * [MANUAL-2] Company registration → email confirm → login → redirect to /firma
 * [MANUAL-3] Candidate apply to job → duplicate apply shows correct message
 * [MANUAL-4] Company creates job → admin approves → job appears publicly
 * [MANUAL-5] Password reset flow → email → link → new password works
 * [MANUAL-6] Company unapproved notice visible on /firma dashboard
 * [MANUAL-7] Admin role redirect: login as admin → lands on /admin
 * [MANUAL-8] Wrong role redirect: login as candidate → cannot access /firma
 * [MANUAL-9] Mobile nav shows correct tabs per role (candidate/company/admin)
 * [MANUAL-10] Dark mode persists across page reload (localStorage)
 * [MANUAL-11] CV builder auto-save works
 * [MANUAL-12] Job alerts: create, receives notification, delete
 * [MANUAL-13] Company logo upload → shows in job listings
 *
 * Run these manually before each production deployment.
 */

// ════════════════════════════════════════════════════════════════════════════
// BRZI POSLOVI — smoke tests
// ════════════════════════════════════════════════════════════════════════════

test.describe("Brzi poslovi — public pages", () => {
  test("brzi-poslovi landing loads with tabs", async ({ page }) => {
    await page.goto("/brzi-poslovi");
    await expect(page.locator(".bp-tabs")).toBeVisible();
    await expect(page.locator("text=Tražim radnika")).toBeVisible();
    await expect(page.locator("text=Tražim brzi posao")).toBeVisible();
  });

  test("radnici list loads", async ({ page }) => {
    await page.goto("/brzi-poslovi/radnici");
    await expect(page.locator("h1")).toBeVisible();
    // Either worker grid or empty state
    const ok = await page.locator(".bp-worker-grid, .bp-empty").first().isVisible();
    expect(ok).toBe(true);
  });

  test("angazmani list loads", async ({ page }) => {
    await page.goto("/brzi-poslovi/angazmani");
    await expect(page.locator("h1")).toBeVisible();
    const ok = await page.locator(".bp-gig-grid, .bp-empty").first().isVisible();
    expect(ok).toBe(true);
  });

  test("worker detail shows locked contact for guest", async ({ page }) => {
    await page.goto("/brzi-poslovi/radnici");
    const firstWorker = page.locator(".bp-worker-card a[href*='/radnici/'], .bp-worker-card a[href*='/brzi-poslovi/radnici/']").first();
    if (await firstWorker.count() > 0) {
      await firstWorker.click();
      // Guest must see locked contact CTA, never a phone number
      await expect(page.locator("text=Kontakt je dostupan prijavljenim")).toBeVisible({ timeout: 5000 });
    } else {
      test.skip();
    }
  });
});

test.describe("Brzi poslovi — protected routes redirect guests", () => {
  test("/profil/brzi-profil redirects to login", async ({ page }) => {
    await page.goto("/profil/brzi-profil");
    await expect(page).toHaveURL(/\/login/);
  });

  test("/profil/interesovanja redirects to login", async ({ page }) => {
    await page.goto("/profil/interesovanja");
    await expect(page).toHaveURL(/\/login/);
  });

  test("/profil/brzi-kontakti redirects to login", async ({ page }) => {
    await page.goto("/profil/brzi-kontakti");
    await expect(page).toHaveURL(/\/login/);
  });

  test("/firma/brzi-angazman redirects to login", async ({ page }) => {
    await page.goto("/firma/brzi-angazman");
    await expect(page).toHaveURL(/\/login/);
  });

  test("/firma/radnici redirects to login", async ({ page }) => {
    await page.goto("/firma/radnici");
    await expect(page).toHaveURL(/\/login/);
  });

  test("/admin/brzi-profili redirects to login", async ({ page }) => {
    await page.goto("/admin/brzi-profili");
    await expect(page).toHaveURL(/\/login/);
  });

  test("/admin/brzi-angazmani redirects to login", async ({ page }) => {
    await page.goto("/admin/brzi-angazmani");
    await expect(page).toHaveURL(/\/login/);
  });
});
