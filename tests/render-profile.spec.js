import { test, expect } from "@playwright/test";

// The gallery lowers its resolution when the browser has no GPU. Without that
// step, a software driver makes the whole suite time out. See the SDLC run
// ci-software-webgl-timeouts.
test("the gallery matches its resolution to the driver it runs on", async ({
  page,
}) => {
  await page.goto("/?gallery=roomkey");
  await expect(page.locator("#gallery-loading")).toBeHidden({ timeout: 30000 });
  await expect(page.locator("a-scene canvas")).toBeVisible();

  const scene = page.locator("a-scene");
  const profile = await scene.getAttribute("data-render-profile");
  expect(["software", "hardware"]).toContain(profile);

  const report = await scene.evaluate((element) => ({
    pixels:
      element.renderer.domElement.width * element.renderer.domElement.height,
    pixelRatio: element.renderer.getPixelRatio(),
    devicePixelRatio: window.devicePixelRatio,
    antialias: element.renderer.getContextAttributes().antialias,
  }));

  if (profile === "software") {
    // The budget is 600000 device pixels. Rounding makes an exact match unsafe.
    expect(report.pixels).toBeLessThanOrEqual(630000);
    expect(report.antialias).toBe(false);
  } else {
    expect(report.pixelRatio).toBe(report.devicePixelRatio);
  }
});
