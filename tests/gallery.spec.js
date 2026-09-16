import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("collection loads all eight original works with no broken images or horizontal overflow", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".artwork-card")).toHaveCount(8);
  await page.locator("#about").scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page
        .locator("main img")
        .evaluateAll((images) =>
          images.every((img) => img.complete && img.naturalWidth > 0),
        ),
    )
    .toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .some((r) => /aframe/.test(r.name)),
    ),
  ).toBe(false);
});

test("artist filters and saved empty state are usable", async ({ page }) => {
  await page.goto("/#collection");
  await page.getByLabel("Filter by artist").selectOption("Owen Zanzal");
  await expect(page.locator(".artwork-card")).toHaveCount(4);
  await page.getByLabel("Filter by artist").selectOption("Seth Atwood");
  await expect(page.locator(".artwork-card")).toHaveCount(1);
  await expect(page.locator(".artwork-card h3")).toHaveText("Bug");
  await page.locator('[data-filter="saved"]').click();
  await expect(page.getByText("Keep what catches your eye.")).toBeVisible();
  await page.getByRole("button", { name: "Explore all works" }).click();
  await expect(page.locator(".artwork-card")).toHaveCount(8);
});

test("saving persists across reloads and removing the last saved work shows an empty state", async ({
  page,
}) => {
  await page.goto("/#collection");
  const card = page.locator(".artwork-card").first();
  await card.hover();
  await page
    .getByRole("button", { name: "Save Crystal City", exact: true })
    .click();
  await expect(page.locator("#saved-count")).toHaveText("1");
  await page.reload();
  await expect(page.locator("#saved-count")).toHaveText("1");
  await page.locator('[data-filter="saved"]').click();
  await expect(page.locator(".artwork-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Save Crystal City", exact: true })
    .click();
  await expect(page.locator(".empty-state")).toBeVisible();
  await expect(page.locator("#saved-count")).toHaveText("0");
});

