import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.goto("/?gallery=roomkey");
  await expect(page.locator("#gallery-loading")).toBeHidden({ timeout: 30000 });
});

test("guide and inspect shortcuts work, retain focus, and stop rendering while paused", async ({
  page,
}) => {
  await expect(page.locator("a-scene canvas")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("#gallery-guide")).toBeVisible();
  const frame = await page
    .locator("a-scene")
    .evaluate((scene) => scene.renderer.info.render.frame);
  await page.waitForTimeout(200);
  expect(
    await page
      .locator("a-scene")
      .evaluate((scene) => scene.renderer.info.render.frame),
  ).toBe(frame);
  expect(
    (
      await new AxeBuilder({ page })
        .include("#gallery-guide")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() =>
        document
          .querySelector("#gallery-guide")
          .contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(page.locator("#gallery-guide")).toBeHidden();
  await expect(page.locator("a-scene canvas")).toBeFocused();
  await expect
    .poll(() =>
      page
        .locator("a-scene")
        .evaluate((scene) => scene.renderer.info.render.frame),
    )
    .toBeGreaterThan(frame);
  await page.keyboard.press("KeyE");
  await expect(page.locator("#art-dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(page.locator("#gallery-guide")).toBeVisible();
  await page.getByRole("button", { name: "Return to the collection" }).click();
  await expect(page.locator("#gallery-dialog")).toBeHidden();
});

test("floor reflections cache while stationary, update while walking, and surfaces compile cleanly", async ({
  page,
}) => {
  const scene = page.locator("a-scene");
  const before = await scene.evaluate((s) => s.galleryWorld.reflectionFrames);
  await page.waitForTimeout(250);
  expect(await scene.evaluate((s) => s.galleryWorld.reflectionFrames)).toBe(
    before,
  );
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(300);
  await page.keyboard.up("KeyW");
  expect(
    await scene.evaluate((s) => s.galleryWorld.reflectionFrames),
  ).toBeGreaterThan(before);
  expect(
    await scene.evaluate((s) =>
      s.renderer.info.programs.every(
        (program) => !program.diagnostics || program.diagnostics.runnable,
      ),
    ),
  ).toBe(true);
  expect(
    await scene.evaluate((s) => s.renderer.info.render.calls),
  ).toBeLessThan(104);
  expect(await scene.evaluate((s) => s.object3D.environment?.isTexture)).toBe(
    true,
  );
  await page.getByRole("button", { name: "Leave virtual gallery" }).click();
  const stopped = await scene.evaluate((s) => s.renderer.info.render.frame);
  await page.waitForTimeout(200);
  expect(await scene.evaluate((s) => s.renderer.info.render.frame)).toBe(
    stopped,
  );
});

test("touch walking pad moves and stops without blocking guided navigation", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "mobile",
    "Touch control is only shown on coarse pointers",
  );
  const pad = page.getByRole("button", { name: "Hold and drag to walk" });
  await expect(pad).toBeVisible();
  const bounds = await pad.boundingBox();
  const camera = page.locator("#gallery-camera");
  const before = await camera.evaluate((c) => ({
    x: c.object3D.position.x,
    z: c.object3D.position.z,
  }));
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + 8);
  await page.mouse.down();
  await page.waitForTimeout(300);
  await page.mouse.up();
  const after = await camera.evaluate((c) => ({
    x: c.object3D.position.x,
    z: c.object3D.position.z,
  }));
  expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(
    0.2,
  );
  await page.waitForTimeout(200);
  expect(
    await camera.evaluate((c) => ({
      x: c.object3D.position.x,
      z: c.object3D.position.z,
    })),
  ).toEqual(after);
  await page.getByRole("button", { name: "Visit next artwork" }).click();
  await expect(page.locator("#gallery-position")).toHaveText("2 / 8");
});
