import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/?gallery=roomkey");
  await expect(page.locator("#gallery-loading")).toBeHidden({ timeout: 30000 });
  await expect(page.locator("a-scene canvas")).toBeVisible();
});

async function position(page) {
  return page.locator("#gallery-camera").evaluate((camera) => ({
    x: camera.object3D.position.x,
    z: camera.object3D.position.z,
  }));
}

test("WASD and arrow keys follow the view in every direction without canvas focus", async ({
  page,
}) => {
  for (const yaw of [0, Math.PI / 2, -Math.PI / 2, Math.PI]) {
    for (const [key, forward, strafe] of [
      ["KeyW", 1, 0],
      ["KeyS", -1, 0],
      ["KeyA", 0, -1],
      ["KeyD", 0, 1],
      ["ArrowUp", 1, 0],
      ["ArrowDown", -1, 0],
      ["ArrowLeft", 0, -1],
      ["ArrowRight", 0, 1],
    ]) {
      await page.locator("#gallery-camera").evaluate((camera, angle) => {
        camera.object3D.position.set(0, 1.65, 1);
        camera.components["look-controls"].yawObject.rotation.y = angle;
      }, yaw);
      await page.getByRole("button", { name: "Visit next artwork" }).focus();
      const before = await position(page);
      await page.keyboard.down(key);
      await page.waitForTimeout(200);
      await page.keyboard.up(key);
      const after = await position(page);
      const dx = after.x - before.x;
      const dz = after.z - before.z;
      const expectedX = -Math.sin(yaw) * forward + Math.cos(yaw) * strafe;
      const expectedZ = -Math.cos(yaw) * forward - Math.sin(yaw) * strafe;
      expect(
        dx * expectedX + dz * expectedZ,
        `${key} at yaw ${yaw}`,
      ).toBeGreaterThan(0.1);
      expect(Math.abs(dx * expectedZ - dz * expectedX)).toBeLessThan(0.05);
    }
  }
});

test("walking stops on blur and modal pause, and does not stick after reopening", async ({
  page,
}) => {
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(200);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  const blurred = await position(page);
  await page.waitForTimeout(200);
  expect(await position(page)).toEqual(blurred);
  await page.keyboard.up("KeyW");

  await page.keyboard.down("KeyS");
  await page.getByRole("button", { name: "View artwork", exact: true }).click();
  const paused = await position(page);
  await page.waitForTimeout(200);
  expect(await position(page)).toEqual(paused);
  await page.keyboard.press("Escape");
  // Key was held when the dialog opened; resuming must require a fresh press.
  await page.waitForTimeout(200);
  expect(await position(page)).toEqual(paused);
  await page.keyboard.up("KeyS");
});