test("artwork viewer supports deep links, navigation, saving and Escape", async ({
  page,
}) => {
  await page.goto("/#work/crystal-city");
  const dialog = page.getByRole("dialog", {
    name: "Crystal City",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(page.locator("#detail-image")).toHaveJSProperty(
    "complete",
    true,
  );
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#detail-title")).toHaveText("Burger N' Shake");
  await page.getByRole("button", { name: "Next work" }).click();
  await expect(page.locator("#detail-title")).toHaveText("Crystal City");
  await page.getByRole("button", { name: "Save to your collection" }).click();
  await expect(
    page.getByRole("button", { name: "Saved to your collection" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(page.locator("#art-dialog")).not.toBeVisible();
  await expect(page.locator("body")).not.toHaveClass(/dialog-open/);
});

test("keyboard focus remains in the artwork dialog and returns to its opener", async ({
  page,
}) => {
  await page.goto("/");
  const opener = page.locator(".frame-main");
  await opener.click();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() =>
        document.querySelector("#art-dialog").contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
});

test("page and artwork dialog pass WCAG AA automated checks", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
  expect(
    (await new AxeBuilder({ page }).withTags(tags).analyze()).violations,
  ).toEqual([]);
  await page.locator(".frame-main").click();
  expect(
    (await new AxeBuilder({ page }).withTags(tags).analyze()).violations,
  ).toEqual([]);
});

test("gallery renders, navigates through all works, inspects art, and pauses when closed", async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Step inside the gallery" }).click();
  await expect(page.locator("#gallery-loading")).toBeHidden({ timeout: 30000 });
  await expect(page.locator("a-scene canvas")).toBeVisible();
  expect(await page.locator("a-image.inspectable").count()).toBe(8);
  if (testInfo.project.name === "desktop") {
    const beforeWalk = await page.locator("#gallery-camera").evaluate((camera) => camera.object3D.position.z);
    await page.keyboard.down("KeyW");
    await page.waitForTimeout(500);
    await page.keyboard.up("KeyW");
    const afterWalk = await page.locator("#gallery-camera").evaluate((camera) => camera.object3D.position.z);
    expect(afterWalk).toBeLessThan(beforeWalk);
  }
  for (let i = 0; i < 8; i++) {
    await page.getByRole("button", { name: "Visit next artwork" }).click();
    await expect(page.locator("#gallery-position")).toHaveText(
      `${((i + 1) % 8) + 1} / 8`,
    );
    const selectedIndex = (i + 1) % 8;
    await expect
      .poll(() =>
        page
          .locator("#gallery-camera")
          .evaluate((camera) => camera.object3D.position.z),
      )
      .toBe(1 - (selectedIndex % 4) * 7);
    // Let the boundary component tick; it must not undo a guided camera placement.
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    expect(
      await page
        .locator("#gallery-camera")
        .evaluate((camera) => camera.object3D.position.z),
    ).toBe(1 - (selectedIndex % 4) * 7);
  }
  const viewport = page.viewportSize();
  await page
    .locator("a-scene canvas")
    .click({ position: { x: viewport.width / 2, y: viewport.height * 0.45 } });
  await expect(page.locator("#detail-title")).toHaveText("Crystal City");
  await expect(page.locator("#art-dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "View artwork", exact: true }).click();
  await expect(page.locator("#detail-title")).toHaveText("Crystal City");
  expect(
    await page.locator("a-scene").evaluate((scene) => scene.isPlaying),
  ).toBe(false);
  await page.keyboard.press("Escape");
  await expect(page.locator("#gallery-dialog")).toBeVisible();
  await page.getByRole("button", { name: "Leave virtual gallery" }).click();
  await expect(page.locator("#gallery-dialog")).not.toBeVisible();
  expect(
    await page.locator("a-scene").evaluate((scene) => scene.isPlaying),
  ).toBe(false);
  await page.getByRole("button", { name: "Step inside the gallery" }).click();
  expect(
    await page.locator("a-scene").evaluate((scene) => scene.isPlaying),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("legacy room links open the upgraded gallery", async ({ page }) => {
  for (const path of ["/rooms/roomkey.html", "/rooms/roomkey/"]) {
    await page.goto(path);
    await expect(page.locator("#gallery-dialog")).toBeVisible();
    await expect(page.locator("#gallery-loading")).toBeHidden({
      timeout: 30000,
    });
  }
});

test("an interrupted 3D context can be reopened", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Step inside the gallery" }).click();
  await expect(page.locator("#gallery-loading")).toBeHidden({ timeout: 30000 });
  await page
    .locator("a-scene canvas")
    .evaluate((canvas) => canvas.dispatchEvent(new Event("webglcontextlost")));
  await expect(page.locator("#gallery-dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Step inside the gallery" }).click();
  await expect(page.locator("#gallery-loading")).toBeHidden({ timeout: 30000 });
  await expect(page.locator("a-scene canvas")).toBeVisible();
});

test("the gallery can be closed and reopened while its engine is loading", async ({
  page,
}) => {
  let release;
  await page.route("**/aframe-*.js", async (route) => {
    await new Promise((resolve) => {
      release = resolve;
    });
    await route.continue();
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Step inside the gallery" }).click();
  await expect.poll(() => typeof release).toBe("function");
  await page.getByRole("button", { name: "Leave virtual gallery" }).click();
  await page.getByRole("button", { name: "Step inside the gallery" }).click();
  await expect(page.locator("#gallery-dialog")).toBeVisible();
  release();
  await expect(page.locator("#gallery-loading")).toBeHidden({ timeout: 30000 });
  await expect(page.locator("a-scene")).toHaveCount(1);
});

test("malformed artwork links leave the collection usable", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/#work/%broken");
  await expect(page.locator(".artwork-card")).toHaveCount(8);
  expect(errors).toEqual([]);
});

test("failed WebGL startup offers a working collection fallback", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type === "webgl2" ? null : original.call(this, type, ...args);
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Step inside the gallery" }).click();
  await expect(page.getByText("A different way to explore.")).toBeVisible();
  await page.locator("#fallback-collection").click();
  await expect(page.locator("#gallery-dialog")).not.toBeVisible();
  await expect(page.locator(".artwork-card")).toHaveCount(8);
});

test("reduced motion preference is respected and malformed storage does not break the collection", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() =>
    localStorage.setItem("roomkey:saved", "{invalid"),
  );
  await page.goto("/");
  await expect(page.locator(".artwork-card")).toHaveCount(8);
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
  ).toBe("auto");
});
